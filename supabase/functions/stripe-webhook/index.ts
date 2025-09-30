
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'stripe';
import { createClient, User } from 'supabase-js';

// Map Stripe Price IDs to your internal plan names
const priceIdToPlan = {
  'price_1S3PvoDssGMGr4ApVHjLcKBy': 'starter',
  'price_1S3PwCDssGMGr4ApXhYzENaK': 'pro',
  'price_1S3PwdDssGMGr4ApVu7rU8kB': 'agency',
  'price_1S3fgvDssGMGr4Ap2KNREK4i': 'legacy',
  'price_1S3finDssGMGr4ApW7wWdEOK': 'legacy-club',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')!);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(err.message, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === 'setup') {
          // O usuário adicionou um método de pagamento com sucesso
          const customerId = session.customer as string;
          const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent as string);
          
          // Define o novo método de pagamento como padrão para futuras faturas
          await stripe.customers.update(customerId, {
            invoice_settings: {
              default_payment_method: setupIntent.payment_method as string,
            },
          });

          // Atualiza o status do usuário no banco de dados para 'ativo'
          await supabaseAdmin
            .from('profiles')
            .update({ subscription_status: 'active' })
            .eq('stripe_customer_id', customerId);

          console.log(`Cartão adicionado e usuário ativado para o cliente Stripe: ${customerId}`);

        } else if (session.mode === 'subscription') {
          // Lógica existente para criação de assinatura
          const userId = session.client_reference_id;
          let user: User;

          if (userId) {
            const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
            if (error) throw new Error(`Could not find user ${userId}: ${error.message}`);
            user = data.user;
          } else {
            const customerEmail = session.customer_details?.email;
            if (!customerEmail) throw new Error('Customer email not found in session');
            
            // Busca o usuário pelo email usando a função RPC segura
            const { data: existingUsers, error: findError } = await supabaseAdmin.rpc('get_user_by_email', { p_email: customerEmail });
            if (findError) throw findError;
            const existingUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

            if (existingUser) {
              const { data, error } = await supabaseAdmin.auth.admin.getUserById(existingUser.id);
              if(error) throw error;
              user = data.user;
            } else {
              const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(customerEmail);
              if (createError) throw new Error(`Could not create user ${customerEmail}: ${createError.message}`);
              user = newUser.user;
            }
          }

          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const planId = priceIdToPlan[subscription.items.data[0].price.id];

          await supabaseAdmin.from('profiles').update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            plan_id: planId,
            subscription_status: subscription.status,
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          }).eq('id', user.id);

          // --- Início da Lógica de Comissão de Afiliado ---
          try {
            const { data: profile } = await supabaseAdmin.from('profiles').select('referred_by_affiliate_id').eq('id', user.id).single();
            if (profile && profile.referred_by_affiliate_id) {
              const { data: affiliate, error: affiliateError } = await supabaseAdmin.from('affiliates').select('id, user_id, commission_rate').eq('id', profile.referred_by_affiliate_id).single();
              if (affiliateError || !affiliate) {
                console.error(`Não foi possível buscar os detalhes do afiliado com ID ${profile.referred_by_affiliate_id}.`);
              } else {
                console.log(`Usuário ${user.id} foi indicado pelo afiliado ${affiliate.id}. Calculando comissão com taxa de ${affiliate.commission_rate}.`);
                const totalAmount = session.amount_total;
                if (totalAmount) {
                  const commissionAmount = totalAmount * affiliate.commission_rate;
                  const { error: referralUpdateError } = await supabaseAdmin.from('referrals').update({ status: 'converted', commission_amount: commissionAmount / 100 }).eq('referred_user_id', user.id).eq('status', 'pending');
                  if (referralUpdateError) {
                    console.error(`Falha ao atualizar indicação para o usuário ${user.id}: ${referralUpdateError.message}`);
                  } else {
                    console.log(`Comissão de ${commissionAmount / 100} registrada para o afiliado ${affiliate.id}.`);
                    await supabaseAdmin.from('notifications').insert({ user_id: affiliate.user_id, message: `Parabéns! Você ganhou uma comissão de R$${(commissionAmount / 100).toFixed(2)} por uma nova indicação.`, type: 'success' });
                  }
                }
              }
            }
          } catch (affiliateError) {
            console.error('Erro ao processar comissão de afiliado:', affiliateError.message);
          }
          // --- Fim da Lógica de Comissão de Afiliado ---
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        // Verifica se a fatura está associada a uma assinatura
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await supabaseAdmin.from('profiles').update({
            subscription_status: subscription.status,
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          }).eq('stripe_subscription_id', subscription.id);
        } else {
          console.log(`Evento 'invoice.payment_succeeded' recebido sem ID de assinatura. Ignorando.`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabaseAdmin.from('profiles').update({
          subscription_status: subscription.status,
        }).eq('stripe_subscription_id', subscription.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(`Webhook Error: ${err.message}`, { status: 500 });
  }
});

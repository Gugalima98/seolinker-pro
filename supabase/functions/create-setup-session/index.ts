import { createClient } from 'supabase-js';
import { corsHeaders } from 'common/cors.ts';
import Stripe from 'stripe';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validação de variáveis de ambiente
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const siteUrl = Deno.env.get('SITE_URL');
    if (!stripeKey || !siteUrl) {
      throw new Error("STRIPE_SECRET_KEY e SITE_URL devem ser definidos.");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SERVICE_ROLE_KEY') ?? '');

    // Pega o usuário autenticado
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: req.headers.get('Authorization')! } } });
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Usuário não encontrado.");

    // Busca o perfil do usuário para obter o stripe_customer_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    let customerId = profile.stripe_customer_id;

    // Se o usuário não for um cliente Stripe, cria um novo
    if (!customerId) {
      const customer = await stripe.customers.create({ 
        email: user.email,
        metadata: { supabase_id: user.id }
      });
      customerId = customer.id;

      // Salva o novo ID do cliente no perfil do usuário
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
      if (updateError) throw updateError;
    }

    // Cria uma sessão de Checkout no modo 'setup' para coletar dados de pagamento
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: customerId,
      success_url: `${siteUrl}/dashboard?setup_success=true`,
      cancel_url: `${siteUrl}/dashboard`,
    });

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

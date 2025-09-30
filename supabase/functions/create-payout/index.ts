import { createClient } from 'supabase-js';
import { corsHeaders } from 'common/cors.ts';
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Autenticação e verificação de permissão de administrador
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Usuário não encontrado.");

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error("Acesso negado. Somente administradores podem realizar pagamentos.");
    }

    // 2. Validação do corpo da requisição
    const { referral_ids } = await req.json();
    if (!referral_ids || !Array.isArray(referral_ids) || referral_ids.length === 0) {
      throw new Error("A requisição deve incluir um array de 'referral_ids'.");
    }

    // 3. Busca e validação das indicações
    const { data: referrals, error: referralsError } = await supabaseAdmin
      .from('referrals')
      .select('id, commission_amount, status, affiliate_id')
      .in('id', referral_ids);

    if (referralsError) throw referralsError;
    if (referrals.length !== referral_ids.length) {
      throw new Error("Uma ou mais IDs de indicação não foram encontradas.");
    }

    const firstAffiliateId = referrals[0].affiliate_id;
    let totalAmount = 0;

    for (const referral of referrals) {
      if (referral.status !== 'converted') {
        throw new Error(`A indicação ${referral.id} não está no status 'converted' e não pode ser paga.`);
      }
      if (referral.affiliate_id !== firstAffiliateId) {
        throw new Error("Todas as indicações devem pertencer ao mesmo afiliado.");
      }
      totalAmount += referral.commission_amount || 0;
    }

    if (totalAmount <= 0) {
      throw new Error("O valor total do pagamento deve ser maior que zero.");
    }

    // 4. Busca dos dados do afiliado para pagamento
    const { data: affiliate, error: affiliateError } = await supabaseAdmin
      .from('affiliates')
      .select('stripe_connect_account_id')
      .eq('id', firstAffiliateId)
      .single();

    if (affiliateError || !affiliate?.stripe_connect_account_id) {
      throw new Error("Afiliado não encontrado ou não possui uma conta de pagamento configurada.");
    }

    // 5. Criação da transferência via Stripe
    const transfer = await stripe.transfers.create({
      amount: Math.round(totalAmount * 100), // Converter para centavos
      currency: 'brl', // Moeda
      destination: affiliate.stripe_connect_account_id,
      description: `Pagamento de comissão para ${referrals.length} indicações.`,
    });

    // 6. Atualização do status das indicações para 'paid'
    const { error: updateError } = await supabaseAdmin
      .from('referrals')
      .update({ status: 'paid' })
      .in('id', referral_ids);

    if (updateError) {
      // Se a atualização falhar, é crucial logar. O dinheiro foi enviado!
      console.error(`ERRO CRÍTICO: A transferência ${transfer.id} foi enviada, mas falhou ao atualizar o status das indicações: ${referral_ids.join(', ')}`);
      throw new Error(`Transferência enviada, mas falhou ao atualizar o banco de dados. Verifique o log.`);
    }

    return new Response(JSON.stringify({ success: true, transfer_id: transfer.id, amount_paid: totalAmount }), {
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

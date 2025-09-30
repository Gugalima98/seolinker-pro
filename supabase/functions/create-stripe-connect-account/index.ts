import { createClient } from 'supabase-js';
import { corsHeaders } from 'common/cors.ts';
import Stripe from 'stripe';

Deno.serve(async (req) => {
  // Validação de variáveis de ambiente
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const siteUrl = Deno.env.get('SITE_URL');

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "A variável de ambiente STRIPE_SECRET_KEY não está definida." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (!siteUrl) {
    return new Response(JSON.stringify({ error: "A variável de ambiente SITE_URL não está definida." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Usuário não encontrado.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    );

    const { data: affiliate, error: affiliateError } = await supabaseAdmin
      .from('affiliates')
      .select('id, stripe_connect_account_id')
      .eq('user_id', user.id)
      .single();

    if (affiliateError || !affiliate) {
      throw new Error("Perfil de afiliado não encontrado. Torne-se um afiliado primeiro.");
    }

    let connectAccountId = affiliate.stripe_connect_account_id;

    // Se o afiliado ainda não tiver uma conta no Stripe Connect, crie uma
    if (!connectAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        business_type: 'individual',
        country: 'BR', // Padrão para o Brasil
      });
      connectAccountId = account.id;

      // Salva o ID da conta no perfil do afiliado
      const { error: updateError } = await supabaseAdmin
        .from('affiliates')
        .update({ stripe_connect_account_id: connectAccountId })
        .eq('id', affiliate.id);

      if (updateError) throw new Error("Falha ao salvar o ID da conta Stripe do afiliado.");
    }

    // Gera um link de onboarding para o afiliado preencher os dados
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: `${siteUrl}/affiliate?reauth=true`,
      return_url: `${siteUrl}/affiliate`,
      type: 'account_onboarding',
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro completo:', error);
    // Tratamento de erro específico para o Stripe
    if (error.type === 'StripeAPIError') {
      console.error('Erro da API do Stripe:', error.message);
      console.error('Detalhes do erro Stripe:', JSON.stringify(error.raw, null, 2));
      return new Response(JSON.stringify({ error: `Stripe Error: ${error.message}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
});

import { createClient } from 'supabase-js';
import { corsHeaders } from 'common/cors.ts';
import Stripe from 'stripe';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validação de variável de ambiente
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error("A variável de ambiente STRIPE_SECRET_KEY não está definida.");

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SERVICE_ROLE_KEY') ?? '');

    // Pega o usuário autenticado
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: req.headers.get('Authorization')! } } });
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Usuário não encontrado.");

    // Busca o perfil do usuário para obter o stripe_customer_id e outros dados
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    let hasCard = false;

    // Se houver um ID de cliente Stripe, verifica se há um cartão cadastrado
    if (profile.stripe_customer_id) {
      const customer = await stripe.customers.retrieve(profile.stripe_customer_id) as Stripe.Customer;
      hasCard = !!customer.invoice_settings?.default_payment_method;
    }

    return new Response(JSON.stringify({ 
      hasCard,
      profile 
    }), {
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

import { createClient } from 'supabase-js';
import { corsHeaders } from 'common/cors.ts';

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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error("Acesso negado. Somente administradores podem acessar estes dados.");
    }

    // 2. Buscar todos os afiliados
    const { data: affiliates, error: affiliatesError } = await supabaseAdmin
      .from('affiliates')
      .select(`
        id,
        user_id,
        affiliate_code,
        commission_rate,
        stripe_connect_account_id
      `);

    if (affiliatesError) throw affiliatesError;

    // 3. Buscar emails dos afiliados usando a função RPC
    const affiliateUserIds = affiliates.map(a => a.user_id);
    let userEmailMap = new Map();
    if (affiliateUserIds.length > 0) {
      const { data: users, error: usersError } = await supabaseAdmin
        .rpc('get_user_emails', { user_ids: affiliateUserIds });
      if (usersError) throw usersError;
      userEmailMap = new Map((users as any[]).map(u => [u.id, u.email]));
    }

    // 4. Buscar todas as indicações
    const { data: referrals, error: referralsError } = await supabaseAdmin
      .from('referrals')
      .select('id, affiliate_id, status, commission_amount, created_at');

    if (referralsError) throw referralsError;

    // 5. Buscar todas as configurações
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('app_settings')
      .select('*');

    if (settingsError) throw settingsError;

    // 6. Processar e agregar os dados
    const statsByAffiliate = new Map();

    for (const affiliate of affiliates) {
      statsByAffiliate.set(affiliate.id, {
        ...affiliate,
        email: userEmailMap.get(affiliate.user_id) || 'Email não encontrado',
        total_earnings: 0,
        pending_payout: 0,
        total_referrals: 0,
        converted_referrals: 0,
      });
    }

    const pending_payouts = [];

    for (const referral of referrals) {
      if (statsByAffiliate.has(referral.affiliate_id)) {
        const affiliateStat = statsByAffiliate.get(referral.affiliate_id);
        affiliateStat.total_referrals++;

        if (referral.status === 'paid') {
          affiliateStat.total_earnings += referral.commission_amount || 0;
        }
        if (referral.status === 'converted') {
          affiliateStat.pending_payout += referral.commission_amount || 0;
          affiliateStat.converted_referrals++;
          pending_payouts.push(referral);
        }
      }
    }

    const response = {
      affiliates: Array.from(statsByAffiliate.values()),
      pending_payouts: pending_payouts,
      settings: settings,
    };

    return new Response(JSON.stringify(response), {
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

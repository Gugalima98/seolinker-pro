import { createClient } from 'supabase-js';
import { corsHeaders } from 'common/cors.ts';

Deno.serve(async (req) => {
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

    // 1. Encontra o perfil de afiliado do usuário
    const { data: affiliate, error: affiliateError } = await supabaseAdmin
      .from('affiliates')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (affiliateError || !affiliate) {
      throw new Error("Perfil de afiliado não encontrado.");
    }

    // 2. Busca indicações e cliques em paralelo
    const [referralsRes, clicksRes] = await Promise.all([
      supabaseAdmin
        .from('referrals')
        .select('status, commission_amount, created_at, referred_user_id')
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('referral_clicks')
        .select('', { count: 'exact', head: true })
        .eq('affiliate_id', affiliate.id)
    ]);

    const { data: referrals, error: referralsError } = referralsRes;
    if (referralsError) throw referralsError;
    const { count: totalClicks, error: clicksError } = clicksRes;
    if (clicksError) throw clicksError;

    // 3. Calcula as estatísticas
    let conversions = 0;
    let earnings = 0;
    let pendingEarnings = 0;

    for (const referral of referrals) {
      if (referral.status === 'converted' || referral.status === 'paid') {
        conversions++;
      }
      if (referral.status === 'paid') {
        earnings += referral.commission_amount || 0;
      }
      if (referral.status === 'converted') {
        pendingEarnings += referral.commission_amount || 0;
      }
    }

    // 4. Busca emails para as indicações recentes usando a função RPC
    const recentReferralUserIds = referrals.slice(0, 5).map(r => r.referred_user_id);
    let userMap = new Map();

    if (recentReferralUserIds.length > 0) {
      const { data: referredUsers, error: usersError } = await supabaseAdmin
        .rpc('get_user_emails', { user_ids: recentReferralUserIds });

      if (usersError) throw usersError;
      userMap = new Map((referredUsers as any[]).map(u => [u.id, u.email]));
    }

    const recentReferrals = referrals.slice(0, 5).map(r => ({
      ...r,
      email: userMap.get(r.referred_user_id) || 'Email não encontrado'
    }));

    // 5. Monta a resposta final
    const stats = {
      totalClicks: totalClicks || 0,
      conversions,
      earnings,
      pendingEarnings,
      recentReferrals,
    };

    return new Response(JSON.stringify(stats), {
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

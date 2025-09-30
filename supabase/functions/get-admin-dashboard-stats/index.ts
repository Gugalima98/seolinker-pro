import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Admin auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || !profile || profile.role !== 'admin') {
      throw new Error('Forbidden: Not an admin');
    }

    // --- Fetch data for charts and stats ---

    // 1. Fetch all users with pagination for monthly stats
    let allAuthUsers = [];
    let userPage = 1;
    while (true) {
      const { data: { users: userBatch }, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
        page: userPage,
        perPage: 1000,
      });
      if (authUsersError) throw new Error(`Error listing users: ${authUsersError.message}`);
      allAuthUsers.push(...userBatch);
      if (userBatch.length < 1000) break;
      userPage++;
    }

    // 2. Fetch all client sites with pagination for type distribution
    let allClientSites = [];
    let sitePage = 0;
    const pageSize = 1000;
    while (true) {
      const { data: siteBatch, error: sitesError } = await supabaseAdmin
        .from('client_sites')
        .select('type') // Only select the 'type' column
        .range(sitePage * pageSize, (sitePage + 1) * pageSize - 1);
      
      if (sitesError) throw sitesError;
      allClientSites.push(...siteBatch);
      if (siteBatch.length < pageSize) break;
      sitePage++;
    }

    // 3. Fetch counts for backlinks and tickets
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const { count: backlinksThisMonth, error: backlinksError } = await supabaseAdmin.from('backlinks').select('*', { count: 'exact', head: true }).gte('created_at', firstDayOfMonth);
    const { count: openTickets, error: ticketsError } = await supabaseAdmin.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open');

    if (backlinksError || ticketsError) {
        throw new Error('Failed to fetch backlink or ticket counts.');
    }

    // --- Process data for charts ---

    // 4. Process new users per month (last 6 months)
    const monthlyUserData = Array(6).fill(0).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return { name: d.toLocaleString('default', { month: 'short' }), "Novos Usuários": 0 };
    }).reverse();

    allAuthUsers.forEach(u => {
        const userDate = new Date(u.created_at);
        const monthDiff = today.getMonth() - userDate.getMonth() + (12 * (today.getFullYear() - userDate.getFullYear()));
        if (monthDiff >= 0 && monthDiff < 6) {
            const monthIndex = 5 - monthDiff;
            monthlyUserData[monthIndex]["Novos Usuários"]++;
        }
    });

    // 5. Process site type distribution
    const siteTypeDistribution = allClientSites.reduce((acc, site) => {
        const type = site.type || 'Desconhecido';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    const siteTypeChartData = Object.entries(siteTypeDistribution).map(([name, value]) => ({ name, value }));


    // --- Combine all data ---
    const responsePayload = {
      // Card stats
      totalUsers: allAuthUsers.length,
      totalClientSites: allClientSites.length,
      backlinksThisMonth,
      openTickets,
      // Chart data
      monthlyUserData,
      siteTypeChartData,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

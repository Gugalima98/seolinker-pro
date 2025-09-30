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
    const { searchQuery, planFilter } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Fetch the user's role from the profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Not an admin' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Now fetch all users and their roles from the profiles table
    let allAuthUsers: any[] = [];
    let page = 1;
    const perPage = 1000; // Max per page for listUsers

    while (true) {
      const { data: { users: userPage }, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
        page: page,
        perPage: perPage,
      });

      if (authUsersError) {
        throw new Error(`Error listing users: ${authUsersError.message}`);
      }

      allAuthUsers = allAuthUsers.concat(userPage);

      if (userPage.length < perPage) {
        break; // No more pages
      }
      page++;
    }

    const { data: allProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, plan_id');
    if (profilesError) {
      throw profilesError;
    }

    const profileMap = new Map(allProfiles.map(p => [p.id, { role: p.role, plan_id: p.plan_id }]));

    let usersWithRoles = allAuthUsers.map(authUser => ({
      ...authUser,
      role: profileMap.get(authUser.id)?.role || 'client', // Default to client if no profile role found
      plan_id: profileMap.get(authUser.id)?.plan_id || null, // Include plan_id
    }));

    if (planFilter) {
      usersWithRoles = usersWithRoles.filter(user => user.plan_id === planFilter);
    }

    const filteredUsers = searchQuery
      ? usersWithRoles.filter(user =>
          user.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : usersWithRoles;

    return new Response(JSON.stringify({ users: filteredUsers }), {
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

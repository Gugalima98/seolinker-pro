import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Check for authorization and admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      throw new Error('Forbidden: Not an admin');
    }

    // 2. Fetch all users with pagination to create a user map (id -> email)
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
    const userMap = new Map(allAuthUsers.map(u => [u.id, u.email]));

    // 3. Fetch all client sites with pagination
    let allClientSites = [];
    let sitePage = 0;
    const pageSize = 1000;
    while (true) {
      const { data: siteBatch, error: sitesError } = await supabaseAdmin
        .from('client_sites')
        .select('*')
        .range(sitePage * pageSize, (sitePage + 1) * pageSize - 1);
      
      if (sitesError) throw sitesError;
      allClientSites.push(...siteBatch);
      if (siteBatch.length < pageSize) break;
      sitePage++;
    }
    // 4. Combine sites with user emails
    const sitesWithEmails = allClientSites.map(site => ({
      ...site,
      user_email: userMap.get(site.user_id) || 'Unknown User'
    }));

    // 5. Return the combined data
    return new Response(JSON.stringify({ sites: sitesWithEmails }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden: Not an admin' ? 403 : 500,
    });
  }
});

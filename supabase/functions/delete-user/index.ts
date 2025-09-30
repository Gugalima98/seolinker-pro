import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!serviceRoleKey || !supabaseUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      await supabaseAdmin.from('logs').insert({
        level: 'error',
        message: `Failed to delete user with ID: ${userId}`,
        meta: { error: error.message, userId },
      });
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error.status || 500 }
      );
    }

    await supabaseAdmin.from('logs').insert({
      level: 'success',
      message: `User with ID ${userId} deleted successfully.`,
      meta: { userId },
    });

    return new Response(
      JSON.stringify({ user: data.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    await supabaseAdmin.from('logs').insert({
      level: 'error',
      message: 'An unexpected error occurred in delete-user function.',
      meta: { error: error.message },
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }});

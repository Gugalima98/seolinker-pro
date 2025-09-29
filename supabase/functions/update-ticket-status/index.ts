import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { ticket_id, status } = await req.json();

    if (!ticket_id || !status) {
      return new Response(JSON.stringify({ error: 'Ticket ID and status are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if the user is an admin
    const authHeader = req.headers.get('Authorization');
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

    // Update the ticket status
    const { data, error } = await supabaseAdmin
      .from('tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticket_id)
      .select()
      .single();

    if (error) {
      await supabaseAdmin.from('logs').insert({
        level: 'error',
        message: `Failed to update status for ticket ${ticket_id}`,
        meta: { error: error.message, ticket_id, status, admin_id: user.id },
      });
      throw error;
    }

    await supabaseAdmin.from('logs').insert({
      level: 'success',
      message: `Ticket ${ticket_id} status updated to '${status}' by admin ${user.id}`,
      meta: { ticket_id, status, admin_id: user.id },
    });

    return new Response(JSON.stringify({ ticket: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    await supabaseAdmin.from('logs').insert({
      level: 'error',
      message: 'An unexpected error occurred in update-ticket-status function.',
      meta: { error: error.message },
    });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

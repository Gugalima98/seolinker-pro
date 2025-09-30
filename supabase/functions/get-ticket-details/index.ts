import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { ticket_id, user_id, isAdminRequest } = await req.json();

    if (!ticket_id) {
      return new Response(JSON.stringify({ error: 'Ticket ID is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Step 1: Fetch the ticket itself
    let ticketQuery = supabaseAdmin.from('tickets').select('*').eq('id', ticket_id);
    if (!isAdminRequest) {
      if (!user_id) {
        return new Response(JSON.stringify({ error: 'User ID is required for non-admin requests' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      ticketQuery = ticketQuery.eq('user_id', user_id);
    }
    const { data: ticketData, error: ticketError } = await ticketQuery.single();

    if (ticketError) {
      console.error('Error fetching ticket:', ticketError);
      throw ticketError;
    }

    if (!ticketData) {
      return new Response(JSON.stringify({ error: 'Ticket not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Step 2: Fetch the associated messages
    const { data: messagesData, error: messagesError } = await supabaseAdmin
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticket_id)
      .order('created_at', { ascending: true }); // Order messages by creation time

    if (messagesError) {
      console.error('Error fetching ticket messages:', messagesError);
      throw messagesError;
    }

    const messages = messagesData || [];

    // Step 3: Combine and return
    const finalTicket = { ...ticketData, ticket_messages: messages };

    console.log('Final ticket data being returned:', finalTicket);
    return new Response(JSON.stringify({ ticket: finalTicket }), {
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

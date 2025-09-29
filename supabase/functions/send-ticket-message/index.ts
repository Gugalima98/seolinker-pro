import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { ticket_id, author_id, author_role, message } = await req.json();

    if (!ticket_id || !author_id || !author_role || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Insert the new message
    const { data: messageData, error: messageError } = await supabaseAdmin
      .from('ticket_messages')
      .insert({
        ticket_id,
        author_id,
        author_role,
        message,
      })
      .select()
      .single();

    if (messageError) {
      await supabaseAdmin.from('logs').insert({
        level: 'error',
        message: `Failed to send message for ticket ${ticket_id}`,
        meta: { error: messageError.message, ticket_id, author_id },
      });
      throw messageError;
    }

    // Update the ticket's updated_at timestamp
    const { error: ticketUpdateError } = await supabaseAdmin
      .from('tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticket_id);

    if (ticketUpdateError) {
      // Log this error but don't throw, as the message was already sent
      await supabaseAdmin.from('logs').insert({
        level: 'warn',
        message: `Failed to update timestamp for ticket ${ticket_id}`,
        meta: { error: ticketUpdateError.message, ticket_id },
      });
    }

    // If an admin responded, send a notification to the ticket owner
    if (author_role === 'admin') {
      const { data: ticketData, error: fetchTicketError } = await supabaseAdmin
        .from('tickets')
        .select('user_id')
        .eq('id', ticket_id)
        .single();

      if (fetchTicketError) {
        console.error("Error fetching ticket owner for notification:", fetchTicketError.message);
        await supabaseAdmin.from('logs').insert({
          level: 'warn',
          message: `Failed to fetch ticket owner for notification on ticket ${ticket_id}`,
          meta: { error: fetchTicketError.message, ticket_id },
        });
      } else if (ticketData) {
        await supabaseAdmin.from('notifications').insert({
          user_id: ticketData.user_id,
          message: `Seu ticket de suporte #${ticket_id} recebeu uma nova resposta.`, 
          type: 'info',
        });
      }
    }

    await supabaseAdmin.from('logs').insert({
      level: 'success',
      message: `Message sent successfully for ticket ${ticket_id} by ${author_role} ${author_id}`,
      meta: { ticket_id, author_id, author_role },
    });

    return new Response(JSON.stringify({ message: messageData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    await supabaseAdmin.from('logs').insert({
      level: 'error',
      message: 'An unexpected error occurred in send-ticket-message function.',
      meta: { error: error.message },
    });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

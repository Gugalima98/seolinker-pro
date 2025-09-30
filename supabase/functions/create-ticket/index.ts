import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, subject, description, category, priority } = await req.json();

    if (!user_id || !subject || !description || !category || !priority) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { data, error } = await supabaseAdmin
      .from('tickets')
      .insert({
        user_id,
        subject,
        description,
        category,
        priority,
        status: 'Aberto', // Default status
      })
      .select()
      .single();

    if (error) {
      await supabaseAdmin.from('logs').insert({
        level: 'error',
        message: `Failed to create ticket for user ${user_id}`,
        meta: { error: error.message, user_id, subject },
      });
      throw error;
    }

    // Create initial message for the ticket
    const { error: messageError } = await supabaseAdmin
      .from('ticket_messages')
      .insert({
        ticket_id: data.id,
        author_id: user_id,
        author_role: 'user',
        message: description,
      });

    if (messageError) {
      await supabaseAdmin.from('logs').insert({
        level: 'error',
        message: `Failed to create initial message for ticket ${data.id}`,
        meta: { error: messageError.message, ticketId: data.id },
      });
      throw messageError;
    }

    await supabaseAdmin.from('logs').insert({
      level: 'success',
      message: `Ticket ${data.id} created successfully by user ${user_id}`,
      meta: { ticketId: data.id, userId: user_id, subject },
    });

    return new Response(JSON.stringify({ ticket: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    await supabaseAdmin.from('logs').insert({
      level: 'error',
      message: 'An unexpected error occurred in create-ticket function.',
      meta: { error: error.message },
    });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

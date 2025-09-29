import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, statusFilter, searchTerm, isAdminRequest } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let query = supabaseAdmin.from('tickets').select('*, ticket_messages(count)');

    if (isAdminRequest) {
      // Admins can see all tickets, apply filters
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (searchTerm) {
        query = query.or(`subject.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
    } else {
      // Regular users can only see their own tickets
      if (!user_id) {
        return new Response(JSON.stringify({ error: 'User ID is required for non-admin requests' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      query = query.eq('user_id', user_id);
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (searchTerm) {
        query = query.or(`subject.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data: tickets, error } = await query;

    if (error) {
      throw error;
    }

    let ticketsWithCreatorEmail = tickets || [];

    if (ticketsWithCreatorEmail.length > 0) {
      const uniqueCreatorIds = [...new Set(ticketsWithCreatorEmail.map(ticket => ticket.user_id))];
      const creatorDetailsMap = new Map();

      // Fetch details for each creator
      for (const creatorId of uniqueCreatorIds) {
        try {
          const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(creatorId);
          if (userError) {
            console.error(`Error fetching user ${creatorId}:`, userError);
            // Continue without this user's details if there's an error
          } else if (userData?.user) {
            creatorDetailsMap.set(creatorId, { email: userData.user.email });
          }
        } catch (e) {
          console.error(`Exception fetching user ${creatorId}:`, e);
        }
      }

      ticketsWithCreatorEmail = ticketsWithCreatorEmail.map(ticket => ({
        ...ticket,
        creator_email: creatorDetailsMap.get(ticket.user_id)?.email || null,
      }));
    }

    return new Response(JSON.stringify({ tickets: ticketsWithCreatorEmail }), {
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

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import Stripe from 'npm:stripe@^15.8.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey) {
      throw new Error('Missing required environment variables.');
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { userId } = await req.json();

    if (!userId) {
      throw new Error('User ID is required.');
    }

    // Retrieve the Stripe Customer ID from the profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile || !profile.stripe_customer_id) {
      throw new Error('Stripe customer not found for this user.');
    }

    const { url } = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${Deno.env.get('SITE_URL')}/settings`,
    });

    return new Response(JSON.stringify({ url }), {
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

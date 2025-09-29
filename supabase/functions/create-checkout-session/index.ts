import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import Stripe from 'https://esm.sh/stripe@11.2.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Map of plan IDs to their monthly Stripe Price ID.
const priceMap = {
  starter: 'price_1S3PvoDssGMGr4ApVHjLcKBy',
  pro: 'price_1S3PwCDssGMGr4ApXhYzENaK',
  agency: 'price_1S3PwdDssGMGr4ApVu7rU8kB',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { planId } = await req.json();

    // Validate input
    if (!planId || !priceMap[planId]) {
      return new Response(JSON.stringify({ error: 'Invalid plan ID' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Attempt to get the user from the request header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();

    const priceId = priceMap[planId];

    const sessionPayload: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${Deno.env.get('SITE_URL')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('SITE_URL')}/pricing`, // Or sales page
    };

    // If the user is logged in, pass their details to Stripe
    if (user) {
      sessionPayload.customer_email = user.email;
      sessionPayload.client_reference_id = user.id;
    } else {
      // For new users, Stripe will collect the email during checkout
      sessionPayload.customer_creation = 'always';
    }

    const session = await stripe.checkout.sessions.create(sessionPayload);

    return new Response(JSON.stringify({ sessionId: session.id }), {
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
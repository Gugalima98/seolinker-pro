import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import Stripe from 'npm:stripe@^15.8.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('create-user-subscription: Imports loaded');

// This should be kept in sync with your stripe-webhook function
const priceIdToPlan = {
  'price_1S3PvoDssGMGr4ApVHjLcKBy': 'starter',
  'price_1S3PwCDssGMGr4ApXhYzENaK': 'pro',
  'price_1S3PwdDssGMGr4ApVu7rU8kB': 'agency',
  'price_1S3fgvDssGMGr4Ap2KNREK4i': 'legacy',
  'price_1S3finDssGMGr4ApW7wWdEOK': 'legacy-club',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check for required environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or STRIPE_SECRET_KEY)' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    console.log('create-user-subscription: Environment variables checked');

    // Initialize clients within the request
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    console.log('create-user-subscription: Clients initialized');

    const { userId, priceId, trial_period_days } = await req.json();
    console.log('create-user-subscription: Request body parsed', { userId, priceId, trial_period_days });

    if (!userId || !priceId) {
      return new Response(JSON.stringify({ error: 'User ID and Price ID are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Fetch user's email for Stripe customer creation if needed
    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authUserError || !authUser) {
      throw new Error('User not found in auth.users');
    }
    console.log('create-user-subscription: User fetched', { authUser: authUser.user.email });

    // Get or create Stripe customer
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    let customerId: string;

    if (profileError || !profile?.stripe_customer_id) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: authUser.user.email,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;

      // Update profiles table with new customer ID
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
      if (updateProfileError) throw updateProfileError;
    } else {
      customerId = profile.stripe_customer_id;
    }
    console.log('create-user-subscription: Customer ID determined', { customerId });

    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
      payment_behavior: 'default_incomplete', // Allow creating subscription without immediate payment
      collection_method: 'charge_automatically',
    };

    if (trial_period_days && trial_period_days > 0) {
      subscriptionParams.trial_period_days = trial_period_days;
    }

    // Create Stripe subscription
    let subscription;
    try {
      subscription = await stripe.subscriptions.create(subscriptionParams);
      console.log('create-user-subscription: Stripe subscription created', { subscriptionId: subscription.id });
    } catch (stripeError) {
      console.error('create-user-subscription: Error creating Stripe subscription:', stripeError.message);
      throw new Error(`Stripe subscription creation failed: ${stripeError.message}`);
    }

    const planId = priceIdToPlan[priceId];

    // Update profiles table with subscription details
    const { error: updateSubscriptionError } = await supabaseAdmin
      .from('profiles')
      .update({
        stripe_subscription_id: subscription.id,
        plan_id: planId,
        subscription_status: subscription.status,
        subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('id', userId);
    if (updateSubscriptionError) throw updateSubscriptionError;

    return new Response(JSON.stringify({ subscription }), {
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

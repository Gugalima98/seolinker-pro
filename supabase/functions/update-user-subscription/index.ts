import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import Stripe from 'https://esm.sh/stripe@11.2.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

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
    const { subscriptionId, priceId, trial_end } = await req.json();

    if (!subscriptionId) {
      return new Response(JSON.stringify({ error: 'Subscription ID is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Retrieve the subscription to get the current subscription item
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const updateParams: Stripe.SubscriptionUpdateParams = {};

    if (priceId) {
      updateParams.items = [{
        id: subscription.items.data[0].id, // The ID of the subscription item to update
        price: priceId,
      }];
      updateParams.proration_behavior = 'always_invoice'; // or 'create_prorations' based on your business logic
    }

    if (trial_end !== undefined) {
      updateParams.trial_end = trial_end;
    }

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, updateParams);

    if (priceId) {
      const planId = priceIdToPlan[priceId];
      // Update the plan in your profiles table
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ plan_id: planId })
        .eq('stripe_customer_id', subscription.customer as string);

      if (updateError) throw updateError;

      await supabaseAdmin.from('logs').insert({
        level: 'success',
        message: `User subscription updated successfully for customer ${subscription.customer}.`,
        meta: { subscriptionId, newPlan: planId },
      });
    }

    return new Response(JSON.stringify({ updatedSubscription }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    await supabaseAdmin.from('logs').insert({
      level: 'error',
      message: 'Error updating user subscription.',
      meta: { error: error.message },
    });

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

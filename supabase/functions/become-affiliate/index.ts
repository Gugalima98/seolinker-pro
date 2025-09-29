import { createClient } from 'supabase-js';
import { corsHeaders } from 'common/cors.ts';

// Helper to generate a random alphanumeric code
function generateAffiliateCode(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("User not found.");

    // Use the service role key for admin-level operations
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Check if the user is already an affiliate
    const { data: existingAffiliate, error: existingAffiliateError } = await supabaseAdmin
      .from('affiliates')
      .select('id, user_id, affiliate_code, commission_rate, stripe_connect_account_id')
      .eq('user_id', user.id)
      .single();

    if (existingAffiliateError && existingAffiliateError.code !== 'PGRST116') {
        // PGRST116 is "exact one row not found", which is expected if they aren't an affiliate yet.
        // Any other error is a real problem.
        throw existingAffiliateError;
    }
    
    if (existingAffiliate) {
      // User is already an affiliate, return their data
      return new Response(JSON.stringify(existingAffiliate), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. If not, generate a new unique affiliate code
    let affiliateCode = '';
    let isCodeUnique = false;
    while (!isCodeUnique) {
        affiliateCode = generateAffiliateCode(8);
        const { data: codeCheck, error: codeCheckError } = await supabaseAdmin
            .from('affiliates')
            .select('affiliate_code')
            .eq('affiliate_code', affiliateCode)
            .single();
        
        if (codeCheckError && codeCheckError.code === 'PGRST116') {
            isCodeUnique = true; // Code not found, so it's unique
        } else if (codeCheckError) {
            throw codeCheckError; // Another error occurred
        }
        // If no error and no data, codeCheck will be null, so it's unique.
        if (!codeCheck) {
            isCodeUnique = true;
        }
    }

    // 3. Busca a taxa de comissão padrão
    const { data: setting } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'default_affiliate_commission')
      .single();

    // Usa a taxa encontrada ou um padrão de 0.5 (50%)
    const defaultRate = setting ? parseFloat(setting.value) : 0.5;

    // 4. Cria o novo registro de afiliado com a taxa padrão
    const newAffiliateData = {
      user_id: user.id,
      affiliate_code: affiliateCode,
      commission_rate: defaultRate,
    };

    const { data: newAffiliate, error: insertError } = await supabaseAdmin
      .from('affiliates')
      .insert(newAffiliateData)
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify(newAffiliate), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // 201 Created
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

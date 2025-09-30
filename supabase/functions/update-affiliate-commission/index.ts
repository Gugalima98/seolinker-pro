import { createClient } from 'supabase-js';
import { corsHeaders } from 'common/cors.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Autenticação e verificação de permissão de administrador
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Usuário não encontrado.");

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error("Acesso negado. Somente administradores podem alterar comissões.");
    }

    // 2. Validação do corpo da requisição
    const { affiliate_id, commission_rate } = await req.json();
    if (!affiliate_id || commission_rate === undefined) {
      throw new Error("A requisição deve incluir 'affiliate_id' e 'commission_rate'.");
    }

    const rate = parseFloat(commission_rate);
    if (isNaN(rate) || rate < 0 || rate > 1) {
        throw new Error("A taxa de comissão deve ser um número entre 0 e 1 (ex: 0.5 para 50%).");
    }

    // 3. Atualização da taxa de comissão no banco de dados
    const { data, error: updateError } = await supabaseAdmin
      .from('affiliates')
      .update({ commission_rate: rate })
      .eq('id', affiliate_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

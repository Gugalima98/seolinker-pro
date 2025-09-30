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
      throw new Error("Acesso negado. Somente administradores podem alterar configurações.");
    }

    // 2. Validação do corpo da requisição
    const { key, value } = await req.json();
    if (!key || value === undefined) {
      throw new Error("A requisição deve incluir 'key' e 'value'.");
    }

    // 3. Atualização da configuração (upsert)
    const { data, error: upsertError } = await supabaseAdmin
      .from('app_settings')
      .upsert({ key, value }, { onConflict: 'key' })
      .select()
      .single();

    if (upsertError) throw upsertError;

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

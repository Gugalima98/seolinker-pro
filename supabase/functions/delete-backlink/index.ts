import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log("delete-backlink function invoked.");

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    // Suporta chamadas diretas da API e webhooks do Supabase
    const backlink_id = body.backlink_id || body.record?.id || body.old_record?.id;

    if (!backlink_id) {
      throw new Error("ID do backlink é obrigatório.");
    }
    console.log(`Iniciando processo de exclusão para o backlink_id: ${backlink_id}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Busca os detalhes do backlink para obter IDs do WP e do site da rede
    const { data: backlink, error: fetchError } = await supabaseAdmin
      .from('backlinks')
      .select('wp_post_id, network_site_id')
      .eq('id', backlink_id)
      .single();

    if (fetchError) {
      // Se o backlink já foi deletado, considera sucesso.
      if (fetchError.code === 'PGRST116') {
        console.log(`Backlink ${backlink_id} não encontrado, provavelmente já deletado.`);
        return new Response(JSON.stringify({ message: "Backlink já havia sido deletado." }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      throw new Error(`Falha ao buscar backlink: ${fetchError.message}`);
    }

    const { wp_post_id, network_site_id } = backlink;

    // 2. Tenta deletar do WordPress se houver informações suficientes
    if (wp_post_id && network_site_id) {
      console.log(`Post ID do WordPress encontrado: ${wp_post_id}. Tentando excluir do WordPress.`);
      
      const { data: networkSite, error: siteError } = await supabaseAdmin
        .from('network_sites')
        .select('api_url, username, application_password')
        .eq('id', network_site_id)
        .single();

      if (siteError) {
        console.error(`Não foi possível buscar credenciais do site da rede: ${siteError.message}. Pulando exclusão do WordPress.`);
      } else {
        const cleanApiUrl = networkSite.api_url.endsWith('/') ? networkSite.api_url.slice(0, -1) : networkSite.api_url;
        const wpApiUrl = `${cleanApiUrl}/posts/${wp_post_id}?force=true`;
        const credentials = btoa(`${networkSite.username}:${networkSite.application_password}`);

        const wpResponse = await fetch(wpApiUrl, {
          method: 'DELETE',
          headers: { 'Authorization': `Basic ${credentials}` }
        });

        const responseBody = await wpResponse.text();
        console.log(`Resposta da API do WordPress - Status: ${wpResponse.status}`)
        console.log(`Resposta da API do WordPress - Corpo: ${responseBody}`)
        
        // Se a resposta não for OK e também não for 404 (não encontrado), é um erro real.
        if (!wpResponse.ok && wpResponse.status !== 404) {
          console.error(`Erro da API do WordPress: ${wpResponse.status}. Body: ${responseBody}`);
          throw new Error(`Erro ao deletar post do WordPress (${wpResponse.status}). O backlink não foi deletado do sistema.`);
        }
        console.log("Exclusão do post no WordPress concluída (ou post não encontrado).");
      }
    }

    // 3. Deleta o backlink do banco de dados do Supabase
    const { error: deleteError } = await supabaseAdmin
      .from('backlinks')
      .delete()
      .eq('id', backlink_id);

    if (deleteError) {
      throw new Error(`Falha ao deletar o backlink do Supabase: ${deleteError.message}`);
    }

    console.log(`Backlink ${backlink_id} deletado com sucesso do banco de dados.`);

    return new Response(JSON.stringify({ message: "Backlink deletado com sucesso." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error in delete-backlink function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
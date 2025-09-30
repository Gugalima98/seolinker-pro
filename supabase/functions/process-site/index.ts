import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function updateSiteProgress(client, siteId, progress_percent, progress_log) {
    await client.from('client_sites').update({ progress_percent, progress_log }).eq('id', siteId);
}

async function updateSiteStatus(client, siteId, status, status_description) {
    await client.from('client_sites').update({ status, status_description }).eq('id', siteId);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  let clientSiteId;

  try {
    const body = await req.json();
    clientSiteId = body.clientSiteId;
    const siteUrl = body.siteUrl;

    if (!siteUrl || !clientSiteId) {
      throw new Error("A URL do site e o ID do site do cliente são obrigatórios.");
    }
    console.log(`Iniciando processamento para: ${siteUrl} (ID: ${clientSiteId})`);

    const supabaseUrl = "https://uorwocetqyjkpioimrjk.supabase.co";
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
    if (!serviceKey) {
        throw new Error("SERVICE_ROLE_KEY não encontrada nas secrets da função.");
    }

    const supabaseClient = createClient(supabaseUrl, serviceKey);
    console.log("Cliente Supabase inicializado.");
    await updateSiteProgress(supabaseClient, clientSiteId, 10, "Buscando sitemap...");

    let sitemapXml = '';
    const commonSitemapPaths = ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml'];
    let foundSitemap = false;
        const normalizedSiteUrl = `https://${siteUrl.replace(new RegExp('^https?://'), '').replace(new RegExp('/', 'g'))}`;
    for (let i = 0; i < commonSitemapPaths.length; i++) {
      const path = commonSitemapPaths[i];
      const sitemapUrlToTry = `${normalizedSiteUrl}${path}`;
      console.log(`Tentando buscar sitemap em: ${sitemapUrlToTry}`);
      try {
        const sitemapRes = await fetch(sitemapUrlToTry, { headers: { 'User-Agent': 'Googlebot/2.1' } });
        if (sitemapRes.ok) {
          sitemapXml = await sitemapRes.text();
          if (sitemapXml.includes('<sitemapindex')) {
            console.log("Índice de sitemaps detectado. Buscando o primeiro sitemap da lista...");
            const match = sitemapXml.match(/<loc>(.*?)<\/loc>/);
            if (match && match[1]) {
              const firstSitemapUrl = match[1];
              console.log(`Buscando conteúdo do sitemap final em: ${firstSitemapUrl}`);
              const finalSitemapRes = await fetch(firstSitemapUrl, { headers: { 'User-Agent': 'Googlebot/2.1' } });
              if (finalSitemapRes.ok) {
                sitemapXml = await finalSitemapRes.text();
              } else {
                throw new Error(`Falha ao buscar o sitemap final em ${firstSitemapUrl}`);
              }
            }
          }
          console.log(`Sitemap final enviado para IA (primeiros 2000 caracteres):\n${sitemapXml.substring(0, 2000)}...`);
          foundSitemap = true;
          console.log(`Sitemap encontrado: ${sitemapUrlToTry}`);
          break;
        }
      } catch (e) {
        console.warn(`Falha ao buscar sitemap em ${sitemapUrlToTry}:`, e.message);
      }
    }

    if (!foundSitemap) {
      await updateSiteStatus(supabaseClient, clientSiteId, 'failed', 'Sitemap não encontrado');
      throw new Error("Nenhum sitemap encontrado.");
    }
    await updateSiteProgress(supabaseClient, clientSiteId, 25, "Sitemap encontrado. Buscando chaves de API...");

    const { data: openaiApiDataArray, error: openaiApiError } = await supabaseClient.from('api_keys').select('api_key').eq('service_name', 'openai');

    if (openaiApiError) throw new Error(`Erro ao buscar API Key OpenAI: ${openaiApiError.message}`);
    if (!openaiApiDataArray || openaiApiDataArray.length === 0) throw new Error("API Key 'OpenAI (GPT-4, GPT-3.5, etc.)' não encontrada no banco de dados.");

    const openaiApiKey = openaiApiDataArray[0].api_key;

    const { data: semrushApiDataArray, error: semrushApiError } = await supabaseClient.from('api_keys').select('api_key').eq('service_name', 'semrush');

    if (semrushApiError) throw new Error(`Erro ao buscar API Key Semrush: ${semrushApiError.message}`);
    if (!semrushApiDataArray || semrushApiDataArray.length === 0) throw new Error("API Key 'SEMrush API' não encontrada no banco de dados.");

    const semrushApiKey = semrushApiDataArray[0].api_key;
    await updateSiteProgress(supabaseClient, clientSiteId, 40, "Chaves de API encontradas. Buscando dados de domínio...");

    const { data: promptData, error: promptError } = await supabaseClient.from('prompts').select('content').eq('name', 'Analisar Nicho').single();
    if (promptError) throw new Error(`Erro ao buscar prompt: ${promptError.message}`);
    if (!promptData) throw new Error("Prompt 'Analisar Nicho' não encontrado no banco de dados.");

    const fetchSemrushData = async (apiKey: string, siteUrl: string) => {
      const [rapidApiKey, rapidApiHost] = apiKey.split(',');

      if (!rapidApiKey || !rapidApiHost) {
        console.error('RapidAPI Key ou Host não fornecidos no formato esperado (key,host)');
        return null;
      }

      try {
        const headers = {
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': rapidApiHost,
          };
        const domainForApi = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
        const response = await fetch(`https://${rapidApiHost}/domain-metrics/${domainForApi}`, {
          method: 'GET',
          headers: headers,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Erro na API RapidAPI (${rapidApiHost}): ${response.status} - ${errorText}`);
          return null;
        }

        const data = await response.json();
        return {
          metrics: {
            organicKeywords: parseInt(data.ahrefsOrganicKeywords) || 0,
            organicTraffic: Math.round(parseFloat(data.ahrefsTraffic)) || 0,
            da: parseInt(data.mozDA) || 0,
            backlinks: parseInt(data.ahrefsBacklinks) || 0,
            ref_domains: parseInt(data.ahrefsRefDomains) || 0,
          },
          rawResponse: data,
          message: "Dados da RapidAPI obtidos com sucesso."
        };
      } catch (error) {
        console.error('Erro ao chamar a API RapidAPI:', error.message);
        return null;
      }
    };

    const semrushData = await fetchSemrushData(semrushApiKey, siteUrl);
    console.log('Semrush Data:', semrushData);
    await updateSiteProgress(supabaseClient, clientSiteId, 60, "Dados de domínio obtidos. Analisando nicho com IA...");

    const apiKey = openaiApiKey;
    const promptText = promptData.content.replace('{sitemap}', sitemapXml);

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "o1",
        messages: [{ role: "user", content: promptText }],
        
      }),
    });

    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      console.error(`Erro na API da IA - Corpo da Resposta: ${errorBody}`);
      throw new Error(`Erro na API da IA: ${errorBody}`);
    }

    const aiResult = await aiResponse.json();
    await updateSiteProgress(supabaseClient, clientSiteId, 80, "Nicho analisado. Finalizando...");
    
    let nichePrimary = null;
    let nicheSecondary = null;
    let nicheTertiary = null;

    if (aiResult.choices && aiResult.choices.length > 0 && aiResult.choices[0].message && aiResult.choices[0].message.content !== null) {
        const rawNiches = aiResult.choices[0].message.content.trim();
        const parsedNiches = rawNiches.split(',').map(n => n.trim());

        nichePrimary = parsedNiches[0] || null;
        nicheSecondary = parsedNiches[1] || null;
        nicheTertiary = parsedNiches[2] || null;
    } else {
        console.warn("Resposta da IA não contém nichos válidos ou está vazia.");
    }

    console.log(`Nichos recebidos: Primário: ${nichePrimary}, Secundário: ${nicheSecondary}, Terciário: ${nicheTertiary}`);

    // Fetch user_id and url before updating status
    const { data: clientSiteData, error: fetchClientSiteError } = await supabaseClient
      .from('client_sites')
      .select('user_id, url')
      .eq('id', clientSiteId)
      .single();

    if (fetchClientSiteError) throw new Error(`Erro ao buscar dados do client_site: ${fetchClientSiteError.message}`);

    const { error: updateError } = await supabaseClient.from('client_sites').update({
        niche_primary: nichePrimary,
        niche_secondary: nicheSecondary,
        niche_tertiary: nicheTertiary,
        da: semrushData?.metrics?.da || 0,
        backlinks: semrushData?.metrics?.backlinks || 0,
        ref_domains: semrushData?.metrics?.ref_domains || 0,
        organic_keywords: semrushData?.metrics?.organicKeywords || 0,
        status: 'active',
        progress_percent: 100,
        progress_log: 'Processo concluído!'
    }).eq('id', clientSiteId);
    if (updateError) throw new Error(`Erro ao salvar dados no DB: ${updateError.message}`);

    // Insert notification for site ready
    await supabaseClient.from('notifications').insert({
      user_id: clientSiteData.user_id,
      message: `Seu site ${clientSiteData.url} está pronto!`, 
      type: 'success',
    });

    console.log(`Processo concluído para o site ID ${clientSiteId}.`);

    return new Response(JSON.stringify({ message: "Site processado com sucesso!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('ERRO FATAL NA EXECUÇÃO:', error.message);
    if (clientSiteId) {
        try {
            const supabaseUrl = "https://uorwocetqyjkpioimrjk.supabase.co";
            const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
            if(serviceKey) {
                const supabaseForError = createClient(supabaseUrl, serviceKey);
                await updateSiteStatus(supabaseForError, clientSiteId, 'failed', error.message);
            }
        } catch (e) {
            console.error("Erro ao tentar atualizar status do site para falha:", e.message);
        }
    }
    return new Response(JSON.stringify({ error: { message: error.message, stack: error.stack } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

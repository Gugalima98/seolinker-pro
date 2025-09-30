import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { OpenAI } from 'https://esm.sh/openai@4.33.0';

// --- Global CORS Headers ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Max-Age': '86400'
};

// --- Helper function to upload image to WordPress ---
async function uploadImageToWordPress(imageUrl, networkSite, generatedTitle) {
  try {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error(`Failed to fetch image from ${imageUrl}: ${imageResponse.statusText}`);
      return null;
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageFileName = `image-${Date.now()}.jpg`; // Simple filename
    const cleanApiUrl = networkSite.api_url.endsWith('/') ? networkSite.api_url.slice(0, -1) : networkSite.api_url;
    const wpMediaApiUrl = `${cleanApiUrl}/media`;
    const credentials = btoa(`${networkSite.username}:${networkSite.application_password}`);
    const uploadResponse = await fetch(wpMediaApiUrl, {
      method: 'POST',
      headers: {
        'Content-Disposition': `attachment; filename="${imageFileName}"`, 
        'Content-Type': imageResponse.headers.get('content-type') || 'image/jpeg',
        'Authorization': `Basic ${credentials}`
      },
      body: imageBuffer
    });
    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.json();
      console.error(`WordPress Media Upload Error: ${uploadResponse.status} ${errorBody.message || 'Unknown error'}`);
      return null;
    }
    const media = await uploadResponse.json();
    console.log(`Image uploaded to WordPress. Media ID: ${media.id}`);
    return media.id;
  } catch (error) {
    console.error("Error uploading image to WordPress:", error.message);
    return null;
  }
}

// --- Main Function Handler ---
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let backlink_id = null;
  try {
    const body = await req.json();
    backlink_id = body.backlink_id || body.record?.id;
    if (!backlink_id) throw new Error("Backlink ID not found in request body.");
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid request body or missing backlink ID." }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  (async () => {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SERVICE_ROLE_KEY') ?? '');
    
    const updateBacklink = async (updates) => {
      if (backlink_id) {
        const { error } = await supabaseAdmin.from('backlinks').update(updates).eq('id', backlink_id);
        if (error) {
          console.error(`Failed to update backlink ${backlink_id}:`, error.message);
        }
      }
    };

    try {
      await updateBacklink({ status: 'processing', progress_percent: 10 });

      // --- ETAPA 1: BUSCA DE DADOS ESSENCIAIS ---
      const [backlinkRes, openAIKeyRes, pexelsKeyRes, titleIntroPromptRes, outlinePromptRes, sectionPromptRes] = await Promise.all([
        supabaseAdmin.from('backlinks').select('*').eq('id', backlink_id).single(),
        supabaseAdmin.from('api_keys').select('api_key').eq('service_name', 'openai').single(),
        supabaseAdmin.from('api_keys').select('api_key').eq('service_name', 'pexels').single(),
        supabaseAdmin.from('prompts').select('content').eq('name', 'TitleIntroGen').single(),
        supabaseAdmin.from('prompts').select('content').eq('name', 'OutlineGen').single(),
        supabaseAdmin.from('prompts').select('content').eq('name', 'SectionGen').single()
      ]);

      const errors = [];
      if (backlinkRes.error) errors.push(`Backlink not found: ${backlinkRes.error.message}`);
      if (openAIKeyRes.error) errors.push('OpenAI API key not found.');
      if (pexelsKeyRes.error) errors.push('Pexels API key not found.');
      if (titleIntroPromptRes.error) errors.push('Prompt \'TitleIntroGen\' not found.');
      if (outlinePromptRes.error) errors.push('Prompt \'OutlineGen\' not found.');
      if (sectionPromptRes.error) errors.push('Prompt \'SectionGen\' not found.');
      if (errors.length > 0) throw new Error(errors.join('; '));

      const backlink = backlinkRes.data;
      const openAIKey = openAIKeyRes.data.api_key;
      const pexelsKey = pexelsKeyRes.data.api_key;
      const titleIntroPromptTemplate = titleIntroPromptRes.data.content;
      const outlinePromptTemplate = outlinePromptRes.data.content;
      const sectionPromptTemplate = sectionPromptRes.data.content;

      const [clientSiteRes, networkSiteRes] = await Promise.all([
        supabaseAdmin.from('client_sites').select('niche_primary, niche_secondary, niche_tertiary').eq('id', backlink.client_site_id).single(),
        supabaseAdmin.from('network_sites').select('*').eq('id', backlink.network_site_id).single()
      ]);

      if (clientSiteRes.error) throw new Error(`Client site not found: ${clientSiteRes.error.message}`);
      if (networkSiteRes.error) throw new Error(`Network site not found: ${networkSiteRes.error.message}`);

      const clientSite = clientSiteRes.data;
      const networkSite = networkSiteRes.data;

      // --- ETAPA 2: GERAÇÃO DE TÍTULO E INTRODUÇÃO ---
      await updateBacklink({ progress_percent: 25 });
      const openai = new OpenAI({ apiKey: openAIKey });
      const titleIntroPrompt = titleIntroPromptTemplate.replace('{texto_ancora}', backlink.anchor_text).replace('{url_cliente}', backlink.target_url).replace('{nichos_cliente_primario}', clientSite.niche_primary || '').replace('{nichos_cliente_secundario}', clientSite.niche_secondary || '').replace('{nichos_cliente_terciario}', clientSite.niche_tertiary || '').replace('{nichos_rede_primario}', networkSite.primary_niche || '').replace('{nichos_rede_secundario}', networkSite.secondary_niche || '').replace('{nichos_rede_terciario}', networkSite.tertiary_niche || '') + `

Diretrizes adicionais:
- Retorne sua resposta em um formato JSON com três chaves: 'title', 'introduction' e 'slug'.
- O 'title' gerado NÃO deve ser o mesmo que o texto âncora.`;
      const aiCompletionTitleIntro = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: titleIntroPrompt }],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });
      let { title: generatedTitle, introduction: generatedIntroduction, slug: generatedSlug } = JSON.parse(aiCompletionTitleIntro.choices[0].message.content || '{}');
      if (!generatedTitle || !generatedIntroduction || !generatedSlug) throw new Error("AI failed to return title, introduction, or slug.");

      // --- ETAPA 3: GERAÇÃO DE OUTLINES ---
      await updateBacklink({ progress_percent: 40 });
      const outlinePrompt = outlinePromptTemplate.replace('{titulo_artigo}', generatedTitle).replace('{introducao_artigo}', generatedIntroduction).replace('{nichos_cliente_primario}', clientSite.niche_primary || '').replace('{nichos_cliente_secundario}', clientSite.niche_secondary || '').replace('{nichos_cliente_terciario}', clientSite.niche_tertiary || '').replace('{nichos_rede_primario}', networkSite.primary_niche || '').replace('{nichos_rede_secundario}', networkSite.secondary_niche || '').replace('{nichos_rede_terciario}', networkSite.tertiary_niche || '');
      const aiCompletionOutlines = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: outlinePrompt }],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });
      const generatedOutlines = (JSON.parse(aiCompletionOutlines.choices[0].message.content || '{}')).outlines;
      if (!generatedOutlines || generatedOutlines.length === 0) throw new Error("AI failed to return outlines.");
      const cleanedOutlines = generatedOutlines.map((o) => o.replace(/\*\*/g, '').replace(/^\s*\d+\.\s*/, '').replace(/:$/, '').trim());

      // --- ETAPA 4: GERAÇÃO ITERATIVA DO CONTEÚDO DAS SEÇÕES ---
      await updateBacklink({ progress_percent: 70 });
      const sectionPromises = cleanedOutlines.map((outline) => {
        const sectionPrompt = sectionPromptTemplate.replace('{titulo_artigo}', generatedTitle).replace('{introducao_artigo}', generatedIntroduction).replace('{secoes_anteriores}', '').replace('{outline_atual}', outline).replace('{texto_ancora}', backlink.anchor_text).replace('{url_cliente}', '').replace('{nichos_cliente_primario}', clientSite.niche_primary || '').replace('{nichos_cliente_secundario}', clientSite.niche_secondary || '').replace('{nichos_cliente_terciario}', clientSite.niche_tertiary || '').replace('{nichos_rede_primario}', networkSite.primary_niche || '').replace('{nichos_rede_secundario}', networkSite.secondary_niche || '').replace('{nichos_rede_terciario}', networkSite.tertiary_niche || '')
        + `

REQUISITO OBRIGATÓRIO: Você DEVE incluir a frase exata "${backlink.anchor_text}" em algum lugar no conteúdo que você gerar. É mandatório.`;
        return openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: sectionPrompt }], temperature: 0.7 });
      });
      const settledSections = await Promise.allSettled(sectionPromises);

      // --- ETAPA 5: GERAÇÃO DE PALAVRA-CHAVE PARA IMAGEM E BUSCA NO PEXELS ---
      await updateBacklink({ progress_percent: 80 });
      const imageKeywordPrompt = `Based on the article title "${generatedTitle}", provide a single, concise, English search query for a stock photo website. Return only the search query.`;
      const aiCompletionImageKeyword = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: imageKeywordPrompt }], temperature: 0.2 });
      const imageKeyword = aiCompletionImageKeyword.choices[0].message.content?.trim().replace(/"/g, '') || generatedTitle;
      let imageUrls = [];
      const numImagesToFetch = Math.min(Math.ceil(cleanedOutlines.length / 4), 5);
      if (numImagesToFetch > 0) {
        const pexelsResponse = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(imageKeyword)}&per_page=${numImagesToFetch}`, { headers: { Authorization: pexelsKey } });
        if (pexelsResponse.ok) {
          const pexelsData = await pexelsResponse.json();
          if (pexelsData.photos && pexelsData.photos.length > 0) imageUrls = pexelsData.photos.map((p) => p.src.large);
        }
      }

      // --- ETAPA 6: MONTAGEM FINAL DO ARTIGO E INSERÇÃO DE LINK ---
      let fullArticleContent = `<p>${generatedIntroduction}</p>

`;
      let linkInserted = false;
      const targetUrl = backlink.target_url.startsWith('http') ? backlink.target_url : `https://${backlink.target_url}`;
      const linkHtml = `<a href="${targetUrl}" target="_blank">${backlink.anchor_text}</a>`;
      if (fullArticleContent.includes(backlink.anchor_text)) {
        fullArticleContent = fullArticleContent.replace(backlink.anchor_text, linkHtml);
        linkInserted = true;
      }
      let imageCounter = 0;
      for (let i = 0; i < cleanedOutlines.length; i++) {
        const outline = cleanedOutlines[i];
        let sectionContent = settledSections[i].status === 'fulfilled' ? settledSections[i].value.choices[0].message.content : null;
        
        fullArticleContent += `<h2>${outline}</h2>

`;

        if ((i + 1) % 4 === 0 && imageUrls.length > imageCounter) {
          fullArticleContent += `<img src="${imageUrls[imageCounter++]}" alt="${imageKeyword}" style="width:100%; height:auto; margin: 20px 0;"/>

`;
        }

        if (sectionContent) {
          if (!linkInserted && sectionContent.includes(backlink.anchor_text)) {
            sectionContent = sectionContent.replace(backlink.anchor_text, linkHtml);
            linkInserted = true;
          }
          fullArticleContent += `<p>${sectionContent.replace(/\n/g, '</p><p>')}</p>

`;
        }
      }
      if (!linkInserted) {
        const paragraphs = fullArticleContent.split('</p>');
        const middleParagraphIndex = Math.floor(paragraphs.length / 2);
        if (paragraphs[middleParagraphIndex]) {
          paragraphs[middleParagraphIndex] += ` Para mais informações, confira ${linkHtml}.`;
          fullArticleContent = paragraphs.join('</p>');
        }
      }

      // --- ETAPA 7: POSTAGEM NO WORDPRESS ---
      await updateBacklink({ progress_percent: 95 });
      const cleanApiUrl = networkSite.api_url.endsWith('/') ? networkSite.api_url.slice(0, -1) : networkSite.api_url;
      const wpApiUrl = `${cleanApiUrl}/posts`;
      const credentials = btoa(`${networkSite.username}:${networkSite.application_password}`);
      let featuredMediaId = null;
      if (imageUrls.length > 0) {
        featuredMediaId = await uploadImageToWordPress(imageUrls[0], networkSite, generatedTitle);
        if (featuredMediaId) imageUrls.shift();
      }
      const wpResponse = await fetch(wpApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
        body: JSON.stringify({ title: generatedTitle, content: fullArticleContent, status: 'publish', slug: generatedSlug, featured_media: featuredMediaId })
      });
      if (!wpResponse.ok) {
        const errorBody = await wpResponse.json();
        throw new Error(`WordPress API Error: ${wpResponse.status} ${errorBody.message || 'Unknown error'}`);
      }
      const newPost = await wpResponse.json();

      // --- ETAPA 8: ATUALIZAÇÃO DE STATUS E SALVAMENTO DA URL ---
      await updateBacklink({
        status: 'live',
        post_url: newPost.link,
        article_title: generatedTitle,
        wp_post_id: newPost.id,
      });

      // Insert notification for successful backlink posting
      await supabaseAdmin.from('notifications').insert({
        user_id: backlink.user_id,
        message: `Seu backlink para ${backlink.target_url} foi publicado com sucesso!`,
        type: 'success',
      });

    } catch (err) {
      console.error(`Error processing backlink ${backlink_id}:`, err.message);
      await updateBacklink({ status: 'error', progress_percent: 0 });
    }
  })();

  return new Response(JSON.stringify({ message: "Processing started in background." }), {
    status: 202,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

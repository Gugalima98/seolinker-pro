import { createClient } from 'supabase-js';
import { corsHeaders } from 'common/cors.ts';
import Papa from 'papaparse';
import Stripe from 'stripe';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SERVICE_ROLE_KEY') ?? ''
);

// Função principal
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Autenticação e validação de admin
    // ... (código de verificação de admin omitido por brevidade, mas deve ser implementado)

    // O corpo da requisição agora contém as linhas pré-processadas pelo cliente
    const { dataType, rows } = await req.json();
    if (!dataType || !rows || !Array.isArray(rows)) {
      throw new Error("dataType e um array de rows são obrigatórios.");
    }

    if (rows.length === 0) {
      return new Response(JSON.stringify({ message: "Lote vazio, nada a processar." }), { status: 200 });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Mapa de IDs de plano para IDs de preço do Stripe
    const priceMap: { [key: string]: string } = {
      'starter': 'price_1S3PvoDssGMGr4ApVHjLcKBy',
      'pro': 'price_1S3PwCDssGMGr4ApXhYzENaK',
      'agency': 'price_1S3PwdDssGMGr4ApVu7rU8kB',
      'legacy': 'price_1S3fgvDssGMGr4Ap2KNREK4i',
      'legacy-club': 'price_1S3finDssGMGr4ApW7wWdEOK',
      'club': 'price_1S3Py1DssGMGr4Ap4qGHNR88',
    };

    // 3. Lógica de importação baseada no dataType
    switch (dataType) {
      case 'users':
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() });

        for (const row of rows) {
          try {
            if (!row.email) throw new Error('Coluna \'email\' é obrigatória.');

            let userId: string;
            let userEmail: string = row.email;

            const { data: existingUsers, error: findError } = await supabaseAdmin.rpc('get_user_by_email', { p_email: row.email });
            if (findError) throw findError;
            const existingUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

            if (existingUser) {
              userId = existingUser.id;
            } else {
              const { data: newUserResponse, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: row.email,
                password: '8links@123', // Usa a senha padrão definida
                email_confirm: true,
              });
              if (createError) throw createError;
              userId = newUserResponse.user.id;
            }

            await supabaseAdmin.from('profiles').update({ 
                role: row.role || 'client', 
                name: row.name 
            }).eq('id', userId);

            if (row.plan_id && priceMap[row.plan_id]) {
              const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
              if (profileError) throw profileError;

              // VERIFICAÇÃO DE SEGURANÇA: Pula se já tiver uma assinatura ativa ou em trial
              const activeStatuses = ['active', 'trialing'];
              if (profile.subscription_status && activeStatuses.includes(profile.subscription_status)) {
                errors.push(`Linha ${successCount + errorCount + 1}: Usuário ${userEmail} já possui uma assinatura ativa (${profile.subscription_status}). Criação de assinatura pulada.`);
                successCount++; // Conta como sucesso, pois o usuário foi processado conforme a regra
                continue; // Pula para o próximo usuário
              }

              let customerId = profile.stripe_customer_id;
              if (!customerId) {
                const customer = await stripe.customers.create({ 
                  email: userEmail, 
                  metadata: { supabase_user_id: userId }
                });
                customerId = customer.id;
                await supabaseAdmin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
              }

              const priceId = priceMap[row.plan_id];
              const subscriptionParams: Stripe.SubscriptionCreateParams = {
                customer: customerId, // Corrigido para usar customerId
                items: [{ price: priceId }],
                expand: ['latest_invoice.payment_intent'],
                payment_behavior: 'default_incomplete',
                collection_method: 'charge_automatically',
              };
              if (row.trial_end_date) {
                const trialEndTimestamp = Math.floor(new Date(row.trial_end_date).getTime() / 1000);
                subscriptionParams.trial_end = trialEndTimestamp;
              }
              const subscription = await stripe.subscriptions.create(subscriptionParams);

              await supabaseAdmin.from('profiles').update({
                stripe_subscription_id: subscription.id,
                plan_id: row.plan_id,
                subscription_status: subscription.status,
                subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              }).eq('id', userId);
            }

            successCount++;
          } catch (e) {
            errorCount++;
            errors.push(`Linha ${successCount + errorCount} (Email: ${row.email}): ${e.message}`);
          }
        }
        break;

      case 'client_sites':
        for (const row of rows) {
          try {
            if (!row.user_email || !row.site_url) throw new Error('Colunas \'user_email\' e \'site_url\' são obrigatórias.');
            
            const normalizedEmail = row.user_email.trim().toLowerCase();

            // Lógica para encontrar ou criar o usuário (consistente com process-backlinks-to-review)
            let userId = null;
            const { data: listUsersData, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({
                query: normalizedEmail,
                perPage: 1,
                page: 1,
            });

            let foundUserInAuth = null;
            if (!listUsersError && listUsersData?.users && listUsersData.users.length > 0) {
                foundUserInAuth = listUsersData.users[0];
            }

            if (listUsersError || !foundUserInAuth) {
              const randomPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
              const { data: newUser, error: createAuthUserError } = await supabaseAdmin.auth.admin.createUser({
                email: normalizedEmail,
                password: randomPassword,
                email_confirm: true,
              });

              if (createAuthUserError || !newUser) {
                throw new Error(`Falha ao criar usuário ${normalizedEmail}: ${createAuthUserError?.message || "Erro desconhecido"}`);
              }
              userId = newUser.user.id;
            } else {
              userId = foundUserInAuth.id;
            }
            
            // Limpa a URL para remover protocolo, www e barra final, e pega só o domínio
            const cleanedUrl = row.site_url
              .replace(/^https?:\/\//, '') 
              .replace(/^www\./, '')
              .replace(/\/$/, '')
              .toLowerCase();

            const newSiteData = {
              user_id: userId,
              url: cleanedUrl, // Usa a URL padronizada
              type: row.site_type || 'unknown', // Default type para 'unknown'
              da: parseInt(row.da) || 0,
              backlinks: parseInt(row.backlinks) || 0,
              ref_domains: parseInt(row.ref_domains) || 0,
              organic_keywords: parseInt(row.organic_keywords) || 0,
              status: 'active', // As métricas são manuais, então o site já fica ativo
              niche_primary: row.niche_primary,
              niche_secondary: row.niche_secondary,
              niche_tertiary: row.niche_tertiary,
            };

            // Usa upsert para evitar duplicatas e atualizar se já existir
            const { error } = await supabaseAdmin.from('client_sites').upsert(newSiteData, {
                onConflict: 'user_id,url', // Conflito na chave composta
                ignoreDuplicates: false, // Atualiza se houver conflito
            });
            if (error) throw error;
            successCount++;
          } catch (e) {
            errorCount++;
            errors.push(`Linha ${successCount + errorCount}: ${e.message}`);
          }
        }
        break;

      case 'network_sites':
        for (const row of rows) {
          try {
            if (!row.domain) throw new Error('Coluna \'domain\' é obrigatória.');
            
            const cleanedDomain = row.domain
              .replace(/^https?:\/\//, '')
              .replace(/^www\./, '')
              .replace(/\/$/, '');

            const newSiteData = {
              domain: cleanedDomain,
              api_url: row.api_url,
              username: row.username,
              application_password: row.application_password,
              primary_niche: row.primary_niche,
              secondary_niche: row.secondary_niche,
              tertiary_niche: row.tertiary_niche,
              da: parseInt(row.da) || 0,
              domain_age: parseInt(row.domain_age) || 0,
            };

            const { error } = await supabaseAdmin.from('network_sites').insert(newSiteData);
            if (error) throw error;
            successCount++;
          } catch (e) {
            errorCount++;
            errors.push(`Linha ${successCount + errorCount}: ${e.message}`);
          }
        }
        break;

      case 'backlinks':
        console.log('Iniciando importação de backlinks com lógica avançada...');
        // Monta mapas para consulta rápida
        console.log('Mapeando sites de clientes, sites da rede e usuários...');
        const { data: clientSites } = await supabaseAdmin.from('client_sites').select('id, url');
        const clientSiteUrlToId = new Map((clientSites || []).map(s => [s.url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, ''), s.id]));

        const { data: networkSites } = await supabaseAdmin.from('network_sites').select('id, domain');
        const networkSiteDomainToId = new Map((networkSites || []).map(s => [s.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, ''), s.id]));
        
        // Busca o ID do site placeholder
        const { data: placeholderSite, error: placeholderError } = await supabaseAdmin
          .from('network_sites')
          .select('id')
          .eq('domain', 'https://site-nao-encontrado.com')
          .single();

        if (placeholderError || !placeholderSite) {
          throw new Error("O site de rede placeholder 'site-nao-encontrado.com' não foi encontrado. Crie-o manualmente na tabela network_sites.");
        }
        const placeholderNetworkSiteId = placeholderSite.id;

        let allUsers = [];
        let page = 1;
        while (true) {
          const { data: { users: userPage }, error: userError } = await supabaseAdmin.auth.admin.listUsers({ page: page, perPage: 1000 });
          if (userError) throw new Error(`Erro ao listar usuários: ${userError.message}`);
          allUsers = allUsers.concat(userPage);
          if (userPage.length < 1000) break;
          page++;
        }
        const userEmailToId = new Map(allUsers.map(u => [u.email.trim().toLowerCase(), u.id]));
        console.log('Mapeamento concluído.');

        let skippedCount = 0;

        for (const [index, row] of rows.entries()) {
          console.log(`[${index + 1}/${rows.length}] Processando linha para ${row.user_email}...`);
          try {
            if (!row.client_site_url || !row.user_email) {
              throw new Error('Colunas client_site_url e user_email são obrigatórias.');
            }

            const normalizedEmail = row.user_email.trim().toLowerCase();
            const userId = userEmailToId.get(normalizedEmail);
            if (!userId) throw new Error(`Usuário com email ${row.user_email} não encontrado.`);

            const normalizedClientSiteUrl = row.client_site_url
              .replace(/^https?:\/\//, '') 
              .replace(/^www\./, '')
              .replace(/\/$/, '')
              .toLowerCase();

            // Lógica para encontrar ou criar o site do cliente
            let clientSiteId = clientSiteUrlToId.get(normalizedClientSiteUrl);
            if (!clientSiteId) {
              console.log(`  -> Site de cliente '${normalizedClientSiteUrl}' não encontrado. Criando...`);
              const { data: newClientSite, error: createError } = await supabaseAdmin
                .from('client_sites')
                .insert({
                  user_id: userId,
                  url: normalizedClientSiteUrl,
                  status: 'active',
                  type: 'unknown', // Default type changed to 'unknown'
                })
                .select('id')
                .single();
              
              if (createError) throw new Error(`Falha ao criar site de cliente: ${createError.message}`);
              
              clientSiteId = newClientSite.id;
              clientSiteUrlToId.set(normalizedClientSiteUrl, clientSiteId); // Adiciona ao mapa para evitar recriação no mesmo lote
              console.log(`  -> Site de cliente criado com ID: ${clientSiteId}`);
            }

            // Lógica para encontrar ou usar placeholder para o site da rede
            const normalizedNetworkSiteDomain = row.network_site_domain
              .replace(/^https?:\/\//, '')
              .replace(/^www\./, '')
              .replace(/\/$/, '')
              .toLowerCase();

            let networkSiteId = networkSiteDomainToId.get(normalizedNetworkSiteDomain);
            if (!networkSiteId) {
              console.log(`  -> AVISO: Site da rede '${row.network_site_domain}' não encontrado. Usando placeholder.`);
              networkSiteId = placeholderNetworkSiteId;
            }

            // Verifica se o backlink já existe para evitar duplicatas
            const { data: existing, error: selectError } = await supabaseAdmin
              .from('backlinks')
              .select('id')
              .eq('user_id', userId)
              .eq('client_site_id', clientSiteId)
              .eq('network_site_id', networkSiteId)
              .eq('target_url', row.target_url)
              .eq('article_title', row.article_title)
              .eq('created_at', row.created_at) // Adiciona verificação de data
              .limit(1);

            if (selectError) throw selectError;

            if (existing && existing.length > 0) {
              console.log('  -> AVISO: Backlink já existe. Pulando.');
              skippedCount++;
              continue;
            }

            const { error } = await supabaseAdmin.from('backlinks').insert({
              user_id: userId,
              client_site_id: clientSiteId,
              network_site_id: networkSiteId,
              target_url: row.target_url,
              anchor_text: row.anchor_text,
              status: 'publicado',
              article_title: row.article_title,
              created_at: row.created_at,
            });
            
            if (error) throw error;
            
            console.log('  -> SUCESSO: Backlink inserido.');
            successCount++;

          } catch (e) {
            console.error(`  -> ERRO FATAL na linha ${index + 1}:`, e.message);
            errorCount++;
            errors.push(`Linha ${index + 1}: ${e.message}`);
          }
        }
        
        console.log('Processamento do lote concluído.');
        return new Response(JSON.stringify({
          message: `Importação concluída. ${skippedCount} registros foram pulados por já existirem.`,
          successCount,
          errorCount,
          errors
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });

      case 'review_backlinks':
        console.log('Iniciando importação de backlinks para revisão...');
        const reviewData = rows.map(row => ({
          user_email: row.user_email,
          network_site_domain: row.network_site_domain,
          article_title: row.article_title,
          wp_post_id_original: row.wp_post_id_original,
          original_created_at: row.created_at,
        }));

        const { error: reviewInsertError } = await supabaseAdmin
          .from('backlinks_to_review')
          .insert(reviewData);

        if (reviewInsertError) {
          throw new Error(`Erro ao inserir backlinks para revisão: ${reviewInsertError.message}`);
        }

        successCount = reviewData.length;
        console.log(`${successCount} registros inseridos para revisão.`);
        break;

      default:
        throw new Error(`Tipo de dado inválido: ${dataType}`);
    }

    return new Response(JSON.stringify({
      message: "Importação concluída.",
      successCount,
      errorCount,
      errors
    }), {
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

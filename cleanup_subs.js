const Stripe = require('stripe');
const fs = require('fs');

// --- CONFIGURAÇÃO ---
// Cole aqui a chave secreta da sua NOVA conta do Stripe
const NEW_STRIPE_SECRET_KEY = "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";
// --- FIM DA CONFIGURAÇÃO ---

const stripe = new Stripe(NEW_STRIPE_SECRET_KEY);

async function cleanupDuplicateSubscriptions() {
    console.log('Iniciando script de limpeza de assinaturas duplicadas...');
    const logOutput = [];

    try {
        for await (const customer of stripe.customers.list({ limit: 100 })) {
            console.log(`Verificando cliente: ${customer.email} (${customer.id})`);

            const subscriptions = await stripe.subscriptions.list({
                customer: customer.id,
                status: 'all', // Pega todas para filtrar depois
            });

            const activeOrTrialingSubs = subscriptions.data.filter(sub => 
                ['active', 'trialing'].includes(sub.status)
            );

            if (activeOrTrialingSubs.length > 1) {
                console.log(` -> ENCONTRADA DUPLICATA! Cliente ${customer.email} tem ${activeOrTrialingSubs.length} assinaturas ativas/trialing.`);
                logOutput.push(`Cliente: ${customer.email} (${customer.id})`);

                // Ordena da mais antiga para a mais nova
                activeOrTrialingSubs.sort((a, b) => a.created - b.created);

                // A primeira da lista é a mais antiga, que vamos manter
                const subscriptionToKeep = activeOrTrialingSubs.shift();
                console.log(` -> Mantendo a assinatura mais antiga: ${subscriptionToKeep.id}`);
                logOutput.push(`  - Assinatura Mantida: ${subscriptionToKeep.id}`);

                // As restantes são duplicatas e serão canceladas
                for (const subToCancel of activeOrTrialingSubs) {
                    try {
                        console.log(` -> Cancelando assinatura duplicada: ${subToCancel.id}...`);
                        await stripe.subscriptions.cancel(subToCancel.id);
                        console.log(` -> ...Cancelada com sucesso.`);
                        logOutput.push(`  - Assinatura Cancelada: ${subToCancel.id}`);
                    } catch (cancelError) {
                        console.error(` -> ERRO ao cancelar a assinatura ${subToCancel.id}:`, cancelError.message);
                        logOutput.push(`  - FALHA ao cancelar a assinatura ${subToCancel.id}: ${cancelError.message}`);
                    }
                }
            }
        }

        if (logOutput.length > 0) {
            fs.writeFileSync('cleanup_log.txt', logOutput.join('\n'));
            console.log('\nLimpeza concluída! Um log detalhado foi salvo em `cleanup_log.txt`.\nPor favor, verifique o log e seu painel do Stripe para confirmar as ações.');
        } else {
            console.log('\nNenhuma assinatura duplicada encontrada. Tudo certo!');
        }

    } catch (error) {
        console.error('Ocorreu um erro fatal durante a limpeza:', error.message);
    }
}

cleanupDuplicateSubscriptions();

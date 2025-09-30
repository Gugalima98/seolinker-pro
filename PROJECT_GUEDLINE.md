
Passo 0: Estrutura do Projeto e Configuração Inicial
Antes de começar, vamos definir uma estrutura de pastas que irá organizar seu projeto.
code Code
downloadcontent_copy
expand_less

    /src
|-- /assets           # Imagens, fontes, etc.
|-- /components       # Componentes reutilizáveis (Botão, Card, Modal)
|-- /data             # Nossos dados fictícios (mocks)
|   |-- users.js
|   |-- clientSites.js
|   |-- backlinks.js
|   |-- networkSites.js
|   |-- courses.js
|   |-- tickets.js
|-- /layouts          # Estrutura principal da página (ex: AppLayout, AdminLayout)
|-- /router           # Configuração de rotas (ex: index.js)
|-- /views (ou /pages)# As telas completas da sua aplicação
|   |-- /app          # Telas do usuário normal
|   |-- /admin        # Telas do painel de admin
|-- main.js           # Ponto de entrada da aplicação
  
Cores:
* Branco: #FFFFFF
* Laranja Principal: #FA6601
* Tons de cinza para textos e fundos secundários.

Parte 1: Construindo a Aplicação do Cliente
Usaremos um AppLayout que terá o menu de navegação principal para o cliente e um espaço para renderizar o conteúdo da página atual.
Sistema 1: Cadastro e Gerenciamento de Sites
1.1. Mock Data (/data/clientSites.js)
code JavaScript
downloadcontent_copy
expand_less
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END
    export const mockClientSites = [
  {
    id: 1,
    url: 'meublogdenichox.com',
    niche: 'Marketing Digital',
    type: 'Blog de Afiliado',
    metrics: { da: 35, backlinks: 1200, refDomains: 150, organicKeywords: 850 },
    rankingPages: [
      { page: '/melhores-ferramentas-seo', keyword: 'ferramentas de seo', position: 3 },
      { page: '/como-ganhar-dinheiro-online', keyword: 'ganhar dinheiro online', position: 5 },
    ]
  },
  // ...outros sites
];
  
1.2. Telas (Views)
* SitesDashboard.vue:
    * Mostra uma grade ou lista de SiteCard.
    * Tem um botão "Cadastrar Novo Site" que leva para a próxima tela.
* SiteDetails.vue:
    * Acessada ao clicar em um SiteCard.
    * Mostra todas as informações de um site específico do mock.
    * Usa um componente MetricsDisplay para exibir DA, backlinks, etc.
    * Usa um componente RankingTable para listar as rankingPages.
* AddNewSiteFlow.vue: Um fluxo de múltiplas etapas.
    * Etapa 1: Um campo de input para o usuário digitar a URL do site. Um botão "Analisar".
    * Etapa 2 (Simulação): Mostra um loading spinner e depois exibe um nicho sugerido (ex: "Nicho sugerido: Finanças"). Abaixo, um seletor para o usuário escolher o tipo de site (Blog de Afiliado, E-commerce, etc.).
    * Etapa 3 (Confirmação): Mostra um resumo e um botão "Cadastrar Site". Ao clicar, redireciona para a SitesDashboard.
1.3. Componentes Reutilizáveis
* SiteCard.vue: Um card que mostra a URL do site, o nicho e talvez uma ou duas métricas principais. É clicável.
* MetricsDisplay.vue: Um componente que recebe as métricas e as exibe de forma organizada.
* RankingTable.vue: Uma tabela que exibe as páginas, palavras-chave e posições.

Sistema 2: Criação de Backlinks
2.1. Mock Data (/data/backlinks.js)
code JavaScript
downloadcontent_copy
expand_less
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END
    export const mockBacklinks = [
  {
    id: 101,
    clientSiteUrl: 'meublogdenichox.com',
    targetUrl: '/melhores-ferramentas-seo',
    anchorText: 'melhores ferramentas de SEO',
    networkSiteUrl: 'expertsdeseo.com',
    status: 'Publicado', // Outros status: 'Criando Conteúdo', 'Aguardando Aprovação'
    creationDate: '2025-09-10',
  },
  // ...outros backlinks
];
  
2.2. Telas (Views)
* BacklinksList.vue:
    * A tela principal do sistema.
    * Usa mockBacklinks para renderizar uma lista ou tabela de backlinks.
    * Contém filtros (dropdowns) por site e por status.
    * Tem um botão "Criar Novo Backlink" que abre o CreateBacklinkModal.
* BacklinkSuggestion.vue:
    * Acessada após preencher o modal.
    * Mostra uma lista de NetworkSiteCard (sites da sua rede) que são contextuais.
    * Cada card tem um botão "Escolher este site".
2.3. Componentes
* BacklinkListItem.vue: Um item na lista, mostrando o site de destino, o texto âncora, o status (com uma cor diferente) e a data.
* CreateBacklinkModal.vue: Um modal com:
    * Dropdown para selecionar um dos sites cadastrados (mockClientSites).
    * Input para a URL de destino.
    * Input para o texto âncora.
* NetworkSiteCard.vue: Mostra informações de um site da sua rede (DA, nicho, etc.) para o cliente escolher.
* StatusBadge.vue: Um pequeno componente visual para exibir o status do backlink com cores (ex: Verde para 'Publicado', Azul para 'Criando', Amarelo para 'Aguardando Aprovação').

Sistemas 3, 4, 5 e 6 (Club, Ranking, Afiliados, Suporte, Configurações)
A lógica é a mesma. Vou resumir as telas e os dados fictícios necessários:
* Sistema Club:
    * Mock Data: courses.js com lista de cursos, módulos e aulas.
    * Telas: ClubDashboard.vue (lista de cursos), CourseView.vue (player de vídeo e lista de aulas).
* Sistema de Ranking:
    * Mock Data: users.js com nome, foto e contagem de backlinks de cada usuário.
    * Tela: RankingPage.vue mostrando uma tabela/lista ordenada dos usuários.
* Sistema de Afiliados:
    * Mock Data: Um objeto para o afiliado logado com estatísticas (cliques, vendas, comissão).
    * Tela: AffiliateDashboard.vue com gráficos e números fictícios.
* Sistema de Suporte:
    * Mock Data: tickets.js com uma lista de tickets (assunto, status, última atualização).
    * Telas: TicketsList.vue, TicketDetails.vue (mostra a conversa).
* Sistema de Configurações:
    * Tela: Settings.vue com uma estrutura de abas (Tabs.vue).
    * Componentes: ProfileSettings.vue, SubscriptionSettings.vue.

Parte 2: Construindo o Painel Administrativo
Aqui, você criará um AdminLayout que terá um menu lateral diferente. A rota para o painel de admin pode ser /admin/*.
Mock Data para o Admin
Você usará os mesmos arquivos de mock, mas as telas de admin terão mais poder (editar, excluir).
Itens do Menu do Admin
1. Dashboard (AdminDashboard.vue):
    * Mostra cards com números totais: "Total de Usuários", "Total de Sites de Clientes", "Backlinks Criados este Mês", "Tickets Abertos".
    * Pode ter gráficos fictícios.
2. Gerenciamento de Usuários (AdminUserManagement.vue):
    * Uma tabela completa com todos os usuários do users.js.
    * Cada linha tem botões de "Editar" e "Excluir".
    * Um botão "Adicionar Usuário" abre um modal para criar um novo usuário (que só será adicionado aos dados fictícios na memória do navegador).
3. Gerenciamento de Sites da Rede (AdminNetworkSites.vue):
    * Mock Data: networkSites.js com DA, nicho, URL, etc.
    * Tabela com todos os sites da sua rede.
    * Funcionalidades de CRUD (Create, Read, Update, Delete) para esses sites.
4. Gerenciamento de Cursos (AdminCourses.vue):
    * Interface para ver, adicionar, editar e excluir cursos, módulos e aulas do courses.js. Pode ser uma visualização em árvore.
5. Sites dos Clientes (AdminClientSitesView.vue):
    * Uma tabela com todos os sites de todos os clientes (clientSites.js).
    * Permite ao admin ver detalhes de cada site, mas talvez não editar.
6. Logs da Plataforma (AdminLogs.vue):
    * Mock Data: logs.js com [{ timestamp, level: 'INFO', message: 'Usuário X criou o backlink Y' }].
    * Tela simples que mostra uma lista de logs fictícios.
7. Configuração de APIs (AdminApis.vue):
    * Uma tela com campos de formulário para chaves de API fictícias (ex: "API da Ahrefs", "API da OpenAI").

Como Fazer Tudo Funcionar com Dados Fictícios
1. Importação Direta: Em cada página, importe o arquivo de mock necessário. code JavaScriptdownloadcontent_copy expand_less IGNORE_WHEN_COPYING_START IGNORE_WHEN_COPYING_END     // Em BacklinksList.vue
2. import { mockBacklinks } from '@/data/backlinks.js';
3.       
4. Simulando Ações:
    * Criação: Quando o admin adiciona um novo usuário, use JavaScript para dar um push no array de mockUsers. A interface será atualizada automaticamente (se estiver usando um framework reativo).
    * Deleção: Use filter para remover um item do array.
    * Navegação: Use o sistema de rotas do seu framework (vue-router, react-router) para navegar entre as páginas. Por exemplo, ao clicar em "Criar Novo Backlink" e preencher o modal, use router.push('/backlinks/suggest').
    * Loading: Para simular chamadas de API, você pode usar setTimeout. code JavaScriptdownloadcontent_copy expand_less IGNORE_WHEN_COPYING_START IGNORE_WHEN_COPYING_END     // Ao cadastrar um site
    * this.isLoading = true;
    * setTimeout(() => {
    *   this.isLoading = false;
    *   // Navega para a próxima página
    * }, 2000); // Simula um delay de 2 segundos
    *  

Parte 3: Efeitos Visuais e Dashboards Dinâmicas
Para dar vida à interface, especialmente nas dashboards, usaremos uma combinação de transições CSS e uma biblioteca de gráficos.
3.1. Animações e Transições na Interface (Microinterações)
* Hover em Botões e Cards: Adicione transições suaves. Por exemplo, quando o usuário passar o mouse sobre um card de site, ele pode levantar um pouco e ter uma sombra mais pronunciada. code CSSdownloadcontent_copy expand_less      .site-card {
*   transition: all 0.3s ease-in-out;
* }
* .site-card:hover {
*   transform: translateY(-5px);
*   box-shadow: 0 10px 20px rgba(0,0,0,0.1);
* }
*       
* Transições de Página: Ao navegar entre as telas, o conteúdo pode aparecer com um efeito de fade-in. Se estiver usando Vue, o componente <transition> é perfeito para isso. No React, bibliotecas como Framer Motion são excelentes.
* Skeleton Loaders: Quando a aplicação simula o carregamento de dados (como as métricas de um site), em vez de um simples spinner, mostre "esqueletos" da interface. São placeholders cinzas e animados que imitam a forma do conteúdo que está para ser carregado. Isso melhora muito a percepção de velocidade.
3.2. Dashboards com Gráficos (Cliente e Admin)
Vamos usar uma biblioteca como a Chart.js ou ApexCharts para criar gráficos interativos.
* Mock Data para Gráficos (/data/dashboardCharts.js): code JavaScriptdownloadcontent_copy expand_less IGNORE_WHEN_COPYING_START IGNORE_WHEN_COPYING_END     export const backlinkGrowthData = {
*   labels: ['Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro'],
*   datasets: [{
*     label: 'Backlinks Criados',
*     data: [12, 19, 25, 32, 40, 55],
*     borderColor: '#fa6601',
*     backgroundColor: 'rgba(250, 102, 1, 0.1)',
*     fill: true,
*     tension: 0.4
*   }]
* };
*       
* Dashboard do Cliente (SiteDetails.vue):
    * Além de mostrar as métricas (DA, etc.), adicione um gráfico de linhas mostrando o crescimento de "Palavras-Chave Orgânicas" ou "Ref. Domains" ao longo do tempo.
* Dashboard do Admin (AdminDashboard.vue):
    * Cards com Contagem Animada: Para os números totais (Usuários, Sites, etc.), faça-os contar do zero até o número final quando a página carregar. Bibliotecas como CountUp.js facilitam isso.
    * Gráficos Principais:
        * Um gráfico de barras mostrando "Novos Usuários por Mês".
        * Um gráfico de pizza mostrando a "Distribuição de Tipos de Site" (Blog de Afiliado, E-commerce, etc.).
        * Um gráfico de linhas mostrando "Backlinks Criados na Plataforma por Dia".

Parte 4: Sistema de Autenticação (Login e Registro)
Criaremos as telas de login e o fluxo para diferenciar um usuário comum de um administrador, tudo com dados fictícios.
4.1. Novas Telas (Views)
* Login.vue: Uma página com um design limpo, o logo da ferramenta e campos para email e senha. Inclui um link para "Esqueceu a senha?" e "Criar conta".
* Register.vue: Formulário para cadastro de novos usuários.
* ForgotPassword.vue: Campo para o usuário inserir o email e simular o envio de um link de recuperação.
4.2. Lógica de Autenticação Fictícia
Não teremos um backend real, então vamos simular o login usando o localStorage do navegador e um estado global simples.
1. Mock de Usuários (/data/users.js): code JavaScriptdownloadcontent_copy expand_less IGNORE_WHEN_COPYING_START IGNORE_WHEN_COPYING_END     export const mockUsers = [
2.   { id: 1, email: 'cliente@email.com', password: '123', role: 'client' },
3.   { id: 2, email: 'admin@email.com', password: 'admin', role: 'admin' },
4.   // ...outros usuários
5. ];
6.       
7. Fluxo de Login:
    * O usuário preenche cliente@email.com e 123 e clica em "Entrar".
    * Sua função de login procura no array mockUsers por uma correspondência.
    * Se encontrar, ela salva um "token falso" e os dados do usuário no localStorage. code JavaScriptdownloadcontent_copy expand_less IGNORE_WHEN_COPYING_START IGNORE_WHEN_COPYING_END     // Exemplo de lógica no método de login
    * localStorage.setItem('authToken', 'fake-jwt-token-for-client');
    * localStorage.setItem('user', JSON.stringify({ email: 'cliente@email.com', role: 'client' }));
    *       
    * A aplicação redireciona para a dashboard principal do cliente.
8. Diferenciação de Rota:
    * O roteador da sua aplicação agora terá uma lógica. Antes de carregar uma página, ele verifica se existe um authToken no localStorage.
    * Se não houver, redireciona para /login.
    * Se houver, ele verifica o role do usuário. Se o role for admin e o usuário tentar acessar /admin/dashboard, ele permite. Se um client tentar acessar uma rota de admin, ele redireciona.
9. Layout Dinâmico: O layout principal da aplicação (App.vue) irá renderizar o AdminLayout ou o AppLayout (cliente) com base na role do usuário logado.

Parte 5: Sistema de Notificações em Tempo Real
Vamos criar um componente de notificação no cabeçalho da aplicação.
5.1. Componentes da Interface de Notificação
* NotificationIcon.vue: Um ícone de sino no cabeçalho. Ele terá um pequeno ponto laranja se houver notificações não lidas.
* NotificationsDropdown.vue: Ao clicar no sino, um dropdown aparece com uma lista das últimas 5 notificações. Cada notificação tem uma cor diferente dependendo do tipo (sucesso, erro, informação).
* NotificationsPage.vue: Uma página dedicada para ver o histórico completo de notificações.
5.2. Mock Data (/data/notifications.js)
code JavaScript
downloadcontent_copy
expand_less
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END
    export const mockNotifications = [
  { 
    id: 1, 
    type: 'success', // 'success', 'error', 'info'
    message: 'Seu backlink para meublogdenichox.com foi publicado com sucesso!', 
    read: false,
    timestamp: '2025-09-15T14:30:00Z'
  },
  { 
    id: 2, 
    type: 'error', 
    message: 'Falha na publicação do backlink. O site da rede está temporariamente indisponível.', 
    read: false,
    timestamp: '2025-09-15T10:15:00Z'
  },
  { 
    id: 3, 
    type: 'info', 
    message: 'O site "expertsdeseo.com" foi adicionado à nossa rede no nicho de Marketing.', 
    read: true,
    timestamp: '2025-09-14T18:00:00Z'
  }
];
  
5.3. Simulando Notificações em Tempo Real
Para dar a impressão de que as notificações chegam em tempo real, podemos usar um setInterval no layout principal da aplicação para, a cada 20 segundos, por exemplo, adicionar uma nova notificação (fictícia) ao topo da lista e marcar o ícone como "não lido".
* Lógica:
    * A aplicação carrega as mockNotifications.
    * Um estado global controla a lista de notificações.
    * O componente NotificationIcon verifica se existe alguma notificação com read: false para mostrar o ponto laranja.
    * Quando o usuário clica para abrir o dropdown, todas as notificações visíveis são marcadas como read: true.
Com essas adições, seu frontend ficará não apenas funcional com dados fictícios, mas também visualmente atraente e com uma experiência de usuário muito mais rica e completa, cobrindo todo o ciclo desde o registro até o recebimento de feedback sobre as ações na plataforma.

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  LinkIcon, 
  Plus, 
  Search,
  Filter,
  ExternalLink,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Target,
  DollarSign,
  BarChart3,
  Globe,
  Zap
} from 'lucide-react';
import { mockBacklinks, Backlink } from '@/data/backlinks';
import { mockClientSites } from '@/data/clientSites';
import { mockNetworkSites } from '@/data/networkSites';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Backlinks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [backlinks, setBacklinks] = useState(mockBacklinks);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newBacklink, setNewBacklink] = useState({
    clientSiteUrl: '',
    targetUrl: '',
    anchorText: '',
    selectedNetworkSite: ''
  });

  const userSites = mockClientSites.filter(site => site.userId === user?.id);
  const userBacklinks = backlinks.filter(bl => 
    userSites.some(site => site.url === bl.clientSiteUrl)
  );

  const filteredBacklinks = userBacklinks.filter(backlink => {
    const matchesSearch = 
      backlink.anchorText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      backlink.clientSiteUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      backlink.networkSiteUrl.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || backlink.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: userBacklinks.length,
    published: userBacklinks.filter(bl => bl.status === 'Publicado').length,
    creating: userBacklinks.filter(bl => bl.status === 'Criando Conteúdo').length,
    pending: userBacklinks.filter(bl => bl.status === 'Aguardando Aprovação').length
  };

  const handleCreateBacklink = () => {
    if (!newBacklink.clientSiteUrl || !newBacklink.targetUrl || !newBacklink.anchorText) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    setIsCreateModalOpen(false);
    setIsNetworkModalOpen(true);
  };

  const handleSelectNetworkSite = (networkSiteUrl: string) => {
    const newBacklinkData: Backlink = {
      id: Math.max(...backlinks.map(bl => bl.id)) + 1,
      clientSiteUrl: newBacklink.clientSiteUrl,
      targetUrl: newBacklink.targetUrl,
      anchorText: newBacklink.anchorText,
      networkSiteUrl: networkSiteUrl,
      status: 'Criando Conteúdo',
      creationDate: new Date().toISOString().split('T')[0],
      metrics: mockNetworkSites.find(site => site.url === networkSiteUrl)?.metrics
    };

    setBacklinks([newBacklinkData, ...backlinks]);
    setNewBacklink({ clientSiteUrl: '', targetUrl: '', anchorText: '', selectedNetworkSite: '' });
    setIsNetworkModalOpen(false);

    toast({
      title: "Backlink criado com sucesso!",
      description: `Seu backlink está sendo processado em ${networkSiteUrl}`,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Publicado':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'Criando Conteúdo':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'Aguardando Aprovação':
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Publicado': return 'status-published';
      case 'Criando Conteúdo': return 'status-creating';
      case 'Aguardando Aprovação': return 'status-pending';
      default: return 'status-pending';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Gerenciamento de Backlinks</h1>
          <p className="text-muted-foreground">
            Crie e monitore seus backlinks de alta qualidade
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow">
              <Plus className="h-4 w-4 mr-2" />
              Criar Backlink
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo Backlink</DialogTitle>
              <DialogDescription>
                Preencha as informações do backlink que deseja criar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site">Site de Destino</Label>
                <Select 
                  value={newBacklink.clientSiteUrl} 
                  onValueChange={(value) => setNewBacklink({...newBacklink, clientSiteUrl: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um site" />
                  </SelectTrigger>
                  <SelectContent>
                    {userSites.map((site) => (
                      <SelectItem key={site.id} value={site.url}>
                        {site.url} - {site.niche}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetUrl">URL de Destino</Label>
                <Input
                  id="targetUrl"
                  placeholder="/minha-pagina-importante"
                  value={newBacklink.targetUrl}
                  onChange={(e) => setNewBacklink({...newBacklink, targetUrl: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="anchorText">Texto Âncora</Label>
                <Input
                  id="anchorText"
                  placeholder="palavra-chave relevante"
                  value={newBacklink.anchorText}
                  onChange={(e) => setNewBacklink({...newBacklink, anchorText: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateBacklink}>
                Próximo: Escolher Site
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Backlinks</CardTitle>
            <LinkIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Backlinks criados
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publicados</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.published}</div>
            <Progress 
              value={stats.total > 0 ? (stats.published / stats.total) * 100 : 0} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.creating}</div>
            <p className="text-xs text-muted-foreground">
              Sendo criados
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Backlinks ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar backlinks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="Publicado">Publicado</SelectItem>
            <SelectItem value="Criando Conteúdo">Em Criação</SelectItem>
            <SelectItem value="Aguardando Aprovação">Aguardando</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Backlinks List */}
      {filteredBacklinks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <LinkIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">
              {userBacklinks.length === 0 ? "Nenhum backlink criado" : "Nenhum backlink encontrado"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {userBacklinks.length === 0 
                ? "Comece criando seu primeiro backlink para aumentar a autoridade do seu site" 
                : "Tente ajustar sua pesquisa ou filtros"
              }
            </p>
            <Button 
              className="bg-gradient-to-r from-primary to-primary-hover"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Backlink
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBacklinks.map((backlink, index) => (
            <Card key={backlink.id} className="card-hover animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(backlink.status)}
                      <h3 className="font-semibold text-lg">{backlink.anchorText}</h3>
                      <Badge className={getStatusColor(backlink.status)}>
                        {backlink.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Site de Origem</p>
                        <p className="font-medium">{backlink.networkSiteUrl}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Site de Destino</p>
                        <p className="font-medium">{backlink.clientSiteUrl}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">URL de Destino</p>
                        <p className="font-medium">{backlink.targetUrl}</p>
                      </div>
                    </div>

                    {backlink.metrics && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{backlink.metrics.da}</p>
                          <p className="text-xs text-muted-foreground">Domain Authority</p>
                        </div>
                        {backlink.metrics.traffic && (
                          <div className="text-center">
                            <p className="text-2xl font-bold">{backlink.metrics.traffic.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Tráfego Mensal</p>
                          </div>
                        )}
                        <div className="text-center">
                          <p className="text-sm font-medium">
                            {formatDistanceToNow(new Date(backlink.creationDate), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">Criado</p>
                        </div>
                        {backlink.publishDate && (
                          <div className="text-center">
                            <p className="text-sm font-medium">
                              {formatDistanceToNow(new Date(backlink.publishDate), {
                                addSuffix: true,
                                locale: ptBR
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground">Publicado</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Network Sites Selection Modal */}
      <Dialog open={isNetworkModalOpen} onOpenChange={setIsNetworkModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escolher Site da Rede</DialogTitle>
            <DialogDescription>
              Selecione o melhor site da nossa rede para publicar seu backlink
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockNetworkSites.filter(site => site.available).map((site) => (
              <Card key={site.id} className="cursor-pointer hover:shadow-md transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{site.url}</CardTitle>
                    <Badge variant="secondary">{site.niche}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">{site.metrics.da}</p>
                      <p className="text-xs text-muted-foreground">DA</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{(site.metrics.traffic / 1000).toFixed(0)}K</p>
                      <p className="text-xs text-muted-foreground">Tráfego</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">R${site.metrics.price}</p>
                      <p className="text-xs text-muted-foreground">Preço</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {site.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    className="w-full bg-gradient-to-r from-primary to-primary-hover"
                    onClick={() => handleSelectNetworkSite(site.url)}
                  >
                    Escolher Este Site
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Backlinks;
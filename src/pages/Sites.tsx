import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Globe, 
  Plus, 
  ExternalLink, 
  TrendingUp, 
  Search,
  BarChart3,
  Target,
  Loader2,
  Trash,
  LayoutGrid,
  List
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logEvent } from '@/lib/logger';

// Redefine the interface to match Supabase table
export interface ClientSite {
  id: number;
  user_id: string;
  url: string;
  niche_primary: string | null;
  niche_secondary: string | null;
  niche_tertiary: string | null;
  type: 'Blog de Afiliado' | 'E-commerce' | 'Institucional' | 'Notícias';
  da: number | null;
  backlinks: number | null;
  ref_domains: number | null;
  organic_keywords: number | null;
  created_at: string;
  status: 'active' | 'pending' | 'suspended';
  progress_percent: number | null;
  progress_log: string | null;
}

const Sites = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSite, setNewSite] = useState({
    url: '',
    type: 'Blog de Afiliado' as const
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [siteProgress, setSiteProgress] = useState<{ [siteId: number]: number }>({});

  const planSiteLimits: { [key: string]: number } = {
    starter: 1,
    pro: 5,
    agency: 10,
    legacy: Infinity,
    'legacy-club': Infinity,
  };

  const userPlan = user?.plan_id || 'starter'; // Default to starter if no plan
  const siteLimit = planSiteLimits[userPlan] || 1; // Default to 1 if plan not found
  const hasReachedLimit = sites.length >= siteLimit;

  useEffect(() => {
    const fetchSites = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('client_sites')
          .select('*');

        if (error) throw error;

        setSites(data || []);
        const initialProgress: { [siteId: number]: number } = {};
        data?.forEach(site => {
          if (site.status === 'pending' && site.progress_percent) {
            initialProgress[site.id] = site.progress_percent;
          }
        });
        setSiteProgress(initialProgress);

      } catch (error) {
        console.error("Failed to fetch sites", error);
        toast({
          title: "Erro ao carregar sites",
          description: "Não foi possível buscar seus sites. Tente novamente mais tarde.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSites();

    // Supabase Realtime subscription
    const channel = supabase
      .channel('public:client_sites')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'client_sites' },
        (payload) => {
          const updatedSite = payload.new as ClientSite;
          setSites((prevSites) =>
            prevSites.map((site) =>
              site.id === updatedSite.id ? updatedSite : site
            )
          );
          if (updatedSite.status === 'pending' && updatedSite.progress_percent) {
            setSiteProgress(prev => ({ ...prev, [updatedSite.id]: updatedSite.progress_percent! }));
          } else if (updatedSite.status === 'active') {
            setSiteProgress(prev => ({ ...prev, [updatedSite.id]: 100 }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const filteredSites = sites.filter(site =>
    site.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (site.niche_primary && site.niche_primary.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (site.niche_secondary && site.niche_secondary.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (site.niche_tertiary && site.niche_tertiary.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddSite = async () => {
    if (!newSite.url) {
      toast({
        title: "Erro",
        description: "Por favor, preencha a URL do site.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
        toast({
            title: "Erro",
            description: "Você precisa estar logado para adicionar um site.",
            variant: "destructive",
        });
        return;
    }

    const newSiteData = {
      user_id: user.id,
      url: newSite.url,
      type: newSite.type,
      niche_primary: 'A ser definido', // Placeholder
      niche_secondary: null,
      niche_tertiary: null,
      da: 0, // Placeholder
      backlinks: 0, // Placeholder
      ref_domains: 0, // Placeholder
      organic_keywords: 0, // Placeholder
      ranking_pages: [], // Placeholder
      status: 'pending' as const,
      progress_percent: 0,
      progress_log: 'Iniciando...'
    };

    try {
      const { data: addedSite, error } = await supabase
        .from('client_sites')
        .insert(newSiteData)
        .select()
        .single();

      if (error) throw error;

      if (addedSite) {
        setSites([...sites, addedSite]);

        // Insert notification for site creation
        await supabase.from('notifications').insert({
          user_id: user.id,
          message: `Seu site ${addedSite.url} foi adicionado com sucesso e está sendo processado.`, 
          type: 'info',
        });
      }
      
      const urlForProcessing = newSite.url; // Capture URL before clearing state
      setNewSite({ url: '', type: 'Blog de Afiliado' });
      setIsAddModalOpen(false);

      // Invoca a função de edge de forma segura
      const { error: functionError } = await supabase.functions.invoke('process-site', {
        body: JSON.stringify({ siteUrl: urlForProcessing, clientSiteId: addedSite.id }),
      });

      if (functionError) {
        throw new Error(functionError.message || 'Erro ao chamar a função de processamento.');
      }

      toast({
        title: "Site adicionado com sucesso!",
        description: `${urlForProcessing} está sendo processado.`, // Updated message
      });

      logEvent('success', `Site ${urlForProcessing} added successfully by user ${user.email}.`, { userId: user.id, siteUrl: urlForProcessing });

    } catch (error: any) {
      logEvent('error', `Failed to add site ${newSite.url} for user ${user?.email}.`, { error: error.message });
      console.error("Failed to add site or call Edge Function", error);
      toast({
        title: "Erro ao adicionar site",
        description: error.message || "Não foi possível adicionar seu site. Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSite = async (siteId: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este site? Todos os backlinks associados também serão excluídos. Esta ação é irreversível.")) {
      return;
    }

    try {
      // 1. Encontrar todos os backlinks associados ao site
      toast({ title: "Iniciando exclusão...", description: "Buscando backlinks associados." });
      const { data: backlinks, error: fetchError } = await supabase
        .from('backlinks')
        .select('id')
        .eq('client_site_id', siteId);

      if (fetchError) throw new Error(`Falha ao buscar backlinks associados: ${fetchError.message}`);

      // 2. Deletar cada backlink usando a função de edge
      if (backlinks && backlinks.length > 0) {
        toast({ title: "Excluindo backlinks...", description: `Encontrados ${backlinks.length} backlinks para excluir.` });
        const deletePromises = backlinks.map(backlink => 
          supabase.functions.invoke('delete-backlink', {
            body: { backlink_id: backlink.id },
          })
        );
        
        await Promise.all(deletePromises);
        toast({ title: "Backlinks excluídos!", description: "Todos os backlinks associados foram processados." });
      }

      // 3. Deletar o site em si
      const { error: deleteSiteError } = await supabase
        .from('client_sites')
        .delete()
        .eq('id', siteId);

      if (deleteSiteError) throw deleteSiteError;

      setSites(prevSites => prevSites.filter(site => site.id !== siteId));
      toast({
        title: "Site excluído com sucesso!",
        variant: "success",
      });
      logEvent('success', `Site with ID ${siteId} and its backlinks deleted successfully by user ${user?.email}.`, { userId: user?.id, siteId });

    } catch (error: any) {
      logEvent('error', `Failed to delete site with ID ${siteId} for user ${user?.email}.`, { userId: user?.id, siteId, error: error.message });
      console.error("Failed to delete site and associated backlinks", error);
      toast({
        title: "Erro ao excluir site",
        description: error.message || "Não foi possível concluir a exclusão do site e seus backlinks.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando sites...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/20';
      case 'pending': return 'bg-warning/10 text-warning-foreground border-warning/20';
      case 'suspended': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Meus Sites</h1>
          <p className="text-muted-foreground">
            Gerencie todos os seus sites e acompanhe suas métricas de SEO. Você tem {sites.length} de {siteLimit === Infinity ? 'ilimitados' : siteLimit} sites.
          </p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow" disabled={hasReachedLimit}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Site
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Site</DialogTitle>
              <DialogDescription>
                Adicione a URL e o tipo do seu site. O nicho e as métricas serão buscados automaticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL do Site</Label>
                <Input
                  id="url"
                  placeholder="exemplo.com"
                  value={newSite.url}
                  onChange={(e) => {
                    const cleanedUrl = e.target.value
                      .replace(/^https?:\/\//, '') // Remove http:// or https://
                      .split('/')[0]; // Remove any paths
                    setNewSite({ ...newSite, url: cleanedUrl });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Site</Label>
                <Select 
                  value={newSite.type} 
                  onValueChange={(value: any) => setNewSite({...newSite, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Blog de Afiliado">Blog de Afiliado</SelectItem>
                    <SelectItem value="E-commerce">E-commerce</SelectItem>
                    <SelectItem value="Institucional">Institucional</SelectItem>
                    <SelectItem value="Notícias">Notícias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddSite}>
                Adicionar Site
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasReachedLimit && (
        <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg text-warning-foreground">
          <p className="font-semibold">Limite de sites atingido</p>
          <p className="text-sm">
            Você atingiu o limite de {siteLimit} site(s) do seu plano ({userPlan}). Para adicionar mais sites, por favor, <a href="/pricing" className="underline font-bold">faça um upgrade no seu plano</a>.
          </p>
        </div>
      )}

      {/* Search and View Toggle */}
      <div className="flex justify-between items-center">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar sites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'list')} aria-label="View mode">
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Stats Overview */}
      {sites.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Total de Sites</p>
                  <p className="text-2xl font-bold">{sites.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-medium">DA Médio</p>
                  <p className="text-2xl font-bold">
                    {sites.length > 0 ? Math.round(sites.reduce((acc, site) => acc + (site.da || 0), 0) / sites.length) : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Total Backlinks</p>
                  <p className="text-2xl font-bold">
                    {sites.reduce((acc, site) => acc + (site.backlinks || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm font-medium">Keywords</p>
                  <p className="text-2xl font-bold">
                    {sites.reduce((acc, site) => acc + (site.organic_keywords || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sites Grid or List */}
      {filteredSites.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">
              {sites.length === 0 ? "Nenhum site cadastrado" : "Nenhum site encontrado"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {sites.length === 0 
                ? "Comece adicionando seu primeiro site para gerenciar backlinks" 
                : "Tente ajustar sua pesquisa ou adicionar um novo site"
              }
            </p>
            <Button 
              className="bg-gradient-to-r from-primary to-primary-hover"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Site
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSites.map((site, index) => (
            <Card 
              key={site.id} 
              className="card-hover animate-slide-up cursor-pointer" 
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => navigate(`/sites/${site.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                                      <div className="space-y-1">
                                      <CardTitle className="text-lg flex items-center space-x-2">
                                        <Globe className="h-5 w-5 text-primary" />
                                        <span className="truncate">{site.url}</span>
                                        <Button variant="ghost" size="sm" className="p-0 h-auto w-auto" onClick={(e) => { e.stopPropagation(); window.open(`https://${site.url}`, '_blank'); }}>
                                          <ExternalLink className="h-4 w-4" />
                                        </Button>
                                      </CardTitle>
                                      <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">Nichos:</p>
                                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                                          {site.niche_primary && (
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Badge variant="secondary" className="block flex-shrink-0 max-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {site.niche_primary}
                                                  </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">
                                                  <p>{site.niche_primary}</p>
                                                </TooltipContent>
                                              </Tooltip>
                                          )}
                                          {site.niche_secondary && (
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Badge variant="secondary" className="block flex-shrink-0 max-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {site.niche_secondary}
                                                  </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">
                                                  <p>{site.niche_secondary}</p>
                                                </TooltipContent>
                                              </Tooltip>
                                          )}
                                          {site.niche_tertiary && (
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Badge variant="secondary" className="block flex-shrink-0 max-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {site.niche_tertiary}
                                                  </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">
                                                  <p>{site.niche_tertiary}</p>
                                                </TooltipContent>
                                              </Tooltip>
                                          )}
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">Tipo de Site:</p>
                                        {
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Badge variant="outline" className="block flex-shrink-0 max-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap">
                                                  {site.type}
                                                </Badge>
                                              </TooltipTrigger>
                                              <TooltipContent side="bottom">
                                                <p>{site.type}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                        }
                                      </div>                  </div>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive-foreground" onClick={(e) => { e.stopPropagation(); handleDeleteSite(site.id); }}>
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                {site.status === 'pending' ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground p-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-sm font-medium mb-2">Processando site...</p>
                    <Progress value={siteProgress[site.id] || 0} className="w-full" />
                    <p className="text-xs text-center mt-2 text-muted-foreground">{site.progress_log || 'Aguarde a atualização das métricas.'}</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-primary">{site.da || '-'}</p>
                        <p className="text-xs text-muted-foreground">Domain Authority</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold">{site.backlinks?.toLocaleString() || '-'}</p>
                        <p className="text-xs text-muted-foreground">Backlinks</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Ref. Domains</p>
                        <p className="font-semibold">{site.ref_domains || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Keywords</p>
                        <p className="font-semibold">{site.organic_keywords || '-'}</p>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <Badge className={getStatusColor(site.status)}>
                    {site.status === 'active' ? 'Ativo' : 
                     site.status === 'pending' ? 'Pendente' : 'Suspenso'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Adicionado em {new Date(site.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>DA</TableHead>
                  <TableHead>Backlinks</TableHead>
                  <TableHead>Ref. Domains</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Adicionado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSites.map((site) => (
                  <TableRow key={site.id} className="cursor-pointer" onClick={() => navigate(`/sites/${site.id}`)}>
                    <TableCell className="font-medium">{site.url}</TableCell>
                    <TableCell>{site.da}</TableCell>
                    <TableCell>{site.backlinks?.toLocaleString()}</TableCell>
                    <TableCell>{site.ref_domains}</TableCell>
                    <TableCell>{site.organic_keywords}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(site.status)}>
                        {site.status === 'active' ? 'Ativo' : 
                         site.status === 'pending' ? 'Pendente' : 'Suspenso'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(site.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); window.open(`https://${site.url}`, '_blank'); }}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive-foreground" onClick={(e) => { e.stopPropagation(); handleDeleteSite(site.id); }}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Sites;
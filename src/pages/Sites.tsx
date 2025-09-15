import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Globe, 
  Plus, 
  ExternalLink, 
  TrendingUp, 
  Users, 
  Search,
  BarChart3,
  Target
} from 'lucide-react';
import { mockClientSites, ClientSite } from '@/data/clientSites';
import { useToast } from '@/hooks/use-toast';

const Sites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sites, setSites] = useState(mockClientSites);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSite, setNewSite] = useState({
    url: '',
    niche: '',
    type: 'Blog de Afiliado' as const
  });
  const [searchTerm, setSearchTerm] = useState('');

  const userSites = sites.filter(site => site.userId === user?.id);
  const filteredSites = userSites.filter(site => 
    site.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.niche.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSite = () => {
    if (!newSite.url || !newSite.niche) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const newSiteData: ClientSite = {
      id: Math.max(...sites.map(s => s.id)) + 1,
      userId: user?.id || 1,
      url: newSite.url,
      niche: newSite.niche,
      type: newSite.type,
      metrics: {
        da: Math.floor(Math.random() * 50) + 20,
        backlinks: Math.floor(Math.random() * 2000) + 100,
        refDomains: Math.floor(Math.random() * 300) + 50,
        organicKeywords: Math.floor(Math.random() * 1500) + 200
      },
      rankingPages: [],
      addedDate: new Date().toISOString().split('T')[0],
      status: 'active'
    };

    setSites([...sites, newSiteData]);
    setNewSite({ url: '', niche: '', type: 'Blog de Afiliado' });
    setIsAddModalOpen(false);

    toast({
      title: "Site adicionado com sucesso!",
      description: `${newSite.url} foi adicionado à sua lista de sites.`,
    });
  };

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
            Gerencie todos os seus sites e acompanhe suas métricas de SEO
          </p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Site
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Site</DialogTitle>
              <DialogDescription>
                Adicione um novo site para começar a gerenciar seus backlinks
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL do Site</Label>
                <Input
                  id="url"
                  placeholder="exemplo.com"
                  value={newSite.url}
                  onChange={(e) => setNewSite({...newSite, url: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="niche">Nicho</Label>
                <Input
                  id="niche"
                  placeholder="Marketing Digital, Finanças, etc."
                  value={newSite.niche}
                  onChange={(e) => setNewSite({...newSite, niche: e.target.value})}
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar sites..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats Overview */}
      {userSites.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Total de Sites</p>
                  <p className="text-2xl font-bold">{userSites.length}</p>
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
                    {Math.round(userSites.reduce((acc, site) => acc + site.metrics.da, 0) / userSites.length)}
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
                    {userSites.reduce((acc, site) => acc + site.metrics.backlinks, 0).toLocaleString()}
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
                    {userSites.reduce((acc, site) => acc + site.metrics.organicKeywords, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sites Grid */}
      {filteredSites.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">
              {userSites.length === 0 ? "Nenhum site cadastrado" : "Nenhum site encontrado"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {userSites.length === 0 
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSites.map((site, index) => (
            <Card key={site.id} className="card-hover animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Globe className="h-5 w-5 text-primary" />
                      <span className="truncate">{site.url}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{site.niche}</Badge>
                      <Badge variant="outline">{site.type}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{site.metrics.da}</p>
                    <p className="text-xs text-muted-foreground">Domain Authority</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{site.metrics.backlinks.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Backlinks</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Ref. Domains</p>
                    <p className="font-semibold">{site.metrics.refDomains}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Keywords</p>
                    <p className="font-semibold">{site.metrics.organicKeywords}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <Badge className={getStatusColor(site.status)}>
                    {site.status === 'active' ? 'Ativo' : 
                     site.status === 'pending' ? 'Pendente' : 'Suspenso'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Adicionado em {new Date(site.addedDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sites;
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Globe,
  LinkIcon,
  TrendingUp,
  Target,
  Plus,
  ExternalLink,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

// Interfaces
interface ClientSite {
  id: number;
  url: string;
  niche_primary: string;
  da?: number;
  backlinks?: number;
  organic_keywords?: number;
  ref_domains?: number;
}

interface Backlink {
  id: number;
  anchor_text: string;
  status: string;
  network_sites: { domain: string };
  client_sites: { url: string };
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sites, setSites] = useState<ClientSite[]>([]);
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSites = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('client_sites')
      .select('id, url, niche_primary, da, backlinks, organic_keywords, ref_domains')
      .eq('user_id', user.id);

    if (error) {
      toast({ title: "Erro ao buscar sites", description: error.message, variant: "destructive" });
    } else {
      setSites(data as ClientSite[]);
    }
  }, [user, toast]);

  const fetchBacklinks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('backlinks')
      .select(`id, anchor_text, status, network_sites(domain), client_sites(url)`)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: "Erro ao buscar backlinks", description: error.message, variant: "destructive" });
    } else {
      setBacklinks(data as Backlink[]);
    }
  }, [user, toast]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (user) {
        await fetchSites();
        await fetchBacklinks();
      }
      setLoading(false);
    };

    loadData();
  }, [user, fetchSites, fetchBacklinks]);

  const counts = {
    sites: sites.length,
    backlinks: backlinks.length,
    published: backlinks.filter(bl => bl.status === 'live').length
  };

  const recentBacklinks = backlinks.filter(bl => bl.status === 'live' || bl.status === 'processing' || bl.status === 'pending').slice(0, 5);
  const publishedCount = backlinks.filter(bl => bl.status === 'live').length;

  // Logic for Recommendations Card
  let recommendation = null; // Initialize as null

  if (sites.length === 0) {
    recommendation = {
      title: "Comece a Crescer!",
      description: "Adicione seu primeiro site para começar a construir backlinks.",
      buttonText: "Adicionar Site",
      buttonLink: "/sites",
      icon: <Globe className="h-5 w-5 text-primary" />
    };
  } else if (backlinks.length === 0) {
    recommendation = {
      title: "Crie seu Primeiro Backlink!",
      description: "Seu site está pronto. Agora, gere seu primeiro backlink para impulsionar seu SEO.",
      buttonText: "Criar Backlink",
      buttonLink: "/backlinks",
      icon: <LinkIcon className="h-5 w-5 text-primary" />
    };
  } else if (backlinks.filter(bl => bl.status === 'processing' || bl.status === 'pending').length > 0) {
    const processingCount = backlinks.filter(bl => bl.status === 'processing' || bl.status === 'pending').length;
    recommendation = {
      title: "Backlinks em Andamento!",
      description: `Você tem ${processingCount} backlink(s) sendo processado(s). Acompanhe o status.`, // Fixed pluralization
      buttonText: "Ver Backlinks",
      buttonLink: "/backlinks",
      icon: <RefreshCw className="h-5 w-5 text-primary" />
    };
  } else {
    // If all good, set recommendation to null so the card doesn't render
    recommendation = null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-primary-hover rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="w-full h-full bg-white/10 bg-[length:60px_60px] bg-repeat"
               style={{backgroundImage: "radial-gradient(circle at 30px 30px, white 2px, transparent 2px)"}}></div>
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Bem-vindo de volta, {user?.name}! 👋</h1>
          <p className="text-white/90 text-lg">
            Acompanhe o crescimento dos seus sites e gerencie seus backlinks de forma inteligente.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Sites</CardTitle>
            <Globe className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">{counts.sites}</div>
            <p className="text-xs text-muted-foreground">
              Sites cadastrados na plataforma
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backlinks Totais</CardTitle>
            <LinkIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">{counts.backlinks}</div>
            <p className="text-xs text-muted-foreground">
              Backlinks criados até agora
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publicados</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success animate-count-up">{counts.published}</div>
            <p className="text-xs text-muted-foreground">
              Backlinks ativos
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
              {backlinks.length > 0 ? Math.round((publishedCount / backlinks.length) * 100) : 0}%
            </div>
            <Progress
              value={backlinks.length > 0 ? (publishedCount / backlinks.length) * 100 : 0}
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sites Section */}
        <Card className="animate-slide-up">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <span>Meus Sites</span>
                </CardTitle>
                <CardDescription>
                  Sites cadastrados e suas métricas principais
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => navigate('/sites')}
                className="bg-gradient-to-r from-primary to-primary-hover"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Site
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {sites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum site cadastrado ainda.</p>
                <Button
                  className="mt-4"
                  onClick={() => navigate('/sites')}
                  variant="outline"
                >
                  Cadastrar Primeiro Site
                </Button>
              </div>
            ) : (
              sites.slice(0, 3).map((site) => (
                <div key={site.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{site.url}</h4>
                      <Badge variant="secondary">{site.niche_primary}</Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>DA: {site.da || 'N/A'}</span>
                      <span>Backlinks: {site.backlinks || 'N/A'}</span>
                      <span>Keywords: {site.organic_keywords || 'N/A'}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={site.url.startsWith('http://') || site.url.startsWith('https://') ? site.url : `https://${site.url}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))
            )}
            {sites.length > 3 && (
              <Button variant="ghost" className="w-full" onClick={() => navigate('/sites')}>
                Ver todos os sites ({sites.length})
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Recent Backlinks */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <LinkIcon className="h-5 w-5 text-primary" />
                  <span>Backlinks Recentes</span>
                </CardTitle>
                <CardDescription>
                  Últimos backlinks criados e seus status
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => navigate('/backlinks')}
                variant="outline"
              >
                Ver Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentBacklinks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum backlink criado ainda.</p>
                <Button
                  className="mt-4"
                  onClick={() => navigate('/backlinks')}
                  variant="outline"
                >
                  Criar Primeiro Backlink
                </Button>
              </div>
            ) : (
              recentBacklinks.map((backlink) => (
                <div key={backlink.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{backlink.anchor_text}</span>
                      <Badge
                        variant={
                          backlink.status === 'live' ? 'default' :
                          ['processing', 'pending'].includes(backlink.status) ? 'secondary' : 'outline'
                        }
                        className={
                          backlink.status === 'live' ? 'status-published' :
                          ['processing', 'pending'].includes(backlink.status) ? 'status-creating' : 'status-pending'
                        }
                      >
                        {backlink.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {backlink.network_sites?.domain} → {backlink.client_sites?.url}
                    </p>
                  </div>
                  {backlink.status === 'live' ? (
                    <ArrowUpRight className="h-4 w-4 text-success" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations Card */}
      {recommendation && (
        <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {recommendation.icon}
              <span>{recommendation.title}</span>
            </CardTitle>
            <CardDescription>{recommendation.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow"
              onClick={() => navigate(recommendation.buttonLink)}
            >
              {recommendation.buttonText}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
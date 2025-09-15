import React, { useEffect, useState } from 'react';
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
  ArrowDownRight
} from 'lucide-react';
import { mockClientSites } from '@/data/clientSites';
import { mockBacklinks } from '@/data/backlinks';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ sites: 0, backlinks: 0, published: 0 });

  // Simulate counting animation
  useEffect(() => {
    const userSites = mockClientSites.filter(site => site.userId === user?.id);
    const userBacklinks = mockBacklinks.filter(bl => 
      userSites.some(site => site.url === bl.clientSiteUrl)
    );
    const publishedBacklinks = userBacklinks.filter(bl => bl.status === 'Publicado');

    const animateCount = (target: number, setter: (value: number) => void) => {
      let current = 0;
      const increment = target / 30;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setter(target);
          clearInterval(timer);
        } else {
          setter(Math.floor(current));
        }
      }, 50);
    };

    setTimeout(() => animateCount(userSites.length, (val) => setCounts(prev => ({ ...prev, sites: val }))), 200);
    setTimeout(() => animateCount(userBacklinks.length, (val) => setCounts(prev => ({ ...prev, backlinks: val }))), 400);
    setTimeout(() => animateCount(publishedBacklinks.length, (val) => setCounts(prev => ({ ...prev, published: val }))), 600);
  }, [user?.id]);

  const userSites = mockClientSites.filter(site => site.userId === user?.id);
  const userBacklinks = mockBacklinks.filter(bl => 
    userSites.some(site => site.url === bl.clientSiteUrl)
  );

  const recentBacklinks = userBacklinks.slice(0, 5);
  const publishedCount = userBacklinks.filter(bl => bl.status === 'Publicado').length;
  const pendingCount = userBacklinks.filter(bl => bl.status !== 'Publicado').length;

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
              {userBacklinks.length > 0 ? Math.round((publishedCount / userBacklinks.length) * 100) : 0}%
            </div>
            <Progress 
              value={userBacklinks.length > 0 ? (publishedCount / userBacklinks.length) * 100 : 0} 
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
            {userSites.length === 0 ? (
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
              userSites.slice(0, 3).map((site) => (
                <div key={site.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{site.url}</h4>
                      <Badge variant="secondary">{site.niche}</Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>DA: {site.metrics.da}</span>
                      <span>Backlinks: {site.metrics.backlinks}</span>
                      <span>Keywords: {site.metrics.organicKeywords}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
            {userSites.length > 3 && (
              <Button variant="ghost" className="w-full" onClick={() => navigate('/sites')}>
                Ver todos os sites ({userSites.length})
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
                      <span className="font-medium text-sm">{backlink.anchorText}</span>
                      <Badge 
                        variant={
                          backlink.status === 'Publicado' ? 'default' :
                          backlink.status === 'Criando Conteúdo' ? 'secondary' : 'outline'
                        }
                        className={
                          backlink.status === 'Publicado' ? 'status-published' :
                          backlink.status === 'Criando Conteúdo' ? 'status-creating' : 'status-pending'
                        }
                      >
                        {backlink.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {backlink.networkSiteUrl} → {backlink.clientSiteUrl}
                    </p>
                  </div>
                  {backlink.status === 'Publicado' ? (
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesse rapidamente as principais funcionalidades da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              className="h-20 flex-col space-y-2 bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow"
              onClick={() => navigate('/sites')}
            >
              <Globe className="h-6 w-6" />
              <span>Gerenciar Sites</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col space-y-2 hover:bg-muted"
              onClick={() => navigate('/backlinks')}
            >
              <LinkIcon className="h-6 w-6" />
              <span>Criar Backlink</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col space-y-2 hover:bg-muted"
              onClick={() => navigate('/ranking')}
            >
              <BarChart3 className="h-6 w-6" />
              <span>Ver Ranking</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
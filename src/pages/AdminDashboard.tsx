import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Globe, 
  LinkIcon, 
  Ticket, 
  BarChart,
  UsersRound,
  LayoutDashboard,
  Settings,
  BookOpen,
  Network,
  FileText,
  Key
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carregamento de dados
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000); // Simula um delay de 1 segundo

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando dashboard administrativa...</p>
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
          <h1 className="text-3xl font-bold mb-2">Bem-vindo ao Painel Admin! 👋</h1>
          <p className="text-white/90 text-lg">
            Gerencie a plataforma e acompanhe as métricas gerais.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">120</div> {/* Mock data */}
            <p className="text-xs text-muted-foreground">
              Usuários cadastrados na plataforma
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Sites de Clientes</CardTitle>
            <Globe className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">45</div> {/* Mock data */}
            <p className="text-xs text-muted-foreground">
              Sites de clientes cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backlinks Criados este Mês</CardTitle>
            <LinkIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">320</div> {/* Mock data */}
            <p className="text-xs text-muted-foreground">
              Backlinks gerados no mês atual
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Abertos</CardTitle>
            <Ticket className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">8</div> {/* Mock data */}
            <p className="text-xs text-muted-foreground">
              Tickets de suporte aguardando resposta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos (Placeholders) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Novos Usuários por Mês</CardTitle>
            <CardDescription>Gráfico de novos cadastros ao longo do tempo.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              {/* Placeholder para o gráfico de novos usuários */}
              Gráfico de Novos Usuários (Chart.js/ApexCharts)
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle>Distribuição de Tipos de Site</CardTitle>
            <CardDescription>Gráfico de pizza mostrando a proporção de tipos de sites.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              {/* Placeholder para o gráfico de tipos de site */}
              Gráfico de Tipos de Site (Chart.js/ApexCharts)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesse rapidamente as principais funcionalidades administrativas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              className="h-20 flex-col space-y-2 bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow"
              onClick={() => navigate('/admin/users')}
            >
              <UsersRound className="h-6 w-6" />
              <span>Gerenciar Usuários</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 hover:bg-muted"
              onClick={() => navigate('/admin/network-sites')}
            >
              <Network className="h-6 w-6" />
              <span>Sites da Rede</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 hover:bg-muted"
              onClick={() => navigate('/admin/logs')}
            >
              <FileText className="h-6 w-6" />
              <span>Ver Logs</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
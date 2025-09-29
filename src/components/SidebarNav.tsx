import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Globe,
  Link as LinkIcon,
  TrendingUp,
  Users,
  DollarSign,
  HelpCircle,
  ShieldCheck,
  LogOut,
  BarChart,
  UsersRound,
  ArrowLeft,
  Terminal,
  Upload,
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarContent,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SidebarNavProps {
  menuType: 'client' | 'admin';
}

const SidebarNav: React.FC<SidebarNavProps> = ({ menuType }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const planDisplayNameMap: { [key: string]: string } = {
    starter: 'Starter',
    pro: 'Pro',
    agency: 'Agência',
    legacy: 'Legacy',
    'legacy-club': 'Legacy Club',
  };
  const userPlanName = user?.plan_id ? planDisplayNameMap[user.plan_id] : 'N/A';

  const userNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/sites', icon: Globe, label: 'Meus Sites' },
    { to: '/backlinks', icon: LinkIcon, label: 'Backlinks' },
        { to: '/club', icon: Users, label: 'Club' },
    { to: '/affiliate', icon: DollarSign, label: 'Afiliados' },
    { to: '/support', icon: HelpCircle, label: 'Suporte' },
  ];

  const adminNavItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' }, // Novo item
    
    { to: '/admin/users', icon: UsersRound, label: 'Gerenciar Usuários' },
    { to: '/admin/network-sites', icon: Globe, label: 'Gerenciar Sites da Rede' },
    { to: '/admin/affiliates', icon: DollarSign, label: 'Gestão de Afiliados' },
    { to: '/admin/courses', icon: LayoutDashboard, label: 'Gerenciar Cursos' },
    { to: '/admin/client-sites', icon: Users, label: 'Sites dos Clientes' },
    { to: '/admin/logs', icon: LayoutDashboard, label: 'Logs da Plataforma' },
    { to: '/admin/apis', icon: LayoutDashboard, label: 'Configuração de APIs' }, // Novo item
    { to: '/admin/reports', icon: BarChart, label: 'Relatórios' },
    { to: '/admin/prompts', icon: Terminal, label: 'Prompts' },
    { to: '/admin/bulk-import', icon: Upload, label: 'Importação em Massa' },
    { to: '/admin/tickets', icon: HelpCircle, label: 'Suporte' },
  ];

  const currentNavItems = menuType === 'admin' ? adminNavItems : userNavItems;

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center space-x-3 p-2">
          <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary-hover rounded-lg flex items-center justify-center">
            <LinkIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold gradient-text">SEO Backlinks</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
        <SidebarGroupLabel>Menu</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {menuType === 'admin' && (
              <SidebarMenuItem key="back-to-user">
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-white shadow-md'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`
                  }
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar ao Menu Principal</span>
                </NavLink>
              </SidebarMenuItem>
            )}
            {currentNavItems.map((item) => (
              <SidebarMenuItem key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-white shadow-md'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              </SidebarMenuItem>
            ))}
            {menuType === 'client' && user?.role === 'admin' && (
              <SidebarMenuItem key="/admin-panel-toggle">
                <NavLink
                                        to="/admin/dashboard"
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-white shadow-md'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`
                  }
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Painel Admin</span>
                </NavLink>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
      {menuType === 'client' && (
        <SidebarFooter>
            <div className="p-4">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm text-primary font-semibold">Seu Plano</p>
                    <p className="font-bold text-xl mt-1">{userPlanName}</p>
                    
                    <p className="text-xs text-primary/80 mt-2 h-8">
                        {
                          {
                            starter: 'Ideal para começar.',
                            pro: 'Mais sites e recursos.',
                            agency: 'Tudo para sua agência.',
                            legacy: 'Acesso total legado.',
                            'legacy-club': 'Acesso total e encontros.'
                          }[user?.plan_id || 'starter']
                        }
                    </p>

                    <Button 
                      className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90" 
                      size="sm"
                      onClick={() => navigate('/pricing')}
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Mudar de Plano
                    </Button>
                </div>
            </div>
        </SidebarFooter>
      )}
      
    </>
  );
};

export default SidebarNav;
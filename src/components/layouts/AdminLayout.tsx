import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  LogOut,
  Bell,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { NotificationIcon } from '@/components/NotificationIcon';
import { Sidebar, SidebarProvider } from '@/components/ui/sidebar';
import SidebarNav from '@/components/SidebarNav'; // Usaremos o mesmo SidebarNav, mas com prop

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <SidebarProvider>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <Sidebar>
          <SidebarNav menuType="admin" /> {/* Passa a prop menuType="admin" */}
        </Sidebar>
        <div className="flex flex-col">
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 h-16 flex items-center justify-end">
              <div className="flex items-center space-x-4">
                <NotificationIcon />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2 h-10">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback className="bg-primary text-white">
                          {user?.user_metadata?.name?.charAt(0) || ''}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden sm:flex flex-col items-start">
                        <span className="text-sm font-medium">{user?.user_metadata?.name}</span>
                        <Badge variant="secondary" className="text-xs">Admin</Badge> {/* Altera para Admin */}
                      </div>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Configurações
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
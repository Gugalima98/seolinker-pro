import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, AlertCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface Notification {
  id: string;
  user_id: string;
  message: string;
  read: boolean;
  created_at: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export const NotificationIcon = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-notifications');

      if (error) {
        throw error;
      }
      setNotifications(data as Notification[]);
    } catch (error: any) {
      toast({ title: "Erro ao carregar notificações", description: error.message, variant: "destructive" });
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const markAllAsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    // Optimistically update UI
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
      for (const notification of unreadNotifications) {
        await supabase.functions.invoke('mark-notification-as-read', { body: { notification_id: notification.id } });
      }
    } catch (error: any) {
      toast({ title: "Erro ao marcar notificações como lidas", description: error.message, variant: "destructive" });
      // Revert UI if there was an error
      fetchNotifications();
    }
  }, [notifications, toast, fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotification = payload.new as Notification;
          if (newNotification.user_id === user.id) {
            setNotifications(prevNotifications => [newNotification, ...prevNotifications]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleDropdownOpenChange = (open: boolean) => {
    if (open) {
      markAllAsRead();
    }
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <DropdownMenu onOpenChange={handleDropdownOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} não lidas` : 'Nenhuma notificação nova'}
          </p>
        </div>

        <div className="divide-y">
          {loading ? (
            <div className="p-4 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Carregando notificações...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Nenhuma notificação.
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-muted/50 transition-colors ${
                  !notification.read ? 'bg-primary-light/30' : ''
                }`}
              >
                <div className="flex space-x-3">
                  {getIcon(notification.type)}
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {notifications.length > 0 && !loading && (
          <div className="p-3 border-t">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => toast({ title: "Funcionalidade não implementada", description: "Ainda não é possível ver todas as notificações." })}> 
              Ver todas as notificações
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
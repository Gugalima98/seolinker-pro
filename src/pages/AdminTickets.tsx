import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  HelpCircle, 
  Plus, 
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Search,
  Trash2,
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Define Ticket and TicketMessage types (should ideally be in a shared types file)
interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: 'Aberto' | 'Em Andamento' | '' | 'Resolvido' | 'Fechado';
  priority: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  category: string;
  created_at: string;
  updated_at: string;
  ticket_messages?: TicketMessage[]; // Optional for details view
  creator_email?: string | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  author_role: 'user' | 'admin' | 'client';
  message: string;
  created_at: string;
}

const AdminTickets = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isTicketDetailOpen, setIsTicketDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [newMessage, setNewMessage] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-tickets', {
        body: {
          searchTerm,
          statusFilter: statusFilter === 'all' ? undefined : statusFilter,
          priorityFilter: priorityFilter === 'all' ? undefined : priorityFilter,
          isAdminRequest: true, // This is the admin view
        },
      });

      if (error) throw error;

      setTickets(data.tickets);
    } catch (error: any) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Erro ao carregar tickets",
        description: error.message || "Ocorreu um erro ao buscar os tickets.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [searchTerm, statusFilter, priorityFilter]);

  // Realtime subscription for ticket messages
  useEffect(() => {
    if (!isTicketDetailOpen || !selectedTicket?.id) return;

    const channel = supabase
      .channel(`admin_ticket_messages_for_${selectedTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`,
        },
        (payload) => {
          console.log('AdminTickets.tsx: Received new message via Realtime:', payload.new);
          const newMessage = payload.new as TicketMessage;
          setSelectedTicket(prevTicket => {
            if (!prevTicket) return null;
            // Check if the message already exists to prevent duplicates from optimistic update
            if (prevTicket.ticket_messages?.some(msg => msg.id === newMessage.id)) {
              return prevTicket;
            }
            return {
              ...prevTicket,
              ticket_messages: [...(prevTicket.ticket_messages || []), newMessage],
            };
          });
        }
      )
      .subscribe();

    console.log('AdminTickets.tsx: Subscribing to Realtime for ticket:', selectedTicket.id);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isTicketDetailOpen, selectedTicket?.id]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [selectedTicket?.ticket_messages?.length]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !user?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke('send-ticket-message', {
        body: {
          ticket_id: selectedTicket.id,
          author_id: user.id,
          author_role: user.role || 'admin', // Assuming user.role is available, default to 'admin'
          message: newMessage,
        },
      });

      if (error) throw error;

      // Optimistically update the selected ticket with the new message
      const message: TicketMessage = {
        id: data.message.id, // Use ID from backend
        ticket_id: selectedTicket.id,
        author_id: user.id,
        author_role: data.message.author_role, // Use role from backend
        message: data.message.message,
        created_at: data.message.created_at,
      };

      const updatedTicket = {
        ...selectedTicket,
        messages: [...(selectedTicket.ticket_messages || []), message],
        updated_at: data.message.created_at, // Update with backend timestamp
      };

      setTickets(prevTickets =>
        prevTickets.map(ticket =>
          ticket.id === selectedTicket.id ? updatedTicket : ticket
        )
      );

      setSelectedTicket(updatedTicket);
      setNewMessage('');

      toast({
        title: "Mensagem enviada!",
        description: "Mensagem enviada com sucesso.",
      });
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: Ticket['status']) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-ticket-status', {
        body: { ticket_id: ticketId, status: newStatus },
      });

      if (error) throw error;

      setTickets(prevTickets =>
        prevTickets.map(ticket =>
          ticket.id === ticketId ? { ...ticket, status: newStatus, updated_at: data.ticket.updated_at } : ticket
        )
      );
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus, updated_at: data.ticket.updated_at } : null);
      }

      toast({
        title: "Status do Ticket Atualizado!",
        description: `Ticket #${ticketId} agora está ${newStatus}.`,
      });
    } catch (error: any) {
      console.error("Error updating ticket status:", error);
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Tem certeza que deseja excluir este ticket? Esta ação é irreversível.')) return;

    try {
      const { error } = await supabase.functions.invoke('delete-ticket', {
        body: { ticket_id: ticketId },
      });

      if (error) throw error;

      setTickets(prevTickets => prevTickets.filter(ticket => ticket.id !== ticketId));
      setIsTicketDetailOpen(false); // Close detail modal if deleted ticket was open

      toast({
        title: "Ticket Excluído!",
        description: `Ticket #${ticketId} foi excluído com sucesso.`,
      });
    } catch (error: any) {
      console.error("Error deleting ticket:", error);
      toast({
        title: "Erro ao excluir ticket",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Aberto':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'Em Andamento':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'Resolvido':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'Fechado':
        return <CheckCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return <HelpCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aberto': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'Em Andamento': return 'bg-warning/10 text-warning-foreground border-warning/20';
      case 'Resolvido': return 'bg-success/10 text-success border-success/20';
      case 'Fechado': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Crítica': return 'bg-destructive text-white';
      case 'Alta': return 'bg-destructive/20 text-destructive';
      case 'Média': return 'bg-warning/20 text-warning-foreground';
      case 'Baixa': return 'bg-success/20 text-success';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'Aberto').length,
    inProgress: tickets.filter(t => t.status === 'Em Andamento').length,
    resolved: tickets.filter(t => t.status === 'Resolvido').length
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Gerenciamento de Tickets</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todos os tickets de suporte.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <HelpCircle className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.open}</p>
            <p className="text-sm text-muted-foreground">Abertos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.inProgress}</p>
            <p className="text-sm text-muted-foreground">Em Andamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.resolved}</p>
            <p className="text-sm text-muted-foreground">Resolvidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar tickets..."
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
            <SelectItem value="Aberto">Aberto</SelectItem>
            <SelectItem value="Em Andamento">Em Andamento</SelectItem>
            <SelectItem value="Resolvido">Resolvido</SelectItem>
            <SelectItem value="Fechado">Fechado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Prioridades</SelectItem>
            <SelectItem value="Baixa">Baixa</SelectItem>
            <SelectItem value="Média">Média</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Crítica">Crítica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <HelpCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">
              Nenhum ticket encontrado
            </h3>
            <p className="text-muted-foreground mb-6">
              Ajuste sua pesquisa ou filtros.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket, index) => (
            <Card 
              key={ticket.id} 
              className="card-hover cursor-pointer animate-slide-up" 
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={async () => {
                // Fetch detailed ticket info including messages
                try {
                  const { data, error } = await supabase.functions.invoke('get-ticket-details', {
                    body: { ticket_id: ticket.id, isAdminRequest: true },
                  });
                  if (error) throw error;
                  setSelectedTicket(data.ticket);
                  setIsTicketDetailOpen(true);
                } catch (error: any) {
                  console.error("Error fetching ticket details:", error);
                  toast({
                    title: "Erro ao carregar detalhes do ticket",
                    description: error.message || "Ocorreu um erro ao buscar os detalhes do ticket.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(ticket.status)}
                      <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    
                    <p className="text-muted-foreground line-clamp-2">
                      {ticket.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>#{ticket.id}</span>
                      {ticket.creator_email && <span>{ticket.creator_email}</span>}
                      <span>{ticket.category}</span>
                      <span>
                        {formatDistanceToNow(new Date(ticket.created_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </span>
                      <span className="flex items-center space-x-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>{(ticket.ticket_messages && ticket.ticket_messages.length > 0) ? ticket.ticket_messages[0].count : 0}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Select value={ticket.status} onValueChange={(newStatus: Ticket['status']) => handleUpdateTicketStatus(ticket.id, newStatus)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Aberto">Aberto</SelectItem>
                        <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                        <SelectItem value="Resolvido">Resolvido</SelectItem>
                        <SelectItem value="Fechado">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="destructive" size="icon" onClick={(e) => {
                      e.stopPropagation(); // Prevent opening detail modal
                      handleDeleteTicket(ticket.id);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ticket Detail Modal */}
      <Dialog open={isTicketDetailOpen} onOpenChange={setIsTicketDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center space-x-2">
                  {selectedTicket && getStatusIcon(selectedTicket.status)}
                  <span>#{selectedTicket?.id} - {selectedTicket?.subject}</span>
                </DialogTitle>
                <DialogDescription>
                  Detalhes e histórico de mensagens do ticket.
                </DialogDescription>
                <div className="flex items-center space-x-2 mt-2">
                  {selectedTicket && (
                    <>
                      <Badge className={getStatusColor(selectedTicket.status)}>
                        {selectedTicket.status}
                      </Badge>
                      <Badge className={getPriorityColor(selectedTicket.priority)}>
                        {selectedTicket.priority}
                      </Badge>
                      <Badge variant="outline">{selectedTicket.category}</Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-4 pr-2">
            {selectedTicket?.ticket_messages?.map((message) => {
              const isCurrentUser = message.author_id === user?.id;

              return (
                <div
                  key={message.id}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-4 rounded-lg ${
                      isCurrentUser
                        ? 'bg-primary text-white'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <Avatar className="w-6 h-6">
                        {/* TODO: Fetch author avatar based on author_id */}
                        <AvatarFallback className="text-xs">
                          {message.author?.full_name?.charAt(0) || (isCurrentUser ? 'V' : message.author_role === 'admin' ? 'A' : 'C')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {message.author?.full_name || (isCurrentUser ? 'Você' : message.author_role === 'admin' ? 'Admin' : 'Cliente')}
                      </span>
                      <span className="text-xs opacity-75">
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </span>
                    </div>
                    <p className="text-sm">{message.message}</p>
                  </div>
                </div>
              );
            })}          </div>
          
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Digite sua mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTickets;

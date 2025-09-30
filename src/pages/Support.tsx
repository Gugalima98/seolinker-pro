import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  HelpCircle, 
  Plus, 
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Search,
  FileText,
  Phone,
  Mail,
  BookOpen,
  Video,
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase'; // Import supabase client

interface TicketMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  author_role: 'user' | 'admin' | 'client';
  message: string;
  created_at: string;
  author?: { full_name: string | null }; // Updated structure to match backend
}

const Support = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTicketDetailOpen, setIsTicketDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newMessage, setNewMessage] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: 'Geral' as const,
    priority: 'Média' as const
  });

  const fetchTickets = async () => {
    if (!user?.id) return; // Ensure user is logged in

    try {
      const { data, error } = await supabase.functions.invoke('get-tickets', {
        body: {
          user_id: user.id,
          searchTerm,
          statusFilter,
          isAdminRequest: false, // This is the user view
        },
      });

      if (error) throw error;

      setTickets(data.tickets.map((ticket: any) => {
        const messagesCount = (ticket.ticket_messages && ticket.ticket_messages.length > 0) ? ticket.ticket_messages[0].count : 0;
        return {
          ...ticket,
          createdAt: ticket.created_at,
          updatedAt: ticket.updated_at,
          messages: [], // Will be populated when details are fetched
          messagesCount,
        };
      }));
    } catch (error: any) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Erro ao carregar tickets",
        description: error.message || "Ocorreu um erro ao buscar seus tickets.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user?.id, searchTerm, statusFilter]);

  useEffect(() => {
    if (!selectedTicket?.id) return;

    const channel = supabase
      .channel(`ticket_messages_for_${selectedTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`,
        },
        (payload) => {
          console.log('Support.tsx: Received new message via Realtime:', payload.new);
          console.log('Support.tsx: Realtime payload.new.created_at:', payload.new.created_at);
          console.log('Support.tsx: new Date(payload.new.created_at):', new Date(payload.new.created_at));
          
          const receivedMessage = payload.new as TicketMessage;

          setSelectedTicket(prevTicket => {
            if (!prevTicket) return null;
            // Check if the message already exists to prevent duplicates from optimistic update
            if (prevTicket.ticket_messages.some(msg => msg.id === receivedMessage.id)) {
              return prevTicket;
            }
            return {
              ...prevTicket,
              ticket_messages: [...(prevTicket.ticket_messages || []), receivedMessage],
            };
          });
        }
      )
      .subscribe();

    console.log('Support.tsx: Subscribing to Realtime for ticket:', selectedTicket.id);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket?.id]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [selectedTicket?.ticket_messages]);

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.description || !user?.id) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios e certifique-se de estar logado.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-ticket', {
        body: {
          user_id: user.id,
          subject: newTicket.subject,
          description: newTicket.description,
          category: newTicket.category,
          priority: newTicket.priority,
        },
      });

      if (error) throw error;

      setTickets(prevTickets => [data.ticket, ...prevTickets]);
      setNewTicket({ subject: '', description: '', category: 'Geral', priority: 'Média' });
      setIsCreateModalOpen(false);

      toast({
        title: "Ticket criado com sucesso!",
        description: "Nossa equipe responderá em breve.",
      });
    } catch (error: any) {
      console.error("Error creating ticket:", error);
      toast({
        title: "Erro ao criar ticket",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !user?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke('send-ticket-message', {
        body: {
          ticket_id: selectedTicket.id,
          author_id: user.id,
          author_role: user.role || 'user', // Assuming user.role is available, default to 'user'
          message: newMessage,
        },
      });

      if (error) throw error;

      // Optimistically update the selected ticket with the new message
      const message: TicketMessage = {
        id: data.message.id,
        ticket_id: selectedTicket.id,
        author_id: user.id,
        author_role: user.role || 'user',
        message: data.message.message,
        created_at: data.message.created_at,
      };

      const updatedTicket = {
        ...selectedTicket,
        messages: [...(selectedTicket.messages || []), message],
        updatedAt: data.message.created_at, // Update with backend timestamp
      };

      setTickets(prevTickets =>
        prevTickets.map(ticket =>
          ticket.id === selectedTicket.id ? updatedTicket : ticket
        )
      );

      setSelectedTicket(updatedTicket);
      console.log('Updated selectedTicket after sending message:', updatedTicket);
      setNewMessage('');

      toast({
        title: "Mensagem enviada!",
        description: "Nossa equipe responderá em breve.",
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
          <h1 className="text-3xl font-bold gradient-text">Central de Suporte</h1>
          <p className="text-muted-foreground">
            Estamos aqui para ajudar você com qualquer dúvida ou problema
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow">
              <Plus className="h-4 w-4 mr-2" />
              Abrir Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Abrir Novo Ticket</DialogTitle>
              <DialogDescription>
                Descreva seu problema ou dúvida que nossa equipe ajudará você
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  placeholder="Descreva brevemente o problema"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select 
                    value={newTicket.category} 
                    onValueChange={(value: any) => setNewTicket({...newTicket, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Técnico">Técnico</SelectItem>
                      <SelectItem value="Billing">Faturamento</SelectItem>
                      <SelectItem value="Geral">Geral</SelectItem>
                      <SelectItem value="Bug Report">Bug Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select 
                    value={newTicket.priority} 
                    onValueChange={(value: any) => setNewTicket({...newTicket, priority: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Crítica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva detalhadamente o problema ou dúvida"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateTicket}>
                Criar Ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="tickets" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tickets">Meus Tickets</TabsTrigger>
          <TabsTrigger value="help">Central de Ajuda</TabsTrigger>
          <TabsTrigger value="contact">Contato</TabsTrigger>
        </TabsList>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="space-y-6">
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
          </div>

          {/* Tickets List */}
          {filteredTickets.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <HelpCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">
                  {tickets.length === 0 ? "Nenhum ticket criado" : "Nenhum ticket encontrado"}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {tickets.length === 0 
                    ? "Crie seu primeiro ticket quando precisar de ajuda" 
                    : "Tente ajustar sua pesquisa ou filtros"
                  }
                </p>
                <Button 
                  className="bg-gradient-to-r from-primary to-primary-hover"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Abrir Primeiro Ticket
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket, index) => (
                <Card 
                  key={ticket.id} 
                  className="card-hover cursor-pointer animate-slide-up" 
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={async () => {
                    console.log('Card clicked for ticket:', ticket.id);
                    console.log('Current user ID:', user?.id);
                    // Fetch detailed ticket info including messages
                    try {
                      const { data, error } = await supabase.functions.invoke('get-ticket-details', {
                        body: { ticket_id: ticket.id, user_id: user?.id, isAdminRequest: false }, // Pass user_id
                      });
                      if (error) throw error;
                      console.log('Support.tsx: Fetched ticket details:', data.ticket);
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
                          <span>{ticket.category}</span>
                          <span>
                            {ticket.createdAt ? formatDistanceToNow(new Date(ticket.createdAt), {
                              addSuffix: true,
                              locale: ptBR
                            }) : 'N/A'}
                          </span>
                          <span className="flex items-center space-x-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>{ticket.messagesCount || 0}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Help Center Tab */}
        <TabsContent value="help" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <FileText className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Guia de Primeiros Passos</CardTitle>
                <CardDescription>
                  Aprenda como configurar sua conta e criar seus primeiros backlinks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Ver Guia
                </Button>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <Video className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Tutoriais em Vídeo</CardTitle>
                <CardDescription>
                  Assista vídeos explicativos sobre todas as funcionalidades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Assistir Vídeos
                </Button>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <BookOpen className="w-8 h-8 text-primary mb-2" />
                <CardTitle>FAQ</CardTitle>
                <CardDescription>
                  Respostas para as perguntas mais frequentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Ver FAQ
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Popular Articles */}
          <Card>
            <CardHeader>
              <CardTitle>Artigos Populares</CardTitle>
              <CardDescription>
                Os artigos mais acessados da nossa base de conhecimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  'Como criar backlinks de qualidade',
                  'Entendendo métricas de SEO (DA, DR, etc.)',
                  'Melhores práticas para anchor text',
                  'Como escolher sites da rede para backlinks',
                  'Acompanhando resultados dos backlinks'
                ].map((title, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="font-medium">{title}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Fale Conosco</CardTitle>
                <CardDescription>
                  Diferentes formas de entrar em contato com nossa equipe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Mail className="w-8 h-8 text-primary" />
                  <div>
                    <h4 className="font-semibold">Email</h4>
                    <p className="text-sm text-muted-foreground">suporte@seobacklinks.com</p>
                    <p className="text-xs text-muted-foreground">Respondemos em até 2 horas</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Phone className="w-8 h-8 text-primary" />
                  <div>
                    <h4 className="font-semibold">WhatsApp</h4>
                    <p className="text-sm text-muted-foreground">(11) 99999-9999</p>
                    <p className="text-xs text-muted-foreground">Seg-Sex: 9h às 18h</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <MessageCircle className="w-8 h-8 text-primary" />
                  <div>
                    <h4 className="font-semibold">Chat ao Vivo</h4>
                    <p className="text-sm text-muted-foreground">Disponível 24/7</p>
                    <p className="text-xs text-muted-foreground">Clique no ícone no canto inferior</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Horário de Atendimento</CardTitle>
                <CardDescription>
                  Nossos horários de suporte por canal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Tickets (Email)</span>
                    <span className="text-muted-foreground">24/7</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">WhatsApp</span>
                    <span className="text-muted-foreground">Seg-Sex: 9h-18h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Chat ao Vivo</span>
                    <span className="text-muted-foreground">24/7</span>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h4 className="font-semibold mb-2">Tempo de Resposta</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Crítica: Até 1 hora</li>
                    <li>• Alta: Até 4 horas</li>
                    <li>• Média: Até 24 horas</li>
                    <li>• Baixa: Até 48 horas</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

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
              const authorDisplayName = message.author?.full_name || (isCurrentUser ? 'Você' : message.author_role === 'admin' ? 'Admin' : 'Cliente');

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
                                                {message.author?.full_name?.charAt(0) || (isCurrentUser ? 'E' : 'S')}
                                              </AvatarFallback>                      </Avatar>
                      <span className="text-sm font-medium">
                        {message.author?.full_name || (isCurrentUser ? 'Eu' : 'Suporte')}
                      </span>
                      <span className="text-xs opacity-75">
                        {(() => {
                          const date = new Date(message.created_at);
                          if (isNaN(date.getTime())) {
                            console.error('Support.tsx: Invalid date for message:', message.id, message.created_at);
                            return 'Data Inválida';
                          }
                          return formatDistanceToNow(date, {
                            addSuffix: true,
                            locale: ptBR
                          });
                        })()}
                      </span>
                    </div>
                    <p className="text-sm">{message.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
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

export default Support;
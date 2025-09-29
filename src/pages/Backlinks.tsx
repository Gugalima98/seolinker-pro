import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { PlusCircle, Loader2, ArrowLeft, Eye, Trash2, Calendar as CalendarIcon, Link, CheckCircle, RefreshCw } from 'lucide-react';
import { CreateBacklinkForm, CreateBacklinkFormValues } from '@/components/forms/CreateBacklinkForm';
import { SelectNetworkSiteView } from '@/components/views/SelectNetworkSiteView';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from "react-day-picker"
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { logEvent } from '@/lib/logger';

// Interfaces
interface Backlink {
  id: number;
  target_url: string;
  anchor_text: string;
  status: string;
  created_at: string;
  post_url?: string;
  article_title?: string;
  progress_percent?: number;
  client_sites: { url: string };
}
interface NetworkSite {
  id: number;
  domain: string;
}

const BacklinksPage = () => {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [stats, setStats] = useState({ total: 0, live: 0, processing: 0 });
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // State for multi-step modal
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<CreateBacklinkFormValues | null>(null);
  const [selectedNetworkSite, setSelectedNetworkSite] = useState<NetworkSite | null>(null);
  const [backlinkToDelete, setBacklinkToDelete] = useState<Backlink | null>(null);

  const [alertActionType, setAlertActionType] = useState<'create' | 'delete' | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    if (!user) return; // Ensure user is loaded

    const { count: total } = await supabase
      .from('backlinks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: live } = await supabase
      .from('backlinks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'live');

    const { count: processing } = await supabase
      .from('backlinks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['processing', 'pending']);

    setStats({
      total: total || 0,
      live: live || 0,
      processing: processing || 0,
    });
  }, [user]);

  const fetchBacklinks = useCallback(async () => {
    if (!user) return; // Ensure user is loaded

    setLoading(true);
    let query = supabase
      .from('backlinks')
      .select(`id, target_url, anchor_text, status, created_at, post_url, article_title, progress_percent, client_sites(url)`)
      .eq('user_id', user.id); // Filter by current user's ID

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    if (dateRange?.from) {
      query = query.gte('created_at', startOfDay(dateRange.from).toISOString());
    }
    if (dateRange?.to) {
      query = query.lte('created_at', endOfDay(dateRange.to).toISOString());
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Erro ao buscar backlinks", description: error.message, variant: "destructive" });
    } else {
      setBacklinks(data as any);
    }
    setLoading(false);
  }, [statusFilter, dateRange, toast, user]);

  useEffect(() => {
    if (user) {
      fetchBacklinks();
    }
  }, [fetchBacklinks, user]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }

    const channel = supabase.channel('public:backlinks')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'backlinks' },
        (payload) => {
          const updatedBacklink = payload.new as Backlink;
          setBacklinks(currentBacklinks =>
            currentBacklinks.map(b => 
              b.id === updatedBacklink.id ? { ...b, ...updatedBacklink } : b
            )
          );
          if (payload.old.status !== payload.new.status) {
            fetchStats();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats, user]);

  const resetFlow = () => {
    setStep(1);
    setStep1Data(null);
    setSelectedNetworkSite(null);
    setIsDialogOpen(false);
    setIsSubmitting(false);
    setAlertActionType(null);
  }

  const handleStep1Submit = (values: CreateBacklinkFormValues) => {
    setStep1Data(values);
    setStep(2);
  };

  const handleSiteSelection = (networkSite: NetworkSite) => {
    setSelectedNetworkSite(networkSite);
    setAlertActionType('create');
    setIsAlertOpen(true);
  }

  const handleFinalCreation = async () => {
    if (!step1Data || !selectedNetworkSite) return;

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        toast({ title: "Erro de autenticação", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const { data: newBacklink, error: insertError } = await supabase.from('backlinks').insert([{
      user_id: user.id,
      client_site_id: step1Data.client_site_id,
      network_site_id: selectedNetworkSite.id,
      target_url: step1Data.target_url,
      anchor_text: step1Data.anchor_text,
      status: 'pending',
    }]).select().single();

    if (insertError || !newBacklink) {
      logEvent('error', `Failed to create backlink record for ${step1Data.target_url}.`, { userId: user.id, error: insertError.message });
      toast({ title: "Erro ao criar registro do backlink", description: insertError.message, variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    // Insert notification for backlink creation
    await supabase.from('notifications').insert({
      user_id: user.id,
      message: `Seu backlink para ${newBacklink.target_url} está sendo processado.`, 
      type: 'info',
    });

    toast({ title: "Solicitação recebida!", description: "Iniciando o processamento do seu backlink..." });
    resetFlow();
    fetchBacklinks();
    fetchStats();

    try {
      const { error: functionError } = await supabase.functions.invoke('process-backlink', {
        body: { backlink_id: newBacklink.id },
      });

      if (functionError) throw functionError;

      logEvent('success', `Backlink creation process started for ${step1Data.target_url}.`, { userId: user.id, backlinkId: newBacklink.id });
      console.log("Edge function 'process-backlink' invocada com sucesso.");
      toast({ title: "Processamento em andamento!", description: "Seu artigo está sendo gerado e publicado." });

    } catch (e: any) {
      logEvent('error', `Failed to invoke process-backlink function for backlink ID ${newBacklink.id}.`, { userId: user.id, backlinkId: newBacklink.id, error: e.message });
      console.error("Erro ao invocar a Edge Function:", e);
      await supabase.from('backlinks').update({ status: 'error' }).eq('id', newBacklink.id);
      toast({ title: "Erro Crítico", description: "Não foi possível iniciar o processamento do backlink.", variant: "destructive" });
      fetchBacklinks();
    }
  }

  const handleDeleteClick = (backlink: Backlink) => {
    setBacklinkToDelete(backlink);
    setAlertActionType('delete');
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!backlinkToDelete) return;

    try {
      const { error } = await supabase.functions.invoke('delete-backlink', {
        body: { backlink_id: backlinkToDelete.id },
      });

      if (error) throw error;

      logEvent('success', `Backlink with ID ${backlinkToDelete.id} deleted successfully by user ${user?.email}.`, { userId: user?.id, backlinkId: backlinkToDelete.id });
      toast({ title: "Backlink deletado com sucesso!" });
      fetchBacklinks();
      fetchStats();

    } catch (error: any) {
      logEvent('error', `Failed to delete backlink with ID ${backlinkToDelete?.id}.`, { userId: user?.id, backlinkId: backlinkToDelete?.id, error: error.message });
      toast({ title: "Erro ao deletar backlink", description: error.message, variant: "destructive" });
    } finally {
      setIsAlertOpen(false);
      setBacklinkToDelete(null);
      setAlertActionType(null);
    }
  };

  const handleAlertAction = () => {
    if (alertActionType === 'create') {
      handleFinalCreation();
    } else if (alertActionType === 'delete') {
      confirmDelete();
    }
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetFlow(); else setIsDialogOpen(true); }}>
        <div className="p-4 space-y-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-3xl font-bold gradient-text">Meus Backlinks</h1>
              <p className="text-muted-foreground">Visualize e gerencie todos os seus backlinks criados.</p>
            </div>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow">
                <PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Backlink
              </Button>
            </DialogTrigger>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Backlinks</CardTitle>
                <Link className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Backlinks Ativos</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.live}</div>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.processing}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Histórico de Backlinks</CardTitle>
                <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                  <Select 
                    value={statusFilter} 
                    onValueChange={(value) => {
                      setStatusFilter(value === 'all' ? '' : value);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filtrar por status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-full sm:w-[300px] justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Selecione um período</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>

                  <Button variant="ghost" onClick={() => { setStatusFilter(''); setDateRange(undefined); }}>
                    Limpar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título do Artigo</TableHead>
                      <TableHead>Link de Destino</TableHead>
                      <TableHead>Texto Âncora</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></TableCell></TableRow>
                    ) : backlinks.length === 0 ? (
                       <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhum backlink encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      backlinks.map((backlink) => (
                        <TableRow key={backlink.id}>
                          <TableCell className="font-medium max-w-xs truncate">{backlink.article_title || 'N/A'}</TableCell>
                          <TableCell className="max-w-xs truncate">{backlink.target_url}</TableCell>
                          <TableCell className="max-w-xs truncate">{backlink.anchor_text}</TableCell>
                          <TableCell>
                            <div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${backlink.status === 'live' ? 'bg-green-100 text-green-800' : backlink.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {backlink.status}
                              </span>
                              {['processing', 'pending'].includes(backlink.status) && (
                                <Progress value={backlink.progress_percent || 0} className="mt-2 h-2" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{new Date(backlink.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {backlink.post_url && (
                              <Button variant="ghost" size="icon" className="mr-2" asChild>
                                <a href={backlink.post_url} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(backlink)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            {step === 2 && <Button variant="ghost" size="sm" className="absolute left-4 top-4" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>}
            <DialogTitle>Criar Novo Backlink (Etapa {step} de 2)</DialogTitle>
            <DialogDescription>
              {step === 1 ? 'Selecione o site, a URL de destino e o texto âncora.' : 'Selecione o melhor site da nossa rede para o seu backlink.'}
            </DialogDescription>
          </DialogHeader>
          {step === 1 && <CreateBacklinkForm onSubmit={handleStep1Submit} onCancel={resetFlow} isSubmitting={isSubmitting} />}
          {step === 2 && step1Data && <SelectNetworkSiteView clientSiteId={Number(step1Data.client_site_id)} onSiteSelect={handleSiteSelection} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={(open) => { setIsAlertOpen(open); if (!open) setAlertActionType(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alertActionType === 'create' ? 'Confirmar Criação do Backlink?' : 'Confirmar Exclusão?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alertActionType === 'create' ? (
                <>
                  Você está prestes a criar um backlink de <strong>{selectedNetworkSite?.domain}</strong> para <strong>{step1Data?.target_url}</strong> com o texto âncora "<strong>{step1Data?.anchor_text}</strong>".
                </>
              ) : (
                <>
                  Você tem certeza que deseja excluir o backlink para "<strong>{backlinkToDelete?.article_title || backlinkToDelete?.target_url}</strong>"?
                  Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAlertAction} disabled={isSubmitting}>
              {alertActionType === 'create' ? (isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar") : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BacklinksPage;
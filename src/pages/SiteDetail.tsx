import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, ArrowLeft, Globe, BarChart3, TrendingUp, Target, Link as LinkIcon, Eye, Trash2, PlusCircle } from 'lucide-react';
import { CreateBacklinkForm, CreateBacklinkFormValues } from '@/components/forms/CreateBacklinkForm';
import { SelectNetworkSiteView } from '@/components/views/SelectNetworkSiteView';

// Interfaces
interface NetworkSite {
  id: number;
  domain: string;
}

const SiteDetailPage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [site, setSite] = useState<any>(null);
  const [backlinks, setBacklinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State for Create Backlink Modal
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<CreateBacklinkFormValues | null>(null);
  const [selectedNetworkSite, setSelectedNetworkSite] = useState<NetworkSite | null>(null);

  useEffect(() => {
    const fetchSiteDetails = async () => {
      if (!siteId) return;
      setLoading(true);
      try {
        const [siteRes, backlinksRes] = await Promise.all([
          supabase.from('client_sites').select('*').eq('id', siteId).single(),
          supabase.from('backlinks').select('*').eq('client_site_id', siteId).order('created_at', { ascending: false })
        ]);

        if (siteRes.error) throw siteRes.error;
        if (backlinksRes.error) throw backlinksRes.error;

        setSite(siteRes.data);
        setBacklinks(backlinksRes.data);

      } catch (error: any) {
        toast({ title: "Erro ao carregar detalhes do site", description: error.message, variant: "destructive" });
        navigate('/sites');
      } finally {
        setLoading(false);
      }
    };

    fetchSiteDetails();

    // Inscreve-se para atualizações em tempo real nos backlinks deste site
    const channel = supabase
      .channel(`site-details-${siteId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'backlinks',
          filter: `client_site_id=eq.${siteId}`
        },
        (payload) => {
          // Ao receber uma atualização, busca novamente a lista de backlinks para manter a UI em sincronia
          supabase.from('backlinks').select('*').eq('client_site_id', siteId).order('created_at', { ascending: false })
            .then(({ data }) => {
              if (data) {
                setBacklinks(data);
              }
            });
        }
      )
      .subscribe();

    // Limpa a inscrição ao desmontar o componente
    return () => {
      supabase.removeChannel(channel);
    };

  }, [siteId, toast, navigate]);

  const handleDeleteSite = async () => {
    if (!siteId) return;
    if (!window.confirm("Tem certeza que deseja excluir este site? Todos os backlinks associados também serão excluídos. Esta ação é irreversível.")) {
      return;
    }
    try {
      toast({ title: "Iniciando exclusão...", description: "Buscando backlinks associados." });
      const { data: backlinks, error: fetchError } = await supabase.from('backlinks').select('id').eq('client_site_id', siteId);
      if (fetchError) throw new Error(`Falha ao buscar backlinks associados: ${fetchError.message}`);

      if (backlinks && backlinks.length > 0) {
        toast({ title: "Excluindo backlinks...", description: `Encontrados ${backlinks.length} backlinks para excluir.` });
        const deletePromises = backlinks.map(backlink => supabase.functions.invoke('delete-backlink', { body: { backlink_id: backlink.id } }));
        await Promise.all(deletePromises);
        toast({ title: "Backlinks excluídos!", description: "Todos os backlinks associados foram processados." });
      }

      const { error: deleteSiteError } = await supabase.from('client_sites').delete().eq('id', siteId);
      if (deleteSiteError) throw deleteSiteError;

      toast({ title: "Site excluído com sucesso!", variant: "success" });
      logEvent('success', `Site with ID ${siteId} and its backlinks deleted successfully by user ${user?.email}.`, { userId: user?.id, siteId });
      navigate('/sites');
    } catch (error: any) {
      logEvent('error', `Failed to delete site with ID ${siteId} for user ${user?.email}.`, { userId: user?.id, siteId, error: error.message });
      console.error("Failed to delete site and associated backlinks", error);
      toast({ title: "Erro ao excluir site", description: error.message || "Não foi possível concluir a exclusão do site e seus backlinks.", variant: "destructive" });
    }
  };

  // --- Handlers for Create Backlink Modal ---
  const resetFlow = () => {
    setStep(1);
    setStep1Data(null);
    setSelectedNetworkSite(null);
    setIsDialogOpen(false);
    setIsSubmitting(false);
    setIsAlertOpen(false);
  }

  const handleStep1Submit = (values: CreateBacklinkFormValues) => {
    setStep1Data(values);
    setStep(2);
  };

  const handleSiteSelection = (networkSite: NetworkSite) => {
    setSelectedNetworkSite(networkSite);
    setIsAlertOpen(true);
  }

  const handleFinalCreation = async () => {
    if (!step1Data || !selectedNetworkSite) return;
    setIsSubmitting(true);
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

    await supabase.from('notifications').insert({ user_id: user.id, message: `Seu backlink para ${newBacklink.target_url} está sendo processado.`, type: 'info' });
    toast({ title: "Solicitação recebida!", description: "Iniciando o processamento do seu backlink..." });
    resetFlow();
    // Re-fetch backlinks for this site
    const { data, error } = await supabase.from('backlinks').select('*').eq('client_site_id', siteId).order('created_at', { ascending: false });
    if (!error) setBacklinks(data);

    try {
      const { error: functionError } = await supabase.functions.invoke('process-backlink', { body: { backlink_id: newBacklink.id } });
      if (functionError) throw functionError;
      logEvent('success', `Backlink creation process started for ${step1Data.target_url}.`, { userId: user.id, backlinkId: newBacklink.id });
    } catch (e: any) {
      logEvent('error', `Failed to invoke process-backlink function for backlink ID ${newBacklink.id}.`, { userId: user.id, backlinkId: newBacklink.id, error: e.message });
      await supabase.from('backlinks').update({ status: 'error' }).eq('id', newBacklink.id);
      toast({ title: "Erro Crítico", description: "Não foi possível iniciar o processamento do backlink.", variant: "destructive" });
    }
  }

  const handleAlertAction = () => {
    handleFinalCreation();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (!site) {
    return <div className="text-center text-muted-foreground">Site não encontrado.</div>;
  }

  return (
    <>
      <div className="space-y-8 animate-fade-in">
        <div>
          <Button variant="ghost" onClick={() => navigate('/sites')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Meus Sites
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <Globe className="h-10 w-10 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold">{site.url}</h1>
                    <p className="text-muted-foreground">Detalhes do site e backlinks associados.</p>
                </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={() => setIsDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar Backlink
              </Button>
              <Button variant="destructive" onClick={handleDeleteSite}>
                <Trash2 className="mr-2 h-4 w-4" />
                Deletar Site
              </Button>
            </div>
          </div>
        </div>

        {/* Métricas do Site */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center"><BarChart3 className="mr-2 h-4 w-4"/> Domain Authority</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{site.da || '-'}</p></CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center"><TrendingUp className="mr-2 h-4 w-4"/> Backlinks</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{site.backlinks?.toLocaleString() || '-'}</p></CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center"><Globe className="mr-2 h-4 w-4"/> Ref. Domains</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{site.ref_domains || '-'}</p></CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center"><Target className="mr-2 h-4 w-4"/> Organic Keywords</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{site.organic_keywords || '-'}</p></CardContent>
            </Card>
        </div>

        {/* Tabela de Backlinks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><LinkIcon className="mr-2 h-5 w-5"/> Backlinks para {site.url}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título do Artigo</TableHead>
                    <TableHead>Texto Âncora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backlinks.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum backlink criado para este site.</TableCell></TableRow>
                  ) : (
                    backlinks.map((backlink) => (
                      <TableRow key={backlink.id}>
                        <TableCell className="font-medium max-w-xs truncate">{backlink.article_title || 'N/A'}</TableCell>
                        <TableCell>{backlink.anchor_text}</TableCell>
                        <TableCell>
                          <Badge variant={backlink.status === 'live' ? 'default' : 'secondary'} className={backlink.status === 'live' ? 'bg-green-500' : ''}>{backlink.status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(backlink.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          {backlink.post_url && (
                            <Button variant="ghost" size="icon" asChild>
                              <a href={backlink.post_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4" /></a>
                            </Button>
                          )}
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

      {/* Create Backlink Modal */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetFlow(); else setIsDialogOpen(true); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            {step === 2 && <Button variant="ghost" size="sm" className="absolute left-4 top-4" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>}
            <DialogTitle>Criar Novo Backlink (Etapa {step} de 2)</DialogTitle>
            <DialogDescription>
              {step === 1 ? `Criando backlink para ${site.url}. Preencha a URL de destino e o texto âncora.` : 'Selecione o melhor site da nossa rede para o seu backlink.'}
            </DialogDescription>
          </DialogHeader>
          {step === 1 && <CreateBacklinkForm onSubmit={handleStep1Submit} onCancel={resetFlow} isSubmitting={isSubmitting} preselectedSiteId={siteId} />}
          {step === 2 && step1Data && <SelectNetworkSiteView clientSiteId={Number(step1Data.client_site_id)} onSiteSelect={handleSiteSelection} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={(open) => { setIsAlertOpen(open); if (!open) resetFlow(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Criação do Backlink?</AlertDialogTitle>
            <AlertDialogDescription>
                Você está prestes a criar um backlink de <strong>{selectedNetworkSite?.domain}</strong> para <strong>{step1Data?.target_url}</strong> com o texto âncora "<strong>{step1Data?.anchor_text}</strong>".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAlertAction} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SiteDetailPage;

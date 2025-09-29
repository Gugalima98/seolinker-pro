
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { NetworkSiteForm, NetworkSiteFormValues } from '@/components/NetworkSiteForm';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Edit, Trash2, PlusCircle, Network, BarChart2, Tag } from 'lucide-react';

// A interface deve corresponder à estrutura da sua tabela no Supabase
export interface NetworkSite {
  id: number;
  domain: string;
  username: string;
  application_password?: string; // Campo sensível
  api_url: string;
  primary_niche: string;
  secondary_niche?: string;
  tertiary_niche?: string;
  da: number;
  domain_age: number;
  created_at?: string;
}

const AdminNetworkSites = () => {
  const [sites, setSites] = useState<NetworkSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<NetworkSite | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<NetworkSite | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchNetworkSites = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('network_sites')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      toast({ title: "Erro ao buscar sites", description: error.message, variant: "destructive" });
    } else {
      setSites(data as NetworkSite[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNetworkSites();
  }, []);

  const handleFormSubmit = async (values: NetworkSiteFormValues) => {
    setIsSubmitting(true);
    const payload = { ...values };

    try {
      let error;
      if (editingSite) {
        // Update
        const { error: updateError } = await supabase
          .from('network_sites')
          .update(payload)
          .eq('id', editingSite.id);
        error = updateError;
      } else {
        // Create
        const { error: insertError } = await supabase
          .from('network_sites')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      if (!editingSite) {
        // If it was a creation, send a notification to the admin who created it
        await supabase.from('notifications').insert({
          user_id: user?.id, // Assuming the admin is the current user
          message: `Novo site da rede ${payload.domain} adicionado.`, 
          type: 'info',
        });
      }

      toast({ title: `Site ${editingSite ? 'atualizado' : 'criado'} com sucesso!` });
      setIsDialogOpen(false);
      setEditingSite(null);
      fetchNetworkSites(); // Refresh data
    } catch (error: any) {
      toast({ title: "Erro ao salvar o site", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (site: NetworkSite) => {
    setEditingSite(site);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (site: NetworkSite) => {
    setSiteToDelete(site);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!siteToDelete) return;
    
    const { error } = await supabase
      .from('network_sites')
      .delete()
      .eq('id', siteToDelete.id);

    if (error) {
      toast({ title: "Erro ao deletar site", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Site deletado com sucesso!" });
      fetchNetworkSites(); // Refresh data
    }
    setIsAlertOpen(false);
    setSiteToDelete(null);
  };

  // Calcular métricas
  const totalSites = sites.length;
  const totalDA = sites.reduce((sum, site) => sum + site.da, 0);
  const averageDA = totalSites > 0 ? Math.round(totalDA / totalSites) : 0;
  const uniqueNiches = new Set(sites.map(site => site.primary_niche)).size;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <div className="p-4 space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Gerenciamento de Sites da Rede</h1>
            <p className="text-muted-foreground">Visualize e gerencie todos os sites da sua rede.</p>
          </div>
          <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow"
                onClick={() => setEditingSite(null) }
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Site
              </Button>
          </DialogTrigger>
        </div>

        {/* Cards de estatísticas... */}

        <Card>
          <CardHeader><CardTitle>Lista de Sites da Rede</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Domínio</TableHead>
                    <TableHead>Nicho Primário</TableHead>
                    <TableHead>DA</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center">Carregando...</TableCell></TableRow>
                  ) : (
                    sites.map((site) => (
                      <TableRow key={site.id}>
                        <TableCell>{site.id}</TableCell>
                        <TableCell>{site.domain}</TableCell>
                        <TableCell>{site.primary_niche}</TableCell>
                        <TableCell>{site.da}</TableCell>
                        <TableCell>{site.domain_age} anos</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEditClick(site)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(site)}>
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

        {/* Dialog para Adicionar/Editar */}
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingSite ? 'Editar Site' : 'Adicionar Novo Site'}</DialogTitle>
          </DialogHeader>
          <NetworkSiteForm
            onSubmit={handleFormSubmit}
            onCancel={() => setIsDialogOpen(false)}
            initialData={editingSite || {}}
            isSubmitting={isSubmitting}
          />
        </DialogContent>

        {/* Alert Dialog para Deletar */}
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso irá deletar permanentemente o site da rede.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Continuar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </Dialog>
  );
};

export default AdminNetworkSites;

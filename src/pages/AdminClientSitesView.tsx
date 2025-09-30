import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ClientSite } from '@/pages/Sites'; // Reusing the interface from Sites.tsx
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
import { Eye, Globe, BarChart2, LinkIcon } from 'lucide-react';

<<<<<<< HEAD
// Extend the ClientSite interface to include the user email
interface AdminClientSite extends ClientSite {
  user_email: string;
}

const AdminClientSitesView = () => {
  const [sites, setSites] = useState<AdminClientSite[]>([]);
=======
const AdminClientSitesView = () => {
  const [sites, setSites] = useState<ClientSite[]>([]);
>>>>>>> 613e8d118da6e6f17540fbc2d40e9393326c947e
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSites = async () => {
      try {
<<<<<<< HEAD
        // Invoke the new edge function
        const { data, error } = await supabase.functions.invoke('get-admin-client-sites');
        
        if (error) throw error;

        // The data from the function is in a 'sites' property
        setSites(data.sites || []);
=======
        const { data, error } = await supabase
          .from('client_sites')
          .select('*');
        if (error) throw error;
        setSites(data || []);
>>>>>>> 613e8d118da6e6f17540fbc2d40e9393326c947e
      } catch (error) {
        console.error('Error fetching client sites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, []);

  // Calcular métricas
  const totalClientSites = sites.length;
  const totalClientDA = sites.reduce((sum, site) => sum + (site.da || 0), 0);
  const averageClientDA = totalClientSites > 0 ? Math.round(totalClientDA / totalClientSites) : 0;
  const totalClientBacklinks = sites.reduce((sum, site) => sum + (site.backlinks || 0), 0);

  if (loading) {
    return <div>Carregando...</div>; // Add a loading state
  }


  return (
    <div className="p-4 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Sites dos Clientes</h1>
          <p className="text-muted-foreground">
            Visualize todos os sites cadastrados pelos clientes.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Sites</CardTitle>
            <Globe className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">{totalClientSites}</div>
            <p className="text-xs text-muted-foreground">
              Sites de clientes cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DA Médio</CardTitle>
            <BarChart2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">{averageClientDA}</div>
            <p className="text-xs text-muted-foreground">
              Domain Authority médio dos sites
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Backlinks</CardTitle>
            <LinkIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">{totalClientBacklinks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Backlinks totais dos sites de clientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Client Sites List Card */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Sites de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
<<<<<<< HEAD
                  <TableHead>Cliente</TableHead>
=======
>>>>>>> 613e8d118da6e6f17540fbc2d40e9393326c947e
                  <TableHead>URL</TableHead>
                  <TableHead>Nicho</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>DA</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell className="font-medium">{site.id}</TableCell>
<<<<<<< HEAD
                    <TableCell>{site.user_email}</TableCell>
=======
>>>>>>> 613e8d118da6e6f17540fbc2d40e9393326c947e
                    <TableCell>{site.url}</TableCell>
                    <TableCell>{site.niche_primary}</TableCell>
                    <TableCell>{site.type}</TableCell>
                    <TableCell>{site.da}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminClientSitesView;
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ApiKey {
  id: number;
  service_name: string;
  api_key: string;
  created_at: string;
}

const supportedServices = [
  // AI Models
  { value: 'openai', label: 'OpenAI (GPT-4, GPT-3.5, etc.)' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'claude', label: 'Anthropic Claude' },
  { value: 'deepseek', label: 'DeepSeek' },
  // Image Services
  { value: 'pexels', label: 'Pexels (Imagens)' },
  // SEO Tools
  { value: 'moz', label: 'Moz API' },
  { value: 'ahrefs', label: 'Ahrefs API' },
  { value: 'semrush', label: 'Domain Metrics (RapidAPI)' },
];

const AdminApis = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState<Partial<ApiKey> | null>(null);

  useEffect(() => {
    const fetchApiKeys = async () => {
      if (user?.role !== 'admin') {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setApiKeys(data || []);
      } catch (error) {
        console.error("Failed to fetch API keys", error);
        toast({ title: "Erro ao carregar chaves de API", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchApiKeys();
  }, [user, toast]);

  const handleSave = async () => {
    if (!currentApiKey || !currentApiKey.service_name || !currentApiKey.api_key) {
      toast({ title: "Erro", description: "Nome do serviço e chave de API são obrigatórios.", variant: "destructive" });
      return;
    }

    try {
      let savedApiKey: ApiKey;
      if (currentApiKey.id) { // Update
        const { data, error } = await supabase
          .from('api_keys')
          .update({ api_key: currentApiKey.api_key })
          .eq('id', currentApiKey.id)
          .select()
          .single();
        if (error) throw error;
        savedApiKey = data;
        setApiKeys(apiKeys.map(k => k.id === savedApiKey.id ? savedApiKey : k));
      } else { // Insert
        const { data, error } = await supabase
          .from('api_keys')
          .insert({ service_name: currentApiKey.service_name, api_key: currentApiKey.api_key })
          .select()
          .single();
        if (error) throw error;
        savedApiKey = data;
        setApiKeys([savedApiKey, ...apiKeys]);
      }
      toast({ title: "Sucesso", description: "Chave de API salva com sucesso." });
      setIsDialogOpen(false);
      setCurrentApiKey(null);
    } catch (error: any) {
      console.error("Failed to save API key", error);
      if (error.code === '23505') { // Handle unique constraint violation
        toast({ title: "Erro ao salvar chave de API", description: "Já existe uma chave para este serviço.", variant: "destructive" });
      } else {
        toast({ title: "Erro ao salvar chave de API", variant: "destructive" });
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja deletar esta chave de API?")) return;
    try {
      const { error } = await supabase.from('api_keys').delete().eq('id', id);
      if (error) throw error;
      setApiKeys(apiKeys.filter(k => k.id !== id));
      toast({ title: "Sucesso", description: "Chave de API deletada com sucesso." });
    } catch (error) {
      console.error("Failed to delete API key", error);
      toast({ title: "Erro ao deletar chave de API", variant: "destructive" });
    }
  };

  const openDialog = (apiKey: Partial<ApiKey> | null = null) => {
    setCurrentApiKey(apiKey || { service_name: '', api_key: '' });
    setIsDialogOpen(true);
  };
  
  const getServiceLabel = (value: string) => {
    return supportedServices.find(s => s.value === value)?.label || value;
  }

  if (loading) return <div className="p-4">Carregando chaves de API...</div>;
  if (user?.role !== 'admin') return <div className="p-4">Acesso negado. Você precisa ser um administrador para ver esta página.</div>;

  return (
    <div className="p-4 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Gerenciar Chaves de API</h1>
          <p className="text-muted-foreground">
            Adicione e edite as chaves de API para serviços externos.
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Nova Chave de API
        </Button>
      </div>

      {/* API Keys List Card */}
      <Card>
        <CardHeader>
          <CardTitle>Chaves de API Salvas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Chave de API (parcial)</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.length > 0 ? apiKeys.map(key => (
                  <TableRow key={key.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{getServiceLabel(key.service_name)}</TableCell>
                    <TableCell>****...{key.api_key.slice(-4)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDialog(key)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive-foreground" onClick={() => handleDelete(key.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                      <TableCell colSpan={3} className="text-center h-24">Nenhuma chave de API encontrada.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog for Add/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentApiKey?.id ? 'Editar' : 'Nova'} Chave de API</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="service_name">Nome do Serviço</Label>
              <Select
                value={currentApiKey?.service_name || ''}
                onValueChange={(value) => setCurrentApiKey({ ...currentApiKey, service_name: value })}
                disabled={!!currentApiKey?.id} // Disable if editing
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {supportedServices.map(service => (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="api_key">Chave de API</Label>
              <Input
                id="api_key"
                type="password"
                placeholder={currentApiKey?.service_name === 'semrush' ? 'YOUR_RAPIDAPI_KEY,domain-metrics-check.p.rapidapi.com' : 'sk-...'}
                value={currentApiKey?.api_key || ''}
                onChange={(e) => setCurrentApiKey({ ...currentApiKey, api_key: e.target.value })}
              />
              {currentApiKey?.service_name === 'semrush' && (
                <p className="text-sm text-muted-foreground mt-1">
                  Para Domain Metrics (RapidAPI), insira sua `X-RapidAPI-Key` e `X-RapidAPI-Host` separados por vírgula. Ex: `SUA_CHAVE,domain-metrics-check.p.rapidapi.com`
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminApis;
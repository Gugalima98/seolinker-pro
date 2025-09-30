import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Prompt {
  id: number;
  name: string;
  content: string;
  created_at: string;
}

const AdminPrompts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<Partial<Prompt> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPrompts = async () => {
      if (user?.role !== 'admin') {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.from('prompts').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setPrompts(data || []);
      } catch (error) {
        console.error("Failed to fetch prompts", error);
        toast({ title: "Erro ao carregar prompts", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchPrompts();
  }, [user, toast]);

  const handleSave = async () => {
    if (!currentPrompt || !currentPrompt.name || !currentPrompt.content) {
      toast({ title: "Erro", description: "Nome e conteúdo são obrigatórios.", variant: "destructive" });
      return;
    }

    try {
      let savedPrompt: Prompt;
      if (currentPrompt.id) { // Update
        const { data, error } = await supabase
          .from('prompts')
          .update({ name: currentPrompt.name, content: currentPrompt.content })
          .eq('id', currentPrompt.id)
          .select()
          .single();
        if (error) throw error;
        savedPrompt = data;
        setPrompts(prompts.map(p => p.id === savedPrompt.id ? savedPrompt : p));
      } else { // Insert
        const { data, error } = await supabase
          .from('prompts')
          .insert({ name: currentPrompt.name, content: currentPrompt.content })
          .select()
          .single();
        if (error) throw error;
        savedPrompt = data;
        setPrompts([savedPrompt, ...prompts]);
      }
      toast({ title: "Sucesso", description: "Prompt salvo com sucesso." });
      setIsDialogOpen(false);
      setCurrentPrompt(null);
    } catch (error) {
      console.error("Failed to save prompt", error);
      toast({ title: "Erro ao salvar prompt", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja deletar este prompt?")) return;
    try {
      const { error } = await supabase.from('prompts').delete().eq('id', id);
      if (error) throw error;
      setPrompts(prompts.filter(p => p.id !== id));
      toast({ title: "Sucesso", description: "Prompt deletado com sucesso." });
    } catch (error) {
      console.error("Failed to delete prompt", error);
      toast({ title: "Erro ao deletar prompt", variant: "destructive" });
    }
  };

  const openDialog = (prompt: Partial<Prompt> | null = null) => {
    setCurrentPrompt(prompt || { name: '', content: '' });
    setIsDialogOpen(true);
  };

  const filteredPrompts = prompts.filter(prompt =>
    prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-4">Carregando prompts...</div>;
  if (user?.role !== 'admin') return <div className="p-4">Acesso negado. Você precisa ser um administrador para ver esta página.</div>;

  return (
    <div className="p-4 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Gerenciar Prompts</h1>
          <p className="text-muted-foreground">
            Crie e edite os prompts que serão usados pela IA.
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Novo Prompt
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar prompts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Prompts List Card */}
      <Card>
        <CardHeader>
          <CardTitle>Prompts Salvos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrompts.length > 0 ? filteredPrompts.map(prompt => (
                  <TableRow key={prompt.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{prompt.name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDialog(prompt)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive-foreground" onClick={() => handleDelete(prompt.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                      <TableCell colSpan={2} className="text-center h-24">Nenhum prompt encontrado.</TableCell>
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
            <DialogTitle>{currentPrompt?.id ? 'Editar' : 'Novo'} Prompt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Prompt</Label>
              <Input
                id="name"
                placeholder="Ex: Detector de Nicho para Sitemap"
                value={currentPrompt?.name || ''}
                onChange={(e) => setCurrentPrompt({ ...currentPrompt, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo do Prompt</Label>
              <Textarea
                id="content"
                placeholder="Você é um especialista em SEO..."
                value={currentPrompt?.content || ''}
                onChange={(e) => setCurrentPrompt({ ...currentPrompt, content: e.target.value })}
                rows={10}
              />
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

export default AdminPrompts;
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Download, Upload } from 'lucide-react';
import Papa from 'papaparse';

const dataTypeOptions = [
  { value: 'users', label: 'Usuários' },
  { value: 'client_sites', label: 'Sites de Clientes' },
  { value: 'network_sites', label: 'Sites da Rede' },
  { value: 'backlinks', label: 'Backlinks' },
];

const templates: Record<string, string> = {
  users: 'email,name,role,plan_id,trial_end_date',
  client_sites: 'user_email,site_url,site_type,da,backlinks,ref_domains,organic_keywords',
  network_sites: 'domain,api_url,username,application_password,primary_niche,secondary_niche,tertiary_niche,da,backlinks,ref_domains',
  backlinks: 'client_site_url,network_site_domain,target_url,anchor_text',
};

const AdminBulkImport = () => {
  const { toast } = useToast();
  const [dataType, setDataType] = useState<string>('users');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progressMessage, setProgressMessage] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
      setResult(null); // Limpa resultados antigos ao selecionar novo arquivo
      setProgressMessage('');
    }
  };

  const handleDownloadTemplate = () => {
    const header = templates[dataType];
    const blob = new Blob([header], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${dataType}_template.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = () => {
    if (!file) {
      toast({ title: "Nenhum arquivo selecionado", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);
    setProgressMessage('Lendo arquivo...');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        const BATCH_SIZE = 25;
        const batches = [];
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          batches.push(rows.slice(i, i + BATCH_SIZE));
        }

        let totalSuccess = 0;
        let totalErrors: string[] = [];

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          setProgressMessage(`Processando lote ${i + 1} de ${batches.length}... (${batch.length} registros)`);
          try {
            const { data, error } = await supabase.functions.invoke('bulk-import', {
              body: { dataType, rows: batch }, // Envia as linhas pré-parseadas
            });

            if (error) throw error;

            totalSuccess += data.successCount;
            if (data.errors && data.errors.length > 0) {
              totalErrors = totalErrors.concat(data.errors);
            }

          } catch (error: any) {
            toast({ title: `Erro no lote ${i + 1}`, description: error.message, variant: "destructive" });
            // Para a importação se um lote falhar completamente
            setLoading(false);
            setProgressMessage('Importação falhou.');
            return;
          }
        }

        setResult({ successCount: totalSuccess, errorCount: totalErrors.length, errors: totalErrors });
        setProgressMessage('Importação concluída!');
        setLoading(false);
      }
    });
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Importação em Massa</h1>
      <Card>
        <CardHeader>
          <CardTitle>Importar Dados via CSV</CardTitle>
          <CardDescription>Selecione o tipo de dado, baixe o modelo, preencha e faça o upload do arquivo CSV para importar em massa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label>1. Selecione o Tipo de Dado</Label>
              <Select value={dataType} onValueChange={setDataType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dataTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleDownloadTemplate}><Download className="mr-2 h-4 w-4"/> Baixar Modelo</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2 md:col-span-2">
              <Label>2. Faça o Upload do Arquivo CSV</Label>
              <Input type="file" accept=".csv" onChange={handleFileChange} />
            </div>
            <Button onClick={handleImport} disabled={loading || !file}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {loading ? progressMessage : 'Importar Dados'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader><CardTitle>Resultados da Importação</CardTitle></CardHeader>
          <CardContent>
            <p><strong>Sucesso:</strong> {result.successCount} registros criados.</p>
            <p><strong>Falhas:</strong> {result.errorCount} registros falharam.</p>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold">Detalhes dos Erros:</h4>
                <ul className="list-disc list-inside text-sm text-red-500 bg-red-50 p-4 rounded-md mt-2">
                  {result.errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminBulkImport;

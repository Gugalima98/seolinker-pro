import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Updated interface to match the logs table schema
interface LogEntry {
  id: number;
  created_at: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  meta: object | null;
}

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Filter, Info, AlertTriangle, XCircle, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AdminLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<LogEntry['level'] | 'all'>('all');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000); // Limit to the latest 1000 logs for performance

        if (error) throw error;

        setLogs(data || []);
      } catch (error: any) {
        toast({
          title: "Erro ao carregar logs",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const getBadgeVariant = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'default';
      case 'warn':
        return 'secondary';
      case 'error':
        return 'destructive';
      case 'success':
        return 'success';
      default:
        return 'default';
    }
  };

  // Calcular métricas
  const totalLogs = logs.length;
  const infoLogs = logs.filter(log => log.level === 'info').length;
  const warnLogs = logs.filter(log => log.level === 'warn').length;
  const errorLogs = logs.filter(log => log.level === 'error').length;

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterLevel === 'all' || log.level === filterLevel;
    return matchesSearch && matchesFilter;
  });

  const tableRowsContent = filteredLogs.length === 0 ? (
    <TableRow>
      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
        {loading ? 'Carregando logs...' : 'Nenhum log encontrado.'}
      </TableCell>
    </TableRow>
  ) : (
    <>
      {filteredLogs.map((log) => (
        <TableRow key={log.id} onClick={() => setSelectedLog(log)} className="cursor-pointer hover:bg-muted/50">
          <TableCell className="font-medium">{new Date(log.created_at).toLocaleString()}</TableCell>
          <TableCell>
            <Badge variant={getBadgeVariant(log.level)}>{log.level.toUpperCase()}</Badge>
          </TableCell>
          <TableCell>{log.message}</TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <div className="p-4 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Logs da Plataforma</h1>
          <p className="text-muted-foreground">
            Visualize e filtre os logs de eventos da aplicação.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">{totalLogs}</div>
            <p className="text-xs text-muted-foreground">
              Registros de eventos na plataforma
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logs INFO</CardTitle>
            <Info className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">{infoLogs}</div>
            <p className="text-xs text-muted-foreground">
              Informações gerais
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logs WARN</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">{warnLogs}</div>
            <p className="text-xs text-muted-foreground">
              Avisos e potenciais problemas
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logs ERROR</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">{errorLogs}</div>
            <p className="text-xs text-muted-foreground">
              Erros críticos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterLevel} onValueChange={(value: LogEntry['level'] | 'all') => setFilterLevel(value)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filtrar por Nível" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Níveis</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warn</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="success">Success</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs List Card */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Mensagem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRowsContent}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
            <DialogDescription>
              Informações completas sobre o log selecionado.
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="timestamp" className="text-right">
                  Timestamp
                </Label>
                <Input id="timestamp" value={new Date(selectedLog.created_at).toLocaleString()} readOnly className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="level" className="text-right">
                  Nível
                </Label>
                <Input id="level" value={selectedLog.level.toUpperCase()} readOnly className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="message" className="text-right">
                  Mensagem
                </Label>
                <Input id="message" value={selectedLog.message} readOnly className="col-span-3" />
              </div>
              {selectedLog.meta && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="meta" className="text-right mt-2">
                    Meta
                  </Label>
                  <pre className="col-span-3 text-xs bg-muted p-4 rounded-md overflow-x-auto">
                    {JSON.stringify(selectedLog.meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLogs;

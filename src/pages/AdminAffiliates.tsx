import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, DollarSign, Edit } from 'lucide-react';

const AdminAffiliates = () => {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null); // Stores the affiliate ID being paid
  const [editingAffiliate, setEditingAffiliate] = useState<any>(null); // Affiliate being edited
  const [newRate, setNewRate] = useState('');
  const [defaultRate, setDefaultRate] = useState(''); // State for the default rate input

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-admin-affiliate-stats');
      if (error) throw error;
      setData(data);

      // Find and set the default commission rate for the input field
      const defaultRateSetting = data.settings.find((s: any) => s.key === 'default_affiliate_commission');
      if (defaultRateSetting) {
        setDefaultRate(defaultRateSetting.value);
      }

    } catch (error: any) {
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePayout = async (affiliateId: string, referralIds: string[]) => {
    setPaying(affiliateId);
    try {
      const { error } = await supabase.functions.invoke('create-payout', {
        body: { referral_ids: referralIds },
      });
      if (error) throw error;
      toast({ title: "Pagamento enviado com sucesso!", description: "A transferência para o afiliado foi iniciada.", variant: "success" });
      fetchData(); // Refresh data after payout
    } catch (error: any) {
      toast({ title: "Erro ao processar pagamento", description: error.message, variant: "destructive" });
    } finally {
      setPaying(null);
    }
  };

  const handleUpdateRate = async () => {
    if (!editingAffiliate) return;

    try {
      const rate = parseFloat(newRate);
      if (isNaN(rate) || rate < 0 || rate > 1) {
        toast({ title: "Taxa inválida", description: "A taxa deve ser um número entre 0 e 1 (ex: 0.5 para 50%).", variant: "destructive" });
        return;
      }

      const { error } = await supabase.functions.invoke('update-affiliate-commission', {
        body: { affiliate_id: editingAffiliate.id, commission_rate: rate },
      });

      if (error) throw error;

      toast({ title: "Taxa de comissão atualizada!", variant: "success" });
      setEditingAffiliate(null);
      setNewRate('');
      fetchData(); // Refresh data

    } catch (error: any) {
      toast({ title: "Erro ao atualizar taxa", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateDefaultRate = async () => {
    try {
      const rate = parseFloat(defaultRate);
      if (isNaN(rate) || rate < 0 || rate > 1) {
        toast({ title: "Taxa inválida", description: "A taxa deve ser um número entre 0 e 1 (ex: 0.5 para 50%).", variant: "destructive" });
        return;
      }

      const { error } = await supabase.functions.invoke('update-setting', {
        body: { key: 'default_affiliate_commission', value: defaultRate },
      });

      if (error) throw error;
      toast({ title: "Taxa padrão atualizada com sucesso!", variant: "success" });
      fetchData();

    } catch (error: any) {
      toast({ title: "Erro ao atualizar taxa padrão", description: error.message, variant: "destructive" });
    }
  };

  if (loading || !data) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const payoutsByAffiliate = data.pending_payouts.reduce((acc: any, referral: any) => {
    acc[referral.affiliate_id] = acc[referral.affiliate_id] || [];
    acc[referral.affiliate_id].push(referral);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Gestão de Afiliados</h1>

      <Card>
        <CardHeader>
          <CardTitle>Configuração Geral</CardTitle>
          <CardDescription>Defina a taxa de comissão padrão para novos afiliados.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center space-x-4">
          <div className="flex-grow">
            <Label htmlFor="defaultRate">Taxa Padrão (0 a 1)</Label>
            <Input 
              id="defaultRate"
              value={defaultRate}
              onChange={(e) => setDefaultRate(e.target.value)}
              placeholder="Ex: 0.5 para 50%"
            />
          </div>
          <Button onClick={handleUpdateDefaultRate} className="self-end">Salvar Taxa Padrão</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumo dos Afiliados</CardTitle>
          <CardDescription>Lista de todos os afiliados e seus ganhos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Afiliado</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Taxa</TableHead>
                <TableHead>Ganhos Totais</TableHead>
                <TableHead>Pagamento Pendente</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.affiliates.map((affiliate: any) => (
                <TableRow key={affiliate.id}>
                  <TableCell>{affiliate.email}</TableCell>
                  <TableCell><Badge variant="secondary">{affiliate.affiliate_code}</Badge></TableCell>
                  <TableCell>{affiliate.commission_rate * 100}%</TableCell>
                  <TableCell>R$ {affiliate.total_earnings.toFixed(2)}</TableCell>
                  <TableCell className="font-bold">R$ {affiliate.pending_payout.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => { setEditingAffiliate(affiliate); setNewRate(String(affiliate.commission_rate)); }}>
                      <Edit className="h-4 w-4"/>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Rate Modal */}
      <Dialog open={!!editingAffiliate} onOpenChange={() => setEditingAffiliate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Taxa de Comissão</DialogTitle>
            <DialogDescription>
              Alterando a taxa para <strong>{editingAffiliate?.email}</strong>.
              A nova taxa será aplicada a futuras comissões.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="commissionRate">Nova Taxa (0 a 1)</Label>
            <Input 
              id="commissionRate"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              placeholder="Ex: 0.5 para 50%"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAffiliate(null)}>Cancelar</Button>
            <Button onClick={handleUpdateRate}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Pagamentos Pendentes</CardTitle>
          <CardDescription>Lista de todas as comissões convertidas aguardando pagamento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.keys(payoutsByAffiliate).length === 0 ? (
            <p className="text-muted-foreground text-center">Nenhum pagamento pendente.</p>
          ) : (
            Object.entries(payoutsByAffiliate).map(([affiliateId, referrals]: [string, any[]]) => {
              const affiliate = data.affiliates.find((a: any) => a.id === affiliateId);
              const total = referrals.reduce((sum, ref) => sum + ref.commission_amount, 0);
              return (
                <div key={affiliateId} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-semibold">{affiliate?.user_details?.email || 'Afiliado Desconhecido'}</h3>
                      <p className="text-sm text-muted-foreground">{referrals.length} comissões pendentes</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">Total a Pagar: R$ {total.toFixed(2)}</p>
                      <Button 
                        size="sm"
                        onClick={() => handlePayout(affiliateId, referrals.map(r => r.id))}
                        disabled={paying === affiliateId}
                        className="mt-2"
                      >
                        {paying === affiliateId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4"/>}
                        Pagar Agora
                      </Button>
                    </div>
                  </div>
                  <Table>
                    <TableHeader><TableRow><TableHead>ID da Indicação</TableHead><TableHead>Data</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {referrals.map(ref => (
                        <TableRow key={ref.id}>
                          <TableCell className="font-mono text-xs">{ref.id}</TableCell>
                          <TableCell>{new Date(ref.created_at).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>R$ {ref.commission_amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAffiliates;

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
import { Edit, Trash2, PlusCircle, CalendarIcon } from 'lucide-react';
import { format } from "date-fns";
import { User } from '@/data/users';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


const AddUserDialog = ({ onUserAdded }: { onUserAdded: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'admin'>('client');
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { email, password, role },
    });

    if (error) {
      console.error("Error creating user:", error.message);
      // Here you would show a toast notification with the error
    } else {
      console.log("User created successfully:", data.user);
      // Here you would show a success toast
      onUserAdded(); // Callback to refresh the user list
      setIsOpen(false); // Close the dialog
      // Reset form
      setEmail('');
      setPassword('');
      setRole('client');
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow">
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Usuário</DialogTitle>
          <DialogDescription>
            Preencha os detalhes abaixo para criar uma nova conta de usuário.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select onValueChange={(value: 'client' | 'admin') => setRole(value)} defaultValue={role}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const DeleteUserAlert = ({ userId, onUserDeleted }: { userId: string, onUserDeleted: () => void }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const { error } = await supabase.functions.invoke('delete-user', {
      body: { userId },
    });
    if (error) {
      console.error("Error deleting user:", error.message);
      // Handle error with a toast
    } else {
      console.log("User deleted successfully");
      // Handle success with a toast
      onUserDeleted();
    }
    setIsDeleting(false);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita. Isso excluirá permanentemente o
            usuário e removerá seus dados de nossos servidores.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const planToPriceMap = {
  starter: 'price_1S3PvoDssGMGr4ApVHjLcKBy',
  pro: 'price_1S3PwCDssGMGr4ApXhYzENaK',
  agency: 'price_1S3PwdDssGMGr4ApVu7rU8kB',
  legacy: 'price_1S3fgvDssGMGr4Ap2KNREK4i',
  'legacy-club': 'price_1S3finDssGMGr4ApW7wWdEOK',
};

const planDisplayNameMap: { [key: string]: string } = {
  starter: 'Plano Inicial',
  pro: 'Plano Pro',
  agency: 'Plano Agência',
  legacy: 'Plano Legado',
  'legacy-club': 'Clube Legado',
};

const EditUserDialog = ({ user, onUserUpdated }: { user: User, onUserUpdated: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState(user.role);
  const [newEmail, setNewEmail] = useState(user.email);
  const [newPassword, setNewPassword] = useState('');
  const [subscription, setSubscription] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [trialEndDate, setTrialEndDate] = useState<Date | undefined>(undefined);
  const [trialDays, setTrialDays] = useState<number>(0);

  const fetchSubscription = async () => {
    setLoadingSubscription(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("User not authenticated");
      }

      const response = await fetch(
        `https://uorwocetqyjkpioimrjk.supabase.co/functions/v1/get-user-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId: user.id }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`FunctionsHttpError: ${errorData.message || 'Edge Function returned a non-2xx status code'}`);
      }

      const data = await response.json();
      if (!data || data.error) {
        throw new Error(data?.error || 'Failed to fetch subscription');
      }
      setSubscription(data.subscription);
      console.log('Fetched subscription:', data.subscription);
      const currentPriceId = data.subscription.items.data[0].price?.id || data.subscription.items.data[0].plan?.id;
      if (currentPriceId) {
        const foundLookupKey = Object.keys(planToPriceMap).find(key => planToPriceMap[key] === currentPriceId);
        if (foundLookupKey) {
          setSelectedPlan(foundLookupKey);
        } else {
          setSelectedPlan(''); // No matching lookup key found
        }
      } else {
        setSelectedPlan(''); // No price ID found
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    }
    setLoadingSubscription(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchSubscription();
    }
  }, [isOpen, user.id]);

  const handleUpdateRole = async () => {
    const { data, error } = await supabase.functions.invoke('update-user-role', {
      body: { userId: user.id, role },
    });

    if (error) {
      console.error("Error updating user:", error.message);
      // Handle error with a toast
    } else {
      console.log("User updated successfully:", data.user);
      // Handle success with a toast
      onUserUpdated();
    }
  };

  const handleUpdateSubscription = async () => {
    if (!subscription) return;

    setIsSubmitting(true);
    try {
      const trial_end = trialEndDate ? Math.floor(trialEndDate.getTime() / 1000) : undefined;

      const { error } = await supabase.functions.invoke('update-user-subscription', {
        body: {
          subscriptionId: subscription.id,
          priceId: selectedPlan === subscription.items.data[0].price.lookup_key ? undefined : planToPriceMap[selectedPlan],
          trial_end: trial_end,
        },
      });
      if (error) throw error;
      // Refresh subscription data
      fetchSubscription();
      // Show success toast
    } catch (error) {
      console.error('Error updating subscription:', error);
      // Show error toast
    }
    setIsSubmitting(false);
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-user-subscription', {
        body: { subscriptionId: subscription.id },
      });
      if (error) throw error;
      // Refresh subscription data
      fetchSubscription();
      // Show success toast
    } catch (error) {
      console.error('Error canceling subscription:', error);
      // Show error toast
    }
    setIsSubmitting(false);
  };

  const handleActivateSubscription = async () => {
    if (!subscription) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('update-user-subscription', {
        body: {
          subscriptionId: subscription.id,
          trial_end: 'now', // Encerra o trial imediatamente
        },
      });
      if (error) throw error;
      fetchSubscription(); // Atualiza os dados da assinatura
      // Exibe notificação de sucesso
    } catch (error) {
      console.error('Error activating subscription:', error);
      // Exibe notificação de erro
    }
    setIsSubmitting(false);
  };

  const handleCreateSubscription = async () => {
    if (!selectedPlan || !planToPriceMap[selectedPlan]) {
      console.error("Invalid plan selected");
      // Optionally, show a toast to the user
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user-subscription', {
        body: {
          userId: user.id,
          priceId: planToPriceMap[selectedPlan],
          trial_period_days: trialDays,
        },
      });
      if (error) throw error;
      setSubscription(data.subscription); // Optimistically update state
      setSelectedPlan(data.subscription.items.data[0].price.lookup_key); // Update selected plan
      // Show success toast
      fetchSubscription(); // Refresh subscription data as a fallback/verification
    } catch (error) {
      console.error('Error creating subscription:', error);
      // Show error toast
    }
    setIsSubmitting(false);
  }; // MISSING CLOSING BRACE ADDED HERE

  const handleUpdateUserAuth = async () => {
    let shouldUpdate = false;
    const updates: { email?: string; password?: string } = {};

    if (newEmail !== user.email) {
      updates.email = newEmail;
      shouldUpdate = true;
    }
    if (newPassword) {
      updates.password = newPassword;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      const { data, error } = await supabase.auth.admin.updateUserById(user.id, updates);
      if (error) {
        console.error("Error updating user auth:", error.message);
        throw error; // Propagate error to handleSubmit
      } else {
        console.log("User auth updated successfully:", data.user);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await handleUpdateUserAuth(); // Update email/password if changed
      await handleUpdateRole(); // Update user role
      onUserUpdated(); // Refresh user list
      setIsOpen(false); // Close the dialog
    } catch (error) {
      console.error("Error during user update:", error.message);
      // Show error toast
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="mr-2">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Atualize os detalhes do usuário e gerencie sua assinatura.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <Tabs defaultValue="user-details" className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1">
              <TabsTrigger value="user-details" className="custom-tab-trigger">Detalhes do Usuário</TabsTrigger>
              <TabsTrigger value="subscription-management" className="custom-tab-trigger">Assinatura</TabsTrigger>
            </TabsList>
            <TabsContent value="user-details" className="rounded-t-lg border-x border-b p-4">
              {/* User Details Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Deixe em branco para não alterar" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select onValueChange={(value: 'client' | 'admin') => setRole(value)} defaultValue={role}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : 'Salvar Alterações de Role'}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
            <TabsContent value="subscription-management" className="rounded-t-lg border-x border-b p-4">
              <div className="mt-4 space-y-4">
                {loadingSubscription ? (
                  <p>Carregando assinatura...</p>
                ) : subscription ? (
                  <div className="space-y-4">
                    <p><span className="font-semibold">Plano Atual:</span> {planDisplayNameMap[selectedPlan] || selectedPlan}</p>
                    <p><span className="font-semibold">Status:</span> {subscription.status}</p>
                    <p><span className="font-semibold">Fim do Período:</span> {new Date(subscription.current_period_end * 1000).toLocaleDateString()}</p>
                    <div className="space-y-2">
                      <Label htmlFor="plan">Mudar Plano</Label>
                      <Select onValueChange={setSelectedPlan} defaultValue={selectedPlan}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um novo plano" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(planToPriceMap).map(plan => (
                            <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trial-end">Fim do Período de Teste</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={
                              `w-full justify-start text-left font-normal ${
                                !trialEndDate && "text-muted-foreground"
                              }`
                            }
                          >
                            {trialEndDate ? (
                              format(trialEndDate, "PPP")
                            ) : (
                              <span>Definir data de fim do teste</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={trialEndDate}
                            onSelect={setTrialEndDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <Button onClick={handleUpdateSubscription} disabled={isSubmitting || (selectedPlan === subscription.items.data[0].price.lookup_key && !trialEndDate)} className="w-full">
                      {isSubmitting ? 'Atualizando...' : 'Atualizar Assinatura'}
                    </Button>

                    <div>
                      <Button variant="destructive" onClick={handleCancelSubscription} disabled={isSubmitting || subscription.status === 'canceled'} className="w-full">
                        {isSubmitting ? 'Cancelando...' : 'Cancelar Assinatura'}
                      </Button>

                      {subscription.status === 'trialing' && (
                        <Button onClick={handleActivateSubscription} disabled={isSubmitting} className="w-full">
                          {isSubmitting ? 'Ativando...' : 'Ativar Assinatura Agora'}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p>Nenhuma assinatura ativa encontrada.</p>
                    <div className="space-y-2">
                      <Label htmlFor="assign-plan">Atribuir Assinatura</Label>
                      <div className="flex gap-2">
                        <Select onValueChange={setSelectedPlan} defaultValue="">
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um plano para atribuir" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(planToPriceMap).map(plan => (
                              <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          placeholder="Dias de Teste (opcional)"
                          value={trialDays === 0 ? '' : trialDays}
                          onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                          className="w-1/3"
                        />
                        <Button onClick={handleCreateSubscription} disabled={isSubmitting || !selectedPlan}>
                          {isSubmitting ? 'Atribuindo...' : 'Atribuir Assinatura'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};


const AdminUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    console.log('Fetching users via edge function...');
    try {
      const { data, error } = await supabase.functions.invoke('get-users', {
        body: { searchQuery, planFilter },
      });
      if (error) throw error;

      const { users } = data;
      console.log('Raw users from function:', users);

      const formattedUsers = users.map(user => ({
        id: user.id,
        email: user.email || '',
        role: user.role || 'client', // Role is now directly on the user object from the edge function
        plan_id: user.plan_id, // Include plan_id
        name: user.user_metadata?.name || 'N/A',
        joinDate: new Date(user.created_at).toLocaleDateString(),
        password: '',
        avatar: user.user_metadata?.avatar_url,
      }));
      console.log('Formatted users:', formattedUsers);
      setUsers(formattedUsers as User[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Display an error message to the user
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, planFilter]);

  return (
    <div className="p-4 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todos os usuários da plataforma.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Pesquisar usuários..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select onValueChange={(value) => setPlanFilter(value === "all" ? "" : value)} defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Planos</SelectItem>
              {Object.keys(planToPriceMap).map(plan => (
                <SelectItem key={plan} value={plan}>{planDisplayNameMap[plan]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AddUserDialog onUserAdded={fetchUsers} />
        </div>
      </div>

      {/* User List Card */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium truncate max-w-[100px]">{String(user.id)}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{user.plan_id || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <EditUserDialog user={user} onUserUpdated={fetchUsers} />
                        <DeleteUserAlert userId={user.id} onUserDeleted={fetchUsers} />
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
  );
};

export default AdminUserManagement;

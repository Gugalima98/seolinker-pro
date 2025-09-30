
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

// Interface para os sites do cliente
interface ClientSite {
  id: number;
  url: string;
}

// Schema de validação com Zod
const formSchema = z.object({
  client_site_id: z.string().min(1, "Você precisa selecionar um site."),
  target_url: z.string().min(1, "A URL de destino é obrigatória."),
  anchor_text: z.string().min(2, { message: "O texto âncora deve ter pelo menos 2 caracteres." }),
});

export type CreateBacklinkFormValues = z.infer<typeof formSchema>;

interface CreateBacklinkFormProps {
  onSubmit: (values: CreateBacklinkFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  preselectedSiteId?: string; // Nova prop opcional
}

export const CreateBacklinkForm: React.FC<CreateBacklinkFormProps> = ({ onSubmit, onCancel, isSubmitting, preselectedSiteId }) => {
  const [clientSites, setClientSites] = useState<ClientSite[]>([]);
  const { toast } = useToast();

  const form = useForm<CreateBacklinkFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_site_id: '',
      target_url: '',
      anchor_text: '',
    },
  });

  useEffect(() => {
    const fetchClientSites = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('client_sites')
        .select('id, url')
        .eq('user_id', user.id);

      if (error) {
        toast({ title: "Erro ao buscar seus sites", description: error.message, variant: "destructive" });
      } else {
        setClientSites(data as ClientSite[]);
      }
    };
    fetchClientSites();

    // Se um site for pré-selecionado, define o valor no formulário
    if (preselectedSiteId) {
      form.setValue('client_site_id', preselectedSiteId);
    }
  }, [toast, preselectedSiteId, form]);

  const getHostname = (url: string): string | null => {
    try {
      let urlWithProtocol = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        urlWithProtocol = `https://${url}`;
      }
      let hostname = new URL(urlWithProtocol).hostname;
      return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
    } catch (e) {
      return null;
    }
  };

  const validateUrl = () => {
    const selectedSiteId = form.getValues('client_site_id');
    const targetUrl = form.getValues('target_url');
    const selectedSite = clientSites.find(site => site.id.toString() === selectedSiteId);

    if (selectedSite && targetUrl) {
      const targetHostname = getHostname(targetUrl);
      const selectedHostname = getHostname(selectedSite.url);

      if (!targetHostname) {
        form.setError("target_url", { type: "manual", message: "URL de destino inválida." });
        return false;
      }

      if (!selectedHostname) {
        toast({ title: "Erro de Dados", description: `A URL do seu site (${selectedSite.url}) parece estar mal formatada.`, variant: "destructive" });
        form.setError("target_url", { type: "manual", message: "URL do site base inválida." });
        return false;
      }

      if (targetHostname !== selectedHostname) {
        form.setError("target_url", { type: "manual", message: `A URL deve pertencer ao domínio ${selectedHostname}` });
        return false;
      }
    }
    form.clearErrors("target_url");
    return true;
  };

  const handleFormSubmit = (values: CreateBacklinkFormValues) => {
    if (validateUrl()) {
        onSubmit(values);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {!preselectedSiteId && (
          <FormField
            control={form.control}
            name="client_site_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selecione um de seus sites</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um site..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clientSites.map(site => (
                      <SelectItem key={site.id} value={site.id.toString()}>
                        {site.url}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="target_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de Destino</FormLabel>
              <FormControl>
                <Input placeholder="https://seu-site.com/artigo-incrivel" {...field} onBlur={validateUrl} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="anchor_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Texto Âncora</FormLabel>
              <FormControl>
                <Input placeholder="Melhores estratégias de SEO" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Avançando...' : 'Avançar'}
          </Button>
        </div>
      </form>
    </Form>
  );
};


import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { DialogFooter } from '@/components/ui/dialog';

// Definindo o schema de validação com Zod
const formSchema = z.object({
  domain: z.string().url({ message: "Por favor, insira uma URL válida." }),
  username: z.string().min(1, { message: "O nome de usuário é obrigatório." }),
  application_password: z.string().min(1, { message: "A senha de aplicação é obrigatória." }),
  api_url: z.string().url({ message: "Por favor, insira uma URL de API válida." }),
  primary_niche: z.string().min(1, { message: "O nicho primário é obrigatório." }),
  secondary_niche: z.string().optional(),
  tertiary_niche: z.string().optional(),
  da: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().min(0, { message: "DA deve ser um número positivo." })),
  domain_age: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().min(0, { message: "A idade do domínio deve ser um número positivo." })),
});

export type NetworkSiteFormValues = z.infer<typeof formSchema>;

interface NetworkSiteFormProps {
  onSubmit: (values: NetworkSiteFormValues) => void;
  onCancel: () => void;
  initialData?: Partial<NetworkSiteFormValues>;
  isSubmitting: boolean;
}

export const NetworkSiteForm: React.FC<NetworkSiteFormProps> = ({ onSubmit, onCancel, initialData, isSubmitting }) => {
  const form = useForm<NetworkSiteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      domain: '',
      username: '',
      application_password: '',
      api_url: '',
      primary_niche: '',
      secondary_niche: '',
      tertiary_niche: '',
      da: 0,
      domain_age: 0,
    },
  });

  React.useEffect(() => {
    form.reset(initialData);
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Domínio</FormLabel>
                <FormControl>
                  <Input placeholder="https://exemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="admin" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="application_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password Aplicação</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="********" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="api_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL API</FormLabel>
                <FormControl>
                  <Input placeholder="https://exemplo.com/wp-json" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="primary_niche"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nicho Primário</FormLabel>
                <FormControl>
                  <Input placeholder="Tecnologia" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="secondary_niche"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nicho Secundário (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Marketing Digital" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="tertiary_niche"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nicho Terciário (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="SEO" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="da"
            render={({ field }) => (
              <FormItem>
                <FormLabel>DA (Domain Authority)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="30" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="domain_age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Idade do Domínio (Anos)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

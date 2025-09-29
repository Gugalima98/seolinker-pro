import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Loader2, Star } from 'lucide-react';

// Interfaces
interface ClientSite {
  id: number;
  niche_primary: string | null;
  niche_secondary: string | null;
  niche_tertiary: string | null;
}

interface NetworkSite {
  id: number;
  domain: string;
  da: number;
  primary_niche: string;
  secondary_niche: string | null;
  tertiary_niche: string | null;
}

interface NetworkSiteWithScore extends NetworkSite {
  context_score: number;
  category: string;
}

interface SelectNetworkSiteViewProps {
  clientSiteId: number;
  onSiteSelect: (networkSite: NetworkSite) => void;
}

const scoreCategories: { [key: string]: (score: number) => boolean } = {
  'Todos': (score) => true,
  'Altamente Relevante': (score) => score >= 5,
  'Super Contextual': (score) => score === 4,
  'Contextual': (score) => score === 3,
  'Relevante': (score) => score === 2,
  'Pouco Relevante': (score) => score === 1,
  'Não Relacionado': (score) => score === 0,
};

const getCategory = (score: number): string => {
    if (score >= 5) return 'Altamente Relevante';
    if (score === 4) return 'Super Contextual';
    if (score === 3) return 'Contextual';
    if (score === 2) return 'Relevante';
    if (score === 1) return 'Pouco Relevante';
    return 'Não Relacionado';
}

const categoryVariants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    'Altamente Relevante': 'default',
    'Super Contextual': 'default',
    'Contextual': 'secondary',
    'Relevante': 'secondary',
    'Pouco Relevante': 'outline',
    'Não Relacionado': 'destructive',
}

export const SelectNetworkSiteView: React.FC<SelectNetworkSiteViewProps> = ({ clientSiteId, onSiteSelect }) => {
  const [allSites, setAllSites] = useState<NetworkSiteWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: clientSite, error: clientError } = await supabase
        .from('client_sites')
        .select('niche_primary, niche_secondary, niche_tertiary')
        .eq('id', clientSiteId)
        .single();

      const { data: networkSitesData, error: networkError } = await supabase
        .from('network_sites')
        .select('id, domain, da, primary_niche, secondary_niche, tertiary_niche');

      if (clientError || networkError || !clientSite) {
        toast({ title: "Erro ao buscar dados para contextualização", variant: "destructive" });
        setLoading(false);
        return;
      }

      const clientNiches = [clientSite.niche_primary, clientSite.niche_secondary, clientSite.niche_tertiary];
      const calculateContextScore = (networkNiches: (string | null)[]) => {
        let score = 0;
        const cleanClientNiches = clientNiches.filter(n => n).map(n => n!.toLowerCase().trim());
        const cleanNetworkNiches = networkNiches.filter(n => n).map(n => n!.toLowerCase().trim());
        if (cleanClientNiches.length === 0 || cleanNetworkNiches.length === 0) return 0;
        if (cleanClientNiches[0] === cleanNetworkNiches[0]) score += 3;
        if (cleanClientNiches.length > 1 && cleanClientNiches[1] && cleanNetworkNiches.includes(cleanClientNiches[1])) score += 1;
        if (cleanClientNiches.length > 2 && cleanClientNiches[2] && cleanNetworkNiches.includes(cleanClientNiches[2])) score += 1;
        return score;
      };

      const scoredSites = networkSitesData.map(site => {
          const score = calculateContextScore([site.primary_niche, site.secondary_niche, site.tertiary_niche]);
          return {
            ...site,
            context_score: score,
            category: getCategory(score),
          }
      });

      scoredSites.sort((a, b) => b.context_score - a.context_score);
      setAllSites(scoredSites);
      setLoading(false);
    };

    fetchData();
  }, [clientSiteId, toast]);

  const filteredSites = useMemo(() => {
    if (activeFilter === 'Todos') return allSites;
    return allSites.filter(site => site.category === activeFilter);
  }, [allSites, activeFilter]);

  if (loading) {
      return <div className="text-center p-10"><Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-medium text-muted-foreground">Filtrar por relevância</p>
            <ToggleGroup type="single" value={activeFilter} onValueChange={(value) => {if (value) setActiveFilter(value)}} className="flex-wrap justify-center">
                {Object.keys(scoreCategories).map(filterName => (
                    <ToggleGroupItem key={filterName} value={filterName} aria-label={filterName}>{filterName}</ToggleGroupItem>
                ))}
            </ToggleGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[450px] overflow-y-auto p-2">
            {filteredSites.length === 0 ? (
                <div className="col-span-full text-center text-muted-foreground py-10">
                    <p>Nenhum site encontrado para este filtro.</p>
                </div>
            ) : (
                filteredSites.map(site => (
                    <Card key={site.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-lg">{site.domain}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Domain Authority</span>
                                <span className="font-semibold">{site.da}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Relevância</span>
                                <Badge variant={categoryVariants[site.category] || 'outline'}>{site.category}</Badge>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => onSiteSelect(site)}>
                                <Star className="mr-2 h-4 w-4" /> Selecionar
                            </Button>
                        </CardFooter>
                    </Card>
                ))
            )}
        </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  TrendingUp, 
  Medal, 
  Crown,
  Target,
  Calendar,
  Users,
  Award,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { mockUsers } from '@/data/users';
import { mockBacklinks } from '@/data/backlinks';

const Ranking = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('monthly');
  const [userPosition, setUserPosition] = useState(0);
  const [previousPosition, setPreviousPosition] = useState(0);

  // Simulate ranking data
  const generateRankingData = () => {
    const users = mockUsers.filter(u => u.role === 'client');
    
    // Add backlink counts and simulate scores
    const usersWithStats = users.map(u => {
      const userBacklinks = mockBacklinks.filter(bl => 
        // Simulate user backlinks by checking if user has sites
        Math.random() > 0.3
      );
      
      const backlinkCount = Math.floor(Math.random() * 100) + 10;
      const monthlyBacklinks = Math.floor(Math.random() * 20) + 1;
      const successRate = Math.floor(Math.random() * 30) + 70;
      
      return {
        ...u,
        stats: {
          totalBacklinks: backlinkCount,
          monthlyBacklinks,
          successRate,
          score: backlinkCount * 2 + monthlyBacklinks * 10 + successRate
        }
      };
    });

    // Sort by score
    const sorted = usersWithStats.sort((a, b) => b.stats.score - a.stats.score);
    
    // Find current user position
    const currentUserPos = sorted.findIndex(u => u.id === user?.id) + 1;
    setUserPosition(currentUserPos);
    setPreviousPosition(currentUserPos + Math.floor(Math.random() * 6) - 3); // Simulate previous position

    return sorted;
  };

  const [rankingData, setRankingData] = useState<any[]>([]);

  useEffect(() => {
    setRankingData(generateRankingData());
  }, [user?.id, period]);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-bold">{position}</div>;
    }
  };

  const getPositionChange = () => {
    const diff = previousPosition - userPosition;
    if (diff > 0) return { icon: ArrowUp, color: 'text-success', text: `+${diff}` };
    if (diff < 0) return { icon: ArrowDown, color: 'text-destructive', text: `${diff}` };
    return { icon: Minus, color: 'text-muted-foreground', text: '0' };
  };

  const positionChange = getPositionChange();

  const currentUser = rankingData.find(u => u.id === user?.id);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold gradient-text">Ranking de Usuários</h1>
        <p className="text-muted-foreground text-lg">
          Compete com outros usuários e suba no ranking mensal!
        </p>
      </div>

      {/* User Position Card */}
      {currentUser && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary-hover/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback className="bg-primary text-white text-xl">
                      {currentUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-2 -right-2">
                    {getRankIcon(userPosition)}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold">Sua Posição: #{userPosition}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <positionChange.icon className={`w-4 h-4 ${positionChange.color}`} />
                    <span className={`text-sm font-medium ${positionChange.color}`}>
                      {positionChange.text} desde o mês passado
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{currentUser.stats.totalBacklinks}</p>
                  <p className="text-sm text-muted-foreground">Total Backlinks</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">{currentUser.stats.monthlyBacklinks}</p>
                  <p className="text-sm text-muted-foreground">Este Mês</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{currentUser.stats.successRate}%</p>
                  <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period Selector */}
      <Tabs value={period} onValueChange={setPeriod} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="weekly">Semanal</TabsTrigger>
          <TabsTrigger value="monthly">Mensal</TabsTrigger>
          <TabsTrigger value="alltime">Todos os Tempos</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{rankingData.length}</p>
                <p className="text-sm text-muted-foreground">Participantes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{rankingData[0]?.stats.score || 0}</p>
                <p className="text-sm text-muted-foreground">Maior Pontuação</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="text-2xl font-bold">
                  {Math.round(rankingData.reduce((acc, u) => acc + u.stats.successRate, 0) / rankingData.length) || 0}%
                </p>
                <p className="text-sm text-muted-foreground">Taxa Média</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">
                  {rankingData.reduce((acc, u) => acc + u.stats.monthlyBacklinks, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Backlinks do Mês</p>
              </CardContent>
            </Card>
          </div>

          {/* Ranking List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-primary" />
                <span>Ranking {period === 'weekly' ? 'Semanal' : period === 'monthly' ? 'Mensal' : 'Geral'}</span>
              </CardTitle>
              <CardDescription>
                Usuários ranqueados por performance e atividade na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {rankingData.map((rankedUser, index) => {
                const position = index + 1;
                const isCurrentUser = rankedUser.id === user?.id;
                
                return (
                  <div
                    key={rankedUser.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                      isCurrentUser 
                        ? 'bg-primary/5 border-primary/20 shadow-md' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        {getRankIcon(position)}
                        <div className="text-2xl font-bold">
                          #{position}
                        </div>
                      </div>
                      
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={rankedUser.avatar} />
                        <AvatarFallback className="bg-primary text-white">
                          {rankedUser.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <h4 className="font-semibold flex items-center space-x-2">
                          <span>{rankedUser.name}</span>
                          {isCurrentUser && <Badge>Você</Badge>}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {rankedUser.stats.score} pontos
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <p className="font-bold">{rankedUser.stats.totalBacklinks}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div>
                        <p className="font-bold text-success">{rankedUser.stats.monthlyBacklinks}</p>
                        <p className="text-xs text-muted-foreground">Mês</p>
                      </div>
                      <div>
                        <p className="font-bold">{rankedUser.stats.successRate}%</p>
                        <p className="text-xs text-muted-foreground">Sucesso</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Next Milestone */}
          {userPosition > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Próximo Objetivo</CardTitle>
                <CardDescription>
                  Continue criando backlinks para subir no ranking!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Pontos para próxima posição:</span>
                    <span className="font-bold">
                      {rankingData[userPosition - 2]?.stats.score - currentUser?.stats.score} pontos
                    </span>
                  </div>
                  <Progress 
                    value={currentUser ? (currentUser.stats.score / rankingData[userPosition - 2]?.stats.score) * 100 : 0}
                  />
                  <p className="text-sm text-muted-foreground">
                    💡 Dica: Crie mais backlinks de qualidade para ganhar pontos!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Ranking;
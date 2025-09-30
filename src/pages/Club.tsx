import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Play, 
  BookOpen, 
  Users, 
  Clock,
  Award,
  CheckCircle,
  GraduationCap,
  TrendingUp,
  Loader2,
  AlertTriangle,
  Star
} from 'lucide-react';
import { Course, Lesson } from '@/data/courses';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const Club = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: functionError } = await supabase.functions.invoke('get-courses');
        if (functionError) throw functionError;
        setCourses(data || []);
      } catch (e: any) {
        console.error("Erro ao buscar cursos:", e);
        setError("Não foi possível carregar os cursos. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const handleEnrollCourse = (courseId: number) => {
    setCourses(prevCourses => prevCourses.map(c => c.id === courseId ? { ...c, enrolled: true } : c));
    toast({ title: "Inscrição realizada!", description: "Você foi inscrito no curso com sucesso." });
    // TODO: Chamar backend para persistir
  };

  const handleLessonClick = (lesson: Lesson, course: Course) => {
    if (lesson.completed || course.enrolled) {
      setSelectedLesson(lesson);
      setSelectedCourse(course);
      setIsPlayerOpen(true);
    }
  };

  const markLessonComplete = (courseId: number, lessonId: number) => {
    setCourses(prevCourses =>
      prevCourses.map(course => {
        if (course.id === courseId) {
          const updatedModules = course.modules.map(module => ({
            ...module,
            lessons: module.lessons.map(lesson => lesson.id === lessonId ? { ...lesson, completed: true } : lesson)
          }));
          const totalLessons = updatedModules.reduce((acc, module) => acc + module.lessons.length, 0);
          const completedLessons = updatedModules.reduce((acc, module) => 
            acc + module.lessons.filter(l => l.completed).length, 0
          );
          const newProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
          return { ...course, modules: updatedModules, progress: newProgress };
        }
        return course;
      })
    );
    // TODO: Chamar backend para persistir
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Iniciante': return 'bg-success/10 text-success border-success/20';
      case 'Intermediário': return 'bg-warning/10 text-warning-foreground border-warning/20';
      case 'Avançado': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-96 bg-destructive/5 rounded-lg">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-xl font-semibold text-destructive">Ocorreu um erro</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  const enrolledCourses = courses.filter(course => course.enrolled);
  const availableCourses = courses.filter(course => !course.enrolled);

  const stats = {
    totalCourses: enrolledCourses.length,
    completedCourses: enrolledCourses.filter(c => c.progress === 100).length,
    totalHours: enrolledCourses.reduce((acc, course) => {
      const hours = parseFloat(course.duration?.split('h')[0] || '0');
      return acc + hours;
    }, 0),
    avgProgress: enrolledCourses.length > 0 
      ? Math.round(enrolledCourses.reduce((acc, course) => acc + course.progress, 0) / enrolledCourses.length)
      : 0
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold gradient-text">SEO Club</h1>
        <p className="text-muted-foreground text-lg">Aprenda com os melhores cursos de SEO e marketing digital</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-hover"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Cursos Inscritos</CardTitle><BookOpen className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalCourses}</div><p className="text-xs text-muted-foreground">Cursos ativos</p></CardContent></Card>
        <Card className="card-hover"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Concluídos</CardTitle><Award className="h-4 w-4 text-success" /></CardHeader><CardContent><div className="text-2xl font-bold text-success">{stats.completedCourses}</div><p className="text-xs text-muted-foreground">Cursos finalizados</p></CardContent></Card>
        <Card className="card-hover"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Horas de Estudo</CardTitle><Clock className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalHours}h</div><p className="text-xs text-muted-foreground">Tempo investido</p></CardContent></Card>
        <Card className="card-hover"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Progresso Médio</CardTitle><TrendingUp className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.avgProgress}%</div><Progress value={stats.avgProgress} className="mt-2" /></CardContent></Card>
      </div>

      <Tabs defaultValue="enrolled" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="enrolled">Meus Cursos</TabsTrigger>
          <TabsTrigger value="available">Catálogo</TabsTrigger>
        </TabsList>

        <TabsContent value="enrolled" className="space-y-6">
          {enrolledCourses.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><GraduationCap className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" /><h3 className="text-xl font-semibold mb-2">Nenhum curso inscrito</h3><p className="text-muted-foreground mb-6">Explore nosso catálogo e comece sua jornada de aprendizado!</p><Button>Ver Catálogo</Button></CardContent></Card>
          ) : (
            <div className="space-y-6">
              {enrolledCourses.map((course, index) => (
                <Card key={course.id} className="card-hover animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      <img src={course.thumbnail} alt={course.title} className="w-full lg:w-48 h-32 object-cover rounded-lg" />
                      <div className="flex-1 space-y-4">
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-xl font-bold">{course.title}</h3>
                            <Badge className={getLevelColor(course.level)}>{course.level}</Badge>
                          </div>
                          <p className="text-muted-foreground">{course.description}</p>
                          <div className="flex items-center space-x-4 mt-3 text-sm text-muted-foreground">
                            <span className="flex items-center space-x-1"><Users className="w-4 h-4" /><span>{course.instructor}</span></span>
                            <span className="flex items-center space-x-1"><Clock className="w-4 h-4" /><span>{course.duration}</span></span>
                            <Badge variant="secondary">{course.category}</Badge>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm"><span>Progresso do curso</span><span className="font-medium">{course.progress}%</span></div>
                          <Progress value={course.progress} />
                        </div>
                        <div className="space-y-3">
                          {course.modules.map((module) => (
                            <div key={module.id} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold">{module.title}</h4>
                                {module.completed && <CheckCircle className="w-5 h-5 text-success" />}
                              </div>
                              <div className="space-y-2">
                                {module.lessons.map((lesson) => (
                                  <div key={lesson.id} className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${lesson.completed ? 'bg-success/10 hover:bg-success/20' : 'hover:bg-muted'}`} onClick={() => handleLessonClick(lesson, course)}>
                                    <div className="flex items-center space-x-3">
                                      {lesson.completed ? <CheckCircle className="w-4 h-4 text-success" /> : <Play className="w-4 h-4 text-primary" />}
                                      <span className="text-sm">{lesson.title}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="available" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCourses.map((course, index) => (
              <Card key={course.id} className="card-hover animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="relative"><img src={course.thumbnail} alt={course.title} className="w-full h-48 object-cover rounded-t-lg" /><Badge className={`absolute top-3 right-3 ${getLevelColor(course.level)}`}>{course.level}</Badge></div>
                <CardHeader><CardTitle className="text-lg">{course.title}</CardTitle><CardDescription className="line-clamp-2">{course.description}</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground"><span className="flex items-center space-x-1"><Users className="w-4 h-4" /><span>{course.instructor}</span></span><span className="flex items-center space-x-1"><Clock className="w-4 h-4" /><span>{course.duration}</span></span></div>
                  <div className="flex items-center space-x-2"><Badge variant="secondary">{course.category}</Badge><div className="flex items-center space-x-1">{[...Array(5)].map((_, i) => (<Star key={i} className={`w-4 h-4 ${i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />))}</div></div>
                  <Button className="w-full bg-gradient-to-r from-primary to-primary-hover" onClick={() => handleEnrollCourse(course.id)}>Inscrever-se Gratuitamente</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader><DialogTitle>{selectedLesson?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {selectedLesson?.video_url ? (
              <div className="aspect-video bg-black rounded-lg">
                <iframe width="100%" height="100%" src={selectedLesson.video_url.replace("watch?v=", "embed/")} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg"><BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" /><p>Conteúdo da aula não disponível.</p></div>
            )}
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setIsPlayerOpen(false)}>Fechar</Button>
              {selectedCourse && selectedLesson && !selectedLesson.completed && (
                <Button onClick={() => { markLessonComplete(selectedCourse.id, selectedLesson.id); setIsPlayerOpen(false); toast({ title: "Aula concluída!", description: "Parabéns por completar esta aula." }); }}>Marcar como Concluída</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Club;
import React, { useState, useEffect, useCallback } from 'react';
import { Course } from '@/data/courses';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Edit, Trash2, PlusCircle, BookOpen, List, PlayCircle, Loader2, AlertTriangle } from 'lucide-react';
import CreateCourseForm from '@/components/forms/CreateCourseForm';
import EditCourseForm from '@/components/forms/EditCourseForm';

const AdminCourses = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('get-courses');
      if (functionError) throw functionError;
      setCourses(data || []);
    } catch (e: any) {
      setError("Não foi possível carregar os cursos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCreationSuccess = () => { setIsCreateDialogOpen(false); fetchCourses(); };
  const handleUpdateSuccess = () => { setEditingCourse(null); fetchCourses(); };

  const handleDeleteConfirm = async () => {
    if (!deletingCourse) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-course', {
        body: { course_id: deletingCourse.id }
      });
      if (error) throw error;
      toast({ title: "Sucesso", description: "Curso deletado com sucesso." });
      setDeletingCourse(null);
      fetchCourses();
    } catch (e: any) {
      toast({ title: "Erro", description: `Não foi possível deletar o curso: ${e.message}`, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const totalCourses = courses.length;
  const totalModules = courses.reduce((sum, course) => sum + (course.modules?.length || 0), 0);
  const totalLessons = courses.reduce((sum, course) => sum + (course.modules?.reduce((modSum, module) => modSum + (module.lessons?.length || 0), 0) || 0), 0);

  const renderContent = () => {
    if (loading && courses.length === 0) return <div className="flex justify-center items-center p-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (error) return <div className="flex flex-col items-center justify-center p-16 text-destructive"><AlertTriangle className="w-8 h-8 mb-2" /><p>{error}</p></div>;
    if (courses.length === 0) return <p className="p-16 text-center text-muted-foreground">Nenhum curso encontrado.</p>;

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Título</TableHead><TableHead>Módulos</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="font-medium">{course.id}</TableCell>
                <TableCell>{course.title}</TableCell>
                <TableCell>{course.modules?.length || 0}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="mr-2" onClick={() => setEditingCourse(course)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeletingCourse(course)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div><h1 className="text-3xl font-bold gradient-text">Gerenciamento de Cursos</h1><p className="text-muted-foreground">Visualize e gerencie todos os cursos, módulos e aulas da plataforma.</p></div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}><DialogTrigger asChild><Button className="bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Curso</Button></DialogTrigger><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Adicionar Novo Curso</DialogTitle></DialogHeader><CreateCourseForm onSuccess={handleCreationSuccess} /></DialogContent></Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{/* Stats Cards */}</div>

      <Card><CardHeader><CardTitle>Lista de Cursos</CardTitle></CardHeader><CardContent>{renderContent()}</CardContent></Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingCourse} onOpenChange={(isOpen) => !isOpen && setEditingCourse(null)}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Editar Curso</DialogTitle></DialogHeader>{editingCourse && <EditCourseForm courseToEdit={editingCourse} onSuccess={handleUpdateSuccess} />}</DialogContent></Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={!!deletingCourse} onOpenChange={(isOpen) => !isOpen && setDeletingCourse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. Isso irá deletar permanentemente o curso e todo o seu conteúdo (módulos e aulas).</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>{isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deletar"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCourses;
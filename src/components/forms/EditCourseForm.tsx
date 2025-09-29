import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Course } from '@/data/courses'; // Usando a interface global

// Interfaces para a estrutura do formulário, podem ser simplificadas se a global for usada
interface LessonData {
  title: string;
  duration: string;
  type: 'video' | 'text' | 'quiz';
  video_url: string;
  order: number;
}

interface ModuleData {
  title: string;
  order: number;
  lessons: LessonData[];
}

interface CourseFormData {
  title: string;
  description: string;
  instructor: string;
  duration: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  thumbnail: string;
  category: string;
  modules: ModuleData[];
}

interface EditCourseFormProps {
  courseToEdit: Course;
  onSuccess: () => void;
}

const EditCourseForm: React.FC<EditCourseFormProps> = ({ courseToEdit, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  // Inicializa o estado do formulário com os dados do curso a ser editado
  const [formData, setFormData] = useState<CourseFormData>({
    title: courseToEdit.title || '',
    description: courseToEdit.description || '',
    instructor: courseToEdit.instructor || '',
    duration: courseToEdit.duration || '',
    level: courseToEdit.level || 'Iniciante',
    thumbnail: courseToEdit.thumbnail || '',
    category: courseToEdit.category || '',
    // Garante que modules e lessons sejam arrays para evitar erros
    modules: courseToEdit.modules?.map(m => ({ ...m, lessons: m.lessons || [] })) || [],
  });

  const handleCourseChange = (field: keyof Omit<CourseFormData, 'modules'>, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleModuleChange = (moduleIndex: number, value: string) => {
    const newModules = [...formData.modules];
    newModules[moduleIndex].title = value;
    setFormData(prev => ({ ...prev, modules: newModules }));
  };

  const addModule = () => {
    const newModule: ModuleData = {
      title: `Módulo ${formData.modules.length + 1}`,
      order: formData.modules.length + 1,
      lessons: [],
    };
    setFormData(prev => ({ ...prev, modules: [...prev.modules, newModule] }));
  };

  const removeModule = (moduleIndex: number) => {
    const newModules = formData.modules.filter((_, index) => index !== moduleIndex);
    setFormData(prev => ({ ...prev, modules: newModules }));
  };

  const handleLessonChange = (moduleIndex: number, lessonIndex: number, field: keyof LessonData, value: any) => {
    const newModules = [...formData.modules];
    const lesson = newModules[moduleIndex].lessons[lessonIndex];
    (lesson as any)[field] = value;
    setFormData(prev => ({ ...prev, modules: newModules }));
  };

  const addLesson = (moduleIndex: number) => {
    const newLesson: LessonData = {
      title: `Nova Aula ${formData.modules[moduleIndex].lessons.length + 1}`,
      duration: '10min',
      type: 'video',
      video_url: '',
      order: formData.modules[moduleIndex].lessons.length + 1,
    };
    const newModules = [...formData.modules];
    newModules[moduleIndex].lessons.push(newLesson);
    setFormData(prev => ({ ...prev, modules: newModules }));
  };

  const removeLesson = (moduleIndex: number, lessonIndex: number) => {
    const newModules = [...formData.modules];
    newModules[moduleIndex].lessons = newModules[moduleIndex].lessons.filter((_, index) => index !== lessonIndex);
    setFormData(prev => ({ ...prev, modules: newModules }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('update-course', {
        body: { 
          course_id: courseToEdit.id,
          course_data: formData 
        },
      });

      if (error) throw error;

      toast({ title: "Sucesso!", description: "Curso atualizado com sucesso." });
      onSuccess();
    } catch (error: any) {
      toast({ title: "Erro", description: `Não foi possível atualizar o curso: ${error.message}`, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto p-2">
      <div className="space-y-2">
        <label>Título do Curso</label>
        <Input placeholder="Ex: SEO Avançado" value={formData.title} onChange={e => handleCourseChange('title', e.target.value)} required />
      </div>

      <div className="space-y-2">
        <label>Descrição</label>
        <Textarea placeholder="Descreva o que os alunos aprenderão no curso." value={formData.description} onChange={e => handleCourseChange('description', e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label>Instrutor</label>
          <Input placeholder="Nome do instrutor" value={formData.instructor} onChange={e => handleCourseChange('instructor', e.target.value)} />
        </div>
        <div className="space-y-2">
          <label>Categoria</label>
          <Input placeholder="Ex: SEO, Marketing" value={formData.category} onChange={e => handleCourseChange('category', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label>Nível</label>
          <Select value={formData.level} onValueChange={(value) => handleCourseChange('level', value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Iniciante">Iniciante</SelectItem>
              <SelectItem value="Intermediário">Intermediário</SelectItem>
              <SelectItem value="Avançado">Avançado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label>Duração</label>
          <Input placeholder="Ex: 8h 30min" value={formData.duration} onChange={e => handleCourseChange('duration', e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <label>URL da Thumbnail</label>
        <Input placeholder="https://exemplo.com/imagem.png" value={formData.thumbnail} onChange={e => handleCourseChange('thumbnail', e.target.value)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Módulos e Aulas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.modules.map((module, moduleIndex) => (
            <Card key={moduleIndex} className="p-4">
              <div className="flex items-center justify-between">
                <Input value={module.title} onChange={e => handleModuleChange(moduleIndex, e.target.value)} className="font-bold" />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeModule(moduleIndex)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
              </div>
              <div className="pl-4 mt-4 space-y-2">
                {module.lessons.map((lesson, lessonIndex) => (
                  <div key={lessonIndex} className="flex items-center gap-2">
                    <Input placeholder="Título da aula" value={lesson.title} onChange={e => handleLessonChange(moduleIndex, lessonIndex, 'title', e.target.value)} />
                    <Input placeholder="URL do Vídeo" value={lesson.video_url} onChange={e => handleLessonChange(moduleIndex, lessonIndex, 'video_url', e.target.value)} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLesson(moduleIndex, lessonIndex)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => addLesson(moduleIndex)}><PlusCircle className="w-4 h-4 mr-2" /> Adicionar Aula</Button>
              </div>
            </Card>
          ))}
          <Button type="button" onClick={addModule}><PlusCircle className="w-4 h-4 mr-2" /> Adicionar Módulo</Button>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Alterações"}
        </Button>
      </div>
    </form>
  );
};

export default EditCourseForm;

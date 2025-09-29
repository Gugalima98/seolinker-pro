import { serve } from "std/http/server.ts";
import { createClient } from "supabase-js";
import { corsHeaders } from "common/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Criar um cliente Supabase usando a chave de serviço para ter acesso total
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Obter o usuário a partir do token de autorização
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

    if (!user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // 1. Buscar todos os cursos com seus módulos e aulas aninhados
    const { data: coursesData, error: coursesError } = await supabaseAdmin
      .from('courses')
      .select(`
        *,
        modules (*, lessons (*))
      `);

    if (coursesError) throw new Error(`Erro ao buscar cursos: ${coursesError.message}`);

    // 2. Buscar as inscrições do usuário
    const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
      .from('user_course_enrollments')
      .select('course_id')
      .eq('user_id', user.id);

    if (enrollmentsError) throw new Error(`Erro ao buscar inscrições: ${enrollmentsError.message}`);
    const enrolledCourseIds = new Set(enrollments.map(e => e.course_id));

    // 3. Buscar o progresso das aulas do usuário
    const { data: progressData, error: progressError } = await supabaseAdmin
      .from('user_lesson_progress')
      .select('lesson_id')
      .eq('user_id', user.id);

    if (progressError) throw new Error(`Erro ao buscar progresso: ${progressError.message}`);
    const completedLessonIds = new Set(progressData.map(p => p.lesson_id));

    // 4. Combinar todos os dados para montar a resposta final
    const finalCourses = coursesData.map(course => {
      let totalLessons = 0;
      let completedLessons = 0;

      const modules = course.modules.map(module => {
        const lessons = module.lessons.map(lesson => {
          totalLessons++;
          const isCompleted = completedLessonIds.has(lesson.id);
          if (isCompleted) {
            completedLessons++;
          }
          return { ...lesson, completed: isCompleted };
        });
        // Ordena as aulas pela ordem definida
        lessons.sort((a, b) => a.order - b.order);
        return { ...module, lessons };
      });

      // Ordena os módulos pela ordem definida
      modules.sort((a, b) => a.order - b.order);

      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const isEnrolled = enrolledCourseIds.has(course.id);

      return {
        ...course,
        modules,
        enrolled: isEnrolled,
        progress: progress,
      };
    });

    return new Response(JSON.stringify(finalCourses), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Erro na função get-courses:", error);
    const errorMessage = error instanceof Error ? error.message : "Um erro inesperado ocorreu.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

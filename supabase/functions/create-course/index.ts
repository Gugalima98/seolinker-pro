import { serve } from "std/http/server.ts";
import { createClient } from "supabase-js";
import { corsHeaders } from "common/cors.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Os dados do curso virão no corpo da requisição
    const courseData = await req.json();

    // Chamar a função RPC do banco de dados para criar o curso e suas dependências
    const { data, error } = await supabaseAdmin.rpc('create_course_with_dependencies', { 
      course_data: courseData 
    });

    if (error) {
      await supabaseAdmin.from('logs').insert({
        level: 'error',
        message: 'Failed to create course via RPC.',
        meta: { error: error.message, courseData },
      });
      console.error('Erro ao chamar RPC create_course_with_dependencies:', error);
      throw new Error(`Erro no banco de dados: ${error.message}`);
    }

    await supabaseAdmin.from('logs').insert({
      level: 'success',
      message: `Course '${courseData.title}' created successfully.`,
      meta: { courseId: data, courseData },
    });

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201, // 201 Created
    });

  } catch (error) {
    await supabaseAdmin.from('logs').insert({
      level: 'error',
      message: 'An unexpected error occurred in create-course function.',
      meta: { error: error.message },
    });
    console.error("Erro na função create-course:", error);
    const errorMessage = error instanceof Error ? error.message : "Um erro inesperado ocorreu.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

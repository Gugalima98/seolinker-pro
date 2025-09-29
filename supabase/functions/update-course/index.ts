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
    // O corpo da requisição deve conter o ID do curso e os novos dados
    const { course_id, course_data } = await req.json();

    if (!course_id || !course_data) {
      throw new Error("ID do curso e dados do curso são obrigatórios.");
    }

    // Chamar a função RPC do banco de dados para atualizar o curso
    const { error } = await supabaseAdmin.rpc('update_course_with_dependencies', { 
      course_id_to_update: course_id,
      course_data: course_data 
    });

    if (error) {
      await supabaseAdmin.from('logs').insert({
        level: 'error',
        message: `Failed to update course with ID: ${course_id}`,
        meta: { error: error.message, course_id, course_data },
      });
      console.error('Erro ao chamar RPC update_course_with_dependencies:', error);
      throw new Error(`Erro no banco de dados ao atualizar: ${error.message}`);
    }

    await supabaseAdmin.from('logs').insert({
      level: 'success',
      message: `Course with ID ${course_id} updated successfully.`,
      meta: { course_id, course_data },
    });

    return new Response(JSON.stringify({ message: "Curso atualizado com sucesso" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    await supabaseAdmin.from('logs').insert({
      level: 'error',
      message: 'An unexpected error occurred in update-course function.',
      meta: { error: error.message },
    });
    console.error("Erro na função update-course:", error);
    const errorMessage = error instanceof Error ? error.message : "Um erro inesperado ocorreu.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

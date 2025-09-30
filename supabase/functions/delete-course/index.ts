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
    const { course_id } = await req.json();

    if (!course_id) {
      throw new Error("ID do curso é obrigatório.");
    }

    const { error } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', course_id);

    if (error) {
      await supabaseAdmin.from('logs').insert({
        level: 'error',
        message: `Failed to delete course with ID: ${course_id}`,
        meta: { error: error.message, course_id },
      });
      throw new Error(`Erro no banco de dados ao deletar: ${error.message}`);
    }

    await supabaseAdmin.from('logs').insert({
      level: 'success',
      message: `Course with ID ${course_id} deleted successfully.`,
      meta: { course_id },
    });

    return new Response(JSON.stringify({ message: "Curso deletado com sucesso" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    await supabaseAdmin.from('logs').insert({
      level: 'error',
      message: 'An unexpected error occurred in delete-course function.',
      meta: { error: error.message },
    });
    console.error("Erro na função delete-course:", error);
    const errorMessage = error instanceof Error ? error.message : "Um erro inesperado ocorreu.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

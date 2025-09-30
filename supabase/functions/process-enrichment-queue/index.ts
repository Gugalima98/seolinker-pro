import { serve } from "std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BATCH_SIZE = 25;

serve(async (_req) => {
  console.log("process-enrichment-queue function invoked. Starting logic...");
  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log("Supabase client created.");

    // 1. Select a batch of queued backlinks
    console.log("Attempting to select queued backlinks...");
    const { data: queuedBacklinks, error: selectError } = await supabaseAdmin
      .from("backlinks")
      .select("id")
      .eq("status", "queued")
      .limit(BATCH_SIZE);

    if (selectError) {
      console.error("Error selecting queued backlinks:", selectError);
      throw new Error(`Failed to fetch queued backlinks: ${selectError.message}`);
    }

    console.log(`Selected ${queuedBacklinks?.length || 0} queued backlinks.`);
    console.log("Queued backlinks data:", queuedBacklinks);

    if (!queuedBacklinks || queuedBacklinks.length === 0) {
      return new Response(JSON.stringify({ message: "No queued backlinks to process." }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const backlinkIds = queuedBacklinks.map(b => b.id);

    // 2. Lock the batch by updating their status to 'processing'
    console.log(`Attempting to lock ${backlinkIds.length} backlinks by setting status to 'processing'...`);
    const { error: updateError } = await supabaseAdmin
      .from("backlinks")
      .update({ status: "processing" })
      .in("id", backlinkIds);

    if (updateError) {
      console.error("Error locking backlinks for processing:", updateError);
      throw new Error(`Failed to lock backlinks for processing: ${updateError.message}`);
    }
    console.log(`${backlinkIds.length} backlinks successfully locked (status set to 'processing').`);

    // 3. Asynchronously invoke the enrichment worker for each backlink
    console.log(`Invoking 'enrich-backlinks-from-wordpress' for ${backlinkIds.length} backlinks...`);
    const invocations = backlinkIds.map(id => 
      supabaseAdmin.functions.invoke("enrich-backlinks-from-wordpress", {
        body: { backlink_id: id },
      })
    );

    await Promise.allSettled(invocations);
    console.log("All enrichment worker invocations settled.");

    return new Response(
      JSON.stringify({ 
        message: `Started processing for ${backlinkIds.length} backlinks.` 
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Queue Processor Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

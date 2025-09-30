
import { serve } from "std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BATCH_SIZE = 500; // Batch size for updating records

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("batch-enrich-backlinks function invoked.");
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch IDs of all backlinks that need to be queued
    console.log("Step 1: Fetching backlink IDs to queue...");
    const { data: backlinks, error } = await supabaseAdmin
      .from("backlinks")
      .select("id")
      .is("wp_post_id", null)
      .neq("status", "completed")
      .neq("network_site_id", 81);

    if (error) {
      console.error("Error fetching backlink IDs:", error);
      throw new Error(`Failed to fetch backlink IDs: ${error.message}`);
    }
    
    console.log(`Step 1 complete: Found ${backlinks?.length || 0} backlinks to queue.`);

    if (!backlinks || backlinks.length === 0) {
      return new Response(JSON.stringify({ message: "No backlinks to queue." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const backlinkIds = backlinks.map(b => b.id);
    console.log(`Sample of first 10 IDs to process: ${backlinkIds.slice(0, 10).join(", ")}`);
    let totalUpdated = 0;

    // 2. Update the status to 'queued' in batches
    console.log("Step 2: Starting update process in batches...");
    for (let i = 0; i < backlinkIds.length; i += BATCH_SIZE) {
      const batchNumber = i / BATCH_SIZE + 1;
      const batchIds = backlinkIds.slice(i, i + BATCH_SIZE);
      console.log(`- Processing batch ${batchNumber}: ${batchIds.length} IDs.`);

      const { count, error: updateError } = await supabaseAdmin
        .from("backlinks")
        .update({ status: 'queued' })
        .in('id', batchIds)
        .select('*', { count: 'exact' });

      if (updateError) {
        console.error(`- Error updating batch ${batchNumber}:`, updateError);
        throw new Error(`Failed to update batch: ${updateError.message}`);
      }
      console.log(`- Batch ${batchNumber} update result: count = ${count}`);
      totalUpdated += count || 0;
    }

    console.log(`Step 2 complete: Finished update process. Total updated rows: ${totalUpdated}`);

    return new Response(
      JSON.stringify({ 
        message: `${totalUpdated} backlinks have been successfully queued for enrichment.` 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Critical function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

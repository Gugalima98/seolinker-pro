
import { serve } from "std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let backlinkId = null; // Initialize backlinkId here

  try {
    const { backlink_id } = await req.json();
    backlinkId = backlink_id; // Assign to outer scope variable

    if (!backlinkId) {
      console.error("Function Error: Missing backlink_id in request body.");
      return new Response("Missing backlink_id", { status: 400 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch backlink and network site data
    const { data: backlink, error: fetchError } = await supabaseAdmin
      .from("backlinks")
      .select(`
        id,
        target_url,
        anchor_text,
        article_title,
        network_site_id,
        network_sites (
          api_url,
          username,
          application_password
        )
      `)
      .eq("id", backlinkId)
      .single();

    if (fetchError) {
      console.error(`Function Error: Failed to fetch backlink ${backlinkId}: ${fetchError.message}`);
      await supabaseAdmin.from("backlinks").update({ status: 'error_fetch_backlink' }).eq("id", backlinkId);
      return new Response(JSON.stringify({ error: `Failed to fetch backlink ${backlinkId}` }), { status: 500 });
    }
    if (!backlink) {
      console.error(`Function Error: Backlink with ID ${backlinkId} not found.`);
      await supabaseAdmin.from("backlinks").update({ status: 'error_backlink_not_found' }).eq("id", backlinkId);
      return new Response(JSON.stringify({ error: `Backlink with ID ${backlinkId} not found` }), { status: 404 });
    }
    
    // Rule: Skip network site with ID 81
    if (backlink.network_site_id === 81) {
      console.log(`Skipping backlink ${backlinkId} for network site 81.`);
      await supabaseAdmin.from("backlinks").update({ status: 'skipped_network_81' }).eq("id", backlinkId);
      return new Response(JSON.stringify({ message: "Skipped network site 81" }));
    }

    const networkSite = backlink.network_sites;
    if (!networkSite) {
      console.error(`Function Error: Network site data not found for backlink ${backlinkId}.`);
      await supabaseAdmin.from("backlinks").update({ status: 'error_network_site_data' }).eq("id", backlinkId);
      return new Response(JSON.stringify({ error: `Network site data not found for backlink ${backlinkId}` }), { status: 500 });
    }
    if (!networkSite.api_url || !networkSite.username || !networkSite.application_password) {
      console.error(`Function Error: Missing WordPress API credentials for network site ID ${backlink.network_site_id} (backlink ${backlinkId}).`);
      await supabaseAdmin.from("backlinks").update({ status: 'error_missing_credentials' }).eq("id", backlinkId);
      return new Response(JSON.stringify({ error: `Missing WordPress API credentials for backlink ${backlinkId}` }), { status: 400 });
    }
    if (!backlink.article_title) {
        console.error(`Function Error: Missing article title for backlink ID ${backlinkId}.`);
        await supabaseAdmin.from("backlinks").update({ status: 'error_missing_title' }).eq("id", backlinkId);
        return new Response(JSON.stringify({ error: `Missing article title for backlink ${backlinkId}` }), { status: 400 });
    }

    // Normalize base URL for WordPress API
    let baseUrl = networkSite.api_url;
    baseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    baseUrl = baseUrl.replace(/\/wp-json\/wp\/v2$/, ''); // Remove /wp-json/wp/v2 if already there

    // 2. Connect to WordPress API and search for the post
    const searchUrl = `${baseUrl}/wp-json/wp/v2/posts?search=${encodeURIComponent(backlink.article_title)}&_fields=id,link,content`;
    console.log(`Attempting to call WordPress API for backlink ${backlinkId} with URL: ${searchUrl}`);
    const authHeader = `Basic ${btoa(`${networkSite.username}:${networkSite.application_password}`)}`;
    
    let response = await fetch(searchUrl, {
      headers: { "Authorization": authHeader },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Function Error: WordPress API request failed (title only) for backlink ${backlinkId}: ${response.statusText} - ${errorText}`);
      await supabaseAdmin.from("backlinks").update({ status: 'error_wp_api_request' }).eq("id", backlinkId);
      return new Response(JSON.stringify({ error: `WordPress API request failed (title only) for backlink ${backlinkId}` }), { status: response.status });
    }

    let posts = await response.json();

    if (posts.length === 0) {
      // If no posts found by title, try with date filter
      console.log(`No posts found by title for backlink ${backlinkId}. Attempting search with date filter.`);
      console.log(`Raw backlink.created_at for backlink ${backlinkId}:`, backlink.created_at);

      // Extract date from backlink.created_at (e.g., "2025-09-29T17:00:00Z")
      const backlinkDate = new Date(backlink.created_at);
      console.log(`Parsed backlinkDate object for backlink ${backlinkId}:`, backlinkDate);

      // Define a small date range (+/- 1 day)
      const dateBefore = new Date(backlinkDate);
      dateBefore.setDate(backlinkDate.getDate() + 1); // Search up to the next day
      const formattedDateBefore = `${dateBefore.getFullYear()}-${String(dateBefore.getMonth() + 1).padStart(2, '0')}-${String(dateBefore.getDate()).padStart(2, '0')}`;

      const dateAfter = new Date(backlinkDate);
      dateAfter.setDate(backlinkDate.getDate() - 1); // Search from the previous day
      const formattedDateAfter = `${dateAfter.getFullYear()}-${String(dateAfter.getMonth() + 1).padStart(2, '0')}-${String(dateAfter.getDate()).padStart(2, '0')}`;

      console.log(`Formatted date range for backlink ${backlinkId}: after=${formattedDateAfter}, before=${formattedDateBefore}`);

      const searchUrlWithDate = `${baseUrl}/wp-json/wp/v2/posts?search=${encodeURIComponent(backlink.article_title)}&after=${formattedDateAfter}&before=${formattedDateBefore}&_fields=id,link,content`;
      console.log(`Attempting WordPress API search (with date) for backlink ${backlinkId} with URL: ${searchUrlWithDate}`);
      response = await fetch(searchUrlWithDate, {
        headers: { "Authorization": authHeader },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Function Error: WordPress API request failed (with date) for backlink ${backlinkId}: ${response.statusText} - ${errorText}`);
        await supabaseAdmin.from("backlinks").update({ status: 'error_wp_api_request_with_date' }).eq("id", backlinkId);
        return new Response(JSON.stringify({ error: `WordPress API request failed (with date) for backlink ${backlinkId}` }), { status: response.status });
      }
      posts = await response.json();
    }

    if (posts.length === 0) {
      // If still no posts found after date filter
      console.error(`Function Error: No posts found with title "${backlink.article_title}" for backlink ${backlinkId} even with date filter.`);
      await supabaseAdmin.from("backlinks").update({ status: 'error_post_not_found' }).eq("id", backlinkId);
      return new Response(JSON.stringify({ error: `No posts found for backlink ${backlinkId}` }), { status: 404 });
    }

    let foundPost = null;

    if (posts.length === 1) {
      foundPost = posts[0];
    } else {
      // Disambiguate if multiple posts are found
      for (const post of posts) {
        const content = post.content?.rendered || "";
        const linkRegex = new RegExp(`<a[^>]*href=["']${backlink.target_url}["'][^>]*>.*?${backlink.anchor_text}.*?</a>`, 'i');
        if (linkRegex.test(content)) {
          foundPost = post;
          break;
        }
      }
    }

    if (!foundPost) {
        console.error(`Function Error: Could not disambiguate post for backlink ${backlinkId} with title "${backlink.article_title}" and anchor "${backlink.anchor_text}".`);
        await supabaseAdmin.from("backlinks").update({ status: 'error_disambiguation_failed' }).eq("id", backlinkId);
        return new Response(JSON.stringify({ error: `Could not disambiguate post for backlink ${backlinkId}` }), { status: 404 });
    }

    // 4. Update the backlinks table
    const { error: updateError } = await supabaseAdmin
      .from("backlinks")
      .update({
        wp_post_id: foundPost.id,
        post_url: foundPost.link,
        status: "completed",
        progress_percent: 100
      })
      .eq("id", backlinkId);

    if (updateError) {
      console.error(`Function Error: Failed to update backlink ${backlinkId} with found post data: ${updateError.message}`);
      await supabaseAdmin.from("backlinks").update({ status: 'error_final_update' }).eq("id", backlinkId);
      return new Response(JSON.stringify({ error: `Failed to update backlink ${backlinkId}` }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, backlinkId: backlinkId, postId: foundPost.id, postUrl: foundPost.link }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`Critical Function Error for backlink ${backlinkId || 'unknown'}:`, error.message);
    // Attempt to update status to a generic error if not already handled
    if (backlinkId) {
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabaseAdmin.from("backlinks").update({ status: 'error_unhandled_exception' }).eq("id", backlinkId);
    }
    return new Response(JSON.stringify({ error: `Unhandled error for backlink ${backlinkId || 'unknown'}: ${error.message}` }), {
      status: 500,
    });
  }
});

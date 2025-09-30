import { serve } from "std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BATCH_SIZE = 100; // Process 100 items per cron run

serve(async (_req) => {
  console.log("process-backlinks-to-review function invoked. Starting logic...");
  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log("Supabase client created.");

    // 1. Select a batch of backlinks to review
    console.log("Attempting to select backlinks to review...");
    const { data: backlinksToReview, error: selectError } = await supabaseAdmin
      .from("backlinks_to_review")
      .select("id, user_email, network_site_domain, article_title, wp_post_id_original, original_created_at")
      .eq("status", "pending_review")
      .limit(BATCH_SIZE);

    if (selectError) {
      console.error("Error selecting backlinks to review:", selectError);
      throw new Error(`Failed to fetch backlinks to review: ${selectError.message}`);
    }

    if (!backlinksToReview || backlinksToReview.length === 0) {
      console.log("No backlinks to review found.");
      return new Response(JSON.stringify({ message: "No backlinks to review found." }));
    }

    console.log(`Found ${backlinksToReview.length} backlinks to review.`);

    const processedResults = await Promise.allSettled(backlinksToReview.map(async (reviewItem) => {
      let currentStatus = "";
      let errorMessage = "";

      try {
        // 1. Find network_site_id and credentials
        const { data: networkSite, error: nsError } = await supabaseAdmin
          .from("network_sites")
          .select("id, api_url, username, application_password, domain") // Added domain to select
          .eq("domain", reviewItem.network_site_domain)
          .single();

        if (nsError || !networkSite) {
          currentStatus = "error_network_site_not_found";
          errorMessage = `Network site ${reviewItem.network_site_domain} not found.`;
          console.error(`Error for review item ${reviewItem.id}: ${errorMessage}`);
          await supabaseAdmin.from("backlinks_to_review").update({ status: currentStatus, error_log: errorMessage }).eq("id", reviewItem.id);
          return { id: reviewItem.id, status: currentStatus, error: errorMessage };
        }

        if (!networkSite.api_url || !networkSite.username || !networkSite.application_password) {
          currentStatus = "error_missing_credentials";
          errorMessage = `Missing WordPress API credentials for network site ${networkSite.id}.`;
          console.error(`Error for review item ${reviewItem.id}: ${errorMessage}`);
          await supabaseAdmin.from("backlinks_to_review").update({ status: currentStatus, error_log: errorMessage }).eq("id", reviewItem.id);
          return { id: reviewItem.id, status: currentStatus, error: errorMessage };
        }

        // 2. Fetch WordPress Post Content
        // Simplified URL construction for debugging
<<<<<<< HEAD
        const postApiUrl = `${networkSite.api_url}/posts/${reviewItem.wp_post_id_original}`; // Direct use of api_url
        const authHeader = `Basic ${btoa(`${networkSite.username}:${networkSite.application_password}`)}`;

        console.log(`Attempting to fetch post content for review item ${reviewItem.id} from URL: ${postApiUrl}`);

        const response = await fetch(postApiUrl, {
=======
        const postUrl = `${networkSite.api_url}/posts/${reviewItem.wp_post_id_original}`; // Direct use of api_url
        const authHeader = `Basic ${btoa(`${networkSite.username}:${networkSite.application_password}`)}`;

        console.log(`Attempting to fetch post content for review item ${reviewItem.id} from URL: ${postUrl}`);

        const response = await fetch(postUrl, {
>>>>>>> 613e8d118da6e6f17540fbc2d40e9393326c947e
          headers: { "Authorization": authHeader },
        });

        if (!response.ok) {
          const errorText = await response.text();
          currentStatus = "error_wp_api_request";
          errorMessage = `WordPress API request failed for post ${reviewItem.wp_post_id_original}: ${response.statusText} - ${errorText}`;
          console.error(`Error for review item ${reviewItem.id}: ${errorMessage}`);
          await supabaseAdmin.from("backlinks_to_review").update({ status: currentStatus, error_log: errorMessage }).eq("id", reviewItem.id);
          return { id: reviewItem.id, status: currentStatus, error: errorMessage };
        }

        const post = await response.json();
        const postContent = post.content?.rendered || "";
        const postUrl = post.link;

        // 3. Extract anchor_text and target_url (first link found, regardless of external/internal)
        const anyLinkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])([^"']+)\1[^>]*>(.*?)<\/a>/gi;
        let target_url = null;
        let anchor_text = null;

        let match;
        // Just take the first match, no domain comparison
        if ((match = anyLinkRegex.exec(postContent)) !== null) {
          target_url = match[2];
          anchor_text = match[3];
        }

        if (target_url) { // If any link was found
          anchor_text = (anchor_text && anchor_text.trim()) || null; // Convert empty string to null
        } else { // If no target_url found at all
          currentStatus = "error_no_external_link_found"; // This error now means "no link at all"
          errorMessage = `No link found in post ${reviewItem.wp_post_id_original}.`; // Update message
          console.error(`Error for review item ${reviewItem.id}: ${errorMessage}`);
          console.log(`Post content for review item ${reviewItem.id} (no link found):`, postContent);
          await supabaseAdmin.from("backlinks_to_review").update({ status: currentStatus, error_log: errorMessage }).eq("id", reviewItem.id);
          return { id: reviewItem.id, status: currentStatus, error: errorMessage };
        }

        // 4. Find user_id
        let userId = null;
        
        // Try to get user from auth.users using listUsers with query filter
        const { data: listUsersData, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({
            query: reviewItem.user_email, // Use the query parameter to search by email
            perPage: 1, // We only need one if it exists
            page: 1,
        });

        let existingUser = null;
        if (!listUsersError && listUsersData?.users && listUsersData.users.length > 0) {
            // If listUsers returned any user, assume it's the one we queried for
            // (since perPage is 1 and query is by email)
            existingUser = listUsersData.users[0];
        }

        if (listUsersError || !existingUser) {
          // User not found in auth.users, create a new one
          console.log(`User with email ${reviewItem.user_email} not found in auth.users. Attempting to create new user.`);
          const randomPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15); // Generate a random password
          const { data: newUser, error: createAuthUserError } = await supabaseAdmin.auth.admin.createUser({
            email: reviewItem.user_email,
            password: randomPassword,
            email_confirm: true, // Optionally confirm email
          });

          if (createAuthUserError || !newUser) {
            currentStatus = "error_create_user";
            errorMessage = `Failed to create user for email ${reviewItem.user_email}: ${createAuthUserError?.message || "Unknown error"}`;
            console.error(`Error for review item ${reviewItem.id}: ${errorMessage}`);
            await supabaseAdmin.from("backlinks_to_review").update({ status: currentStatus, error_log: errorMessage }).eq("id", reviewItem.id);
            return { id: reviewItem.id, status: currentStatus, error: errorMessage };
          }
          userId = newUser.user.id;
          console.log(`New user created in auth.users with ID: ${userId} for email ${reviewItem.user_email}.`);
        } else {
          userId = existingUser.id;
          console.log(`Existing user found in auth.users with ID: ${userId} for email ${reviewItem.user_email}.`);
        }

        // 5. Find or Create client_site_id
        let client_site_url_to_use = target_url; // Start with full URL
        try {
            const parsedTargetUrl = new URL(target_url);
            client_site_url_to_use = parsedTargetUrl.hostname;
        } catch (e) {
            console.warn(`Warning: Could not parse target_url ${target_url} to extract hostname. Using full URL as fallback.`);
            // Fallback to full URL if parsing fails, though this should be rare for valid URLs
        }

        let client_site_id = null;

        // Use upsert to find or create client_site, leveraging the UNIQUE constraint on 'url'
        const { data: upsertedClientSite, error: upsertError } = await supabaseAdmin
          .from("client_sites")
          .upsert({
            user_id: userId,
            url: client_site_url_to_use,
            type: "unknown", // Default value provided by user
          }, { onConflict: "user_id,url" }) // Correct syntax for onConflict
          .select("id")
          .single();

        if (upsertError || !upsertedClientSite) {
          currentStatus = "error_find_or_create_client_site";
          errorMessage = `Failed to find or create client site for URL ${client_site_url_to_use}: ${upsertError?.message || "Unknown error"}`;
          console.error(`Error for review item ${reviewItem.id}: ${errorMessage}`);
          await supabaseAdmin.from("backlinks_to_review").update({ status: currentStatus, error_log: errorMessage }).eq("id", reviewItem.id);
          return { id: reviewItem.id, status: currentStatus, error: errorMessage };
        }
        client_site_id = upsertedClientSite.id;
        console.log(`Client site found or created with ID: ${client_site_id} for URL ${client_site_url_to_use}.`);

        // 6. Insert into backlinks table
        // Check for existing backlink to prevent duplicates
        const { data: existingBacklink, error: checkError } = await supabaseAdmin
          .from("backlinks")
          .select("id")
          .eq("target_url", target_url)
          .eq("anchor_text", anchor_text)
          .eq("network_site_id", networkSite.id)
          .eq("client_site_id", client_site_id)
          .single();

        if (!checkError && existingBacklink) {
          currentStatus = "skipped_duplicate";
          errorMessage = `Backlink with target_url ${target_url} and anchor_text ${anchor_text} already exists.`;
          console.log(`Skipping review item ${reviewItem.id}: ${errorMessage}`);
          // Delete from backlinks_to_review even if skipped
          const { error: deleteError } = await supabaseAdmin
            .from("backlinks_to_review")
            .delete()
            .eq("id", reviewItem.id);
          if (deleteError) {
            console.error(`Failed to delete skipped review item ${reviewItem.id}: ${deleteError.message}`);
          }
          return { id: reviewItem.id, status: currentStatus, error: errorMessage };
        }

        const { error: insertError } = await supabaseAdmin.from("backlinks").insert({
          user_id: userId,
          client_site_id: client_site_id,
          network_site_id: networkSite.id,
          target_url: target_url,
          anchor_text: anchor_text,
          article_title: reviewItem.article_title,
          wp_post_id: reviewItem.wp_post_id_original,
          post_url: postUrl,
          status: "completed",
          created_at: reviewItem.original_created_at ? new Date(reviewItem.original_created_at).toISOString() : new Date().toISOString(),
        });

        if (insertError) {
          currentStatus = "error_insert_backlink";
          errorMessage = `Failed to insert backlink for review item ${reviewItem.id}: ${insertError.message}`;
          console.error(`Error for review item ${reviewItem.id}: ${errorMessage}`);
          await supabaseAdmin.from("backlinks_to_review").update({ status: currentStatus, error_log: errorMessage }).eq("id", reviewItem.id);
          return { id: reviewItem.id, status: currentStatus, error: errorMessage };
        }

        // 7. Delete from backlinks_to_review
        const { error: deleteError } = await supabaseAdmin
          .from("backlinks_to_review")
          .delete()
          .eq("id", reviewItem.id);

        if (deleteError) {
          currentStatus = "error_delete_review_item";
          errorMessage = `Failed to delete review item ${reviewItem.id}: ${deleteError.message}`;
          console.error(`Error for review item ${reviewItem.id}: ${errorMessage}`);
          await supabaseAdmin.from("backlinks_to_review").update({ status: currentStatus, error_log: errorMessage }).eq("id", reviewItem.id);
          return { id: reviewItem.id, status: currentStatus, error: errorMessage };
        }

        currentStatus = "success";
        console.log(`Successfully processed and moved review item ${reviewItem.id}.`);
        return { id: reviewItem.id, status: currentStatus };

      } catch (error) {
        currentStatus = "error_unhandled_exception";
        errorMessage = `Unhandled exception for review item ${reviewItem.id}: ${error.message}`;
        console.error(`Critical Unhandled Error for review item ${reviewItem.id}: ${error.message}`);
        // Attempt to update status in backlinks_to_review if possible
        try {
            await supabaseAdmin.from("backlinks_to_review").update({ status: currentStatus, error_log: errorMessage }).eq("id", reviewItem.id);
        } catch (updateErr) {
            console.error(`Failed to update status for review item ${reviewItem.id} after unhandled error: ${updateErr.message}`);
        }
        return { id: reviewItem.id, status: currentStatus, error: errorMessage };
      }
    }));

    const successCount = processedResults.filter(r => r.status === "success").length;
    const errorCount = processedResults.length - successCount;

    console.log(`Batch processing complete. Successes: ${successCount}, Errors: ${errorCount}.`);

    return new Response(JSON.stringify({
      message: `Processed ${processedResults.length} review items. Successes: ${successCount}, Errors: ${errorCount}.`,
      results: processedResults
    }));

  } catch (error) {
    console.error("Critical Function Error in process-backlinks-to-review:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
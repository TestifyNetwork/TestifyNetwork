// Edge function to add a ministry to table by generating reports and summary information 

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";
import { findByTypeInJSON, findAllByTypeInJSON, readSSEStream, injectCitationLinks } from "./utils.ts";


// Public URL for NRM, TODO: when users are added change bucket to private and don't use URL
const NONPROFIT_RESEARCH_MODEL_PUBLIC_URL = "https://fyngtvccgxbbyjvckdcf.supabase.co/storage/v1/object/public/nonprofit_research_models/NRM_v1_3_spec.md"
// const NONPROFIT_RESEARCH_MODEL_BUCKET_NAME = "nonprofit_research_models";
// const NONPROFIT_RESEARCH_MODEL_FILE_NAME = "NRM_v1_3_spec.md";

const MINISTRY_REPORTS_TABLE = "ministry_reports";
const ID_COLUMN_NAME : string = "ministry_id";
interface ReqPayload {
  ministryName: string;
  identifiableFact: string;
}

// This sets up a Deno server that our client(the website) accesses
export default {
  fetch: withSupabase({ auth: ["publishable"] }, async (req, ctx) => {
    const { ministryName, identifiableFact }: ReqPayload = await req.json();
    
    if (!ministryName || !identifiableFact) {
      throw new Error('Missing "ministryName" or "identifiableFact" parameter in request body');
    }
    console.log(`Recevied request for ${ministryName}`);

    // Check if the ministry already exists in the database before proceeding
    const { data: existingMinistry, error: searchError } = await ctx.supabase
      .from(MINISTRY_REPORTS_TABLE)
      .select("ministry_id")
      .ilike("ministry_name", ministryName)
      .maybeSingle();

    if (searchError) {
      throw searchError;
    }

    if (existingMinistry) {
      return new Response(
        JSON.stringify({ error: `A report for "${ministryName}" already exists in the database.` }),
        { headers: { 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    // Get API key saved in edge function secrets
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_KEY environment variable is not configured');
    }

    // Fetch NRM instructions and immediately extract the text, releasing the response object
    // TODO: when users are added and bucket is private Get instructions for Perplexity from storage
    //const {instructionsBlob, instructionsError}  = await ctx.supabase.storage.from(NONPROFIT_RESEARCH_MODEL_BUCKET_NAME).download(NONPROFIT_RESEARCH_MODEL_FILE_NAME);
    // if (instructionsError){
    //   throw instructionsError;
    // }
    const instructions: string = await (async () => {
      const instructionsBlob = await fetch(NONPROFIT_RESEARCH_MODEL_PUBLIC_URL);
      if (!instructionsBlob.ok) {
        throw new Error(`Unable to retrieve ${NONPROFIT_RESEARCH_MODEL_PUBLIC_URL}`);
      }
      return instructionsBlob.text();
    })();

    // Insert a new ministry row first, with only the ministry name populated
    const { data: insertedRow, error: insertError } = await ctx.supabase
      .from(MINISTRY_REPORTS_TABLE)
      .insert([
        {
          ministry_name: ministryName,
        }
      ])
      .select("ministry_id")
      .single();

    if (insertError) {
      throw insertError;
    }

    const rowId = insertedRow?.ministry_id;
    console.log(`Created row for ${ministryName} with ID ${rowId}`);
    
    // Use Perplexity to generate a report in the background
    EdgeRuntime.waitUntil((async () => {
      try {
        console.log(`Starting background task`);
        
        // Make API call to Perplexity and await the full response
        const responseFromReportRequest = await fetch('https://api.perplexity.ai/v1/agent', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: `Produce a profile of ${ministryName}(the one ${identifiableFact}) using the provided Nonprofit Research Model. Follow the instructions in the Nonprofit Research Model exactly.\n\n<beginning of Nonprofit Research Model>\n${instructions}\n<end of Nonprofit Research Model>`,
            preset: 'deep-research',
            reasoning: {effort: 'high'},
          }),
        });
        console.log("Perplexity API responded");

        // Check for response status errors
        if (!responseFromReportRequest.ok) {
          const errorText = await responseFromReportRequest.text();
          throw new Error(`Perplexity API error: ${responseFromReportRequest.status} - ${errorText}`);
        }

        const responseWithReportData: any = await responseFromReportRequest.json();
        console.log("Perplexity response parsed");

        if (!responseWithReportData) {
          throw new Error(`Perplexity returned an empty response`);
        }

        // Generated report
        const generatedReport = findByTypeInJSON(responseWithReportData, "output_text")?.text ?? "";
        if (generatedReport == ""){
          throw new Error(`Perplexity output structure differs from expected, unable to get output text`);
        }

        // Collect ALL search_results nodes across all queries, then flatten into a single list
        // sorted by their Perplexity-assigned numeric ID so citations stay in order
        const allCitations = findAllByTypeInJSON(responseWithReportData, "search_results")
          .flatMap(node => node.results ?? []);

        if (allCitations.length == 0){
          throw new Error(`Perplexity returned no citations under any "search_results" node`);
        }

        // Sort citations by their Perplexity-assigned numeric ID ascending
        allCitations.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

        // Build the URLs array with "EMPTY" at index 0 so citation IDs map directly to array indices
        // (Perplexity citation IDs start at 1, so urls[1] === citation with id 1)
        const urls: string[] = ["EMPTY"];
        for (const citation of allCitations) {
          if (typeof citation.url === "string") {
            urls.push(citation.url);
          }
        }

        console.log(`Collected ${urls.length - 1} citations across all search result nodes`);

        const reportWithLinks = injectCitationLinks(generatedReport, urls);

        console.log("Report and citations successfully generated");

        // At the end of the background task, update the new row with the generated report
        // (reportWithLinks has inline markdown citations; urls array is stored separately for reference)
        const { error: updateError } = await ctx.supabase
          .from(MINISTRY_REPORTS_TABLE)
          .update({
            generated_report: reportWithLinks,
            status: "not_verified",
            generated_citations: urls
          })
          .eq(ID_COLUMN_NAME, rowId);
        
        if (updateError) {
          throw updateError;
        }
        console.log(`Row for ${ministryName} has been updated with the generated report and citations`);

      } catch (err) {
        console.error(`Background task failed: ${err}`);
      }
    })());

  
    const responseString = JSON.stringify({
      ministry_id: rowId,
      ministry_name: ministryName
    });

    return new Response(responseString, {
      headers: {'Content-Type': 'application/json' },
      status: 202,
    });


  }),
};
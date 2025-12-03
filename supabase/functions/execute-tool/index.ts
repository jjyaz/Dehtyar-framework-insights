import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ToolRequest {
  toolName: string;
  toolInput: Record<string, unknown>;
  agentId: string;
}

// Safe math expression evaluator (basic operations only)
function evaluateExpression(expression: string): string {
  try {
    // Only allow numbers, operators, parentheses, and common math functions
    const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, "");
    if (sanitized !== expression.replace(/\s/g, "").replace(/Math\.(sin|cos|tan|sqrt|abs|pow|log|exp|floor|ceil|round)\(/g, "(")) {
      // Check if only math functions were removed
      const mathFuncPattern = /Math\.(sin|cos|tan|sqrt|abs|pow|log|exp|floor|ceil|round)/g;
      const withMath = expression.replace(mathFuncPattern, "MATHFUNC");
      const sanitizedWithMath = withMath.replace(/[^0-9+\-*/().%\sMATHFUNC]/g, "");
      if (sanitizedWithMath !== withMath.replace(/\s/g, "")) {
        return "Error: Invalid characters in expression";
      }
    }
    
    // Use Function constructor for evaluation (safer than eval for math)
    const result = new Function(`return ${expression}`)();
    return String(result);
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : "Invalid expression"}`;
  }
}

// Format search results for display
function formatSearchResults(data: any): string {
  if (!data || !data.data || data.data.length === 0) {
    return "No search results found.";
  }
  
  return "[Web Search Results]\n" + 
    data.data.map((item: any, i: number) => 
      `${i + 1}. ${item.title || "Untitled"}\n   URL: ${item.url}\n   ${item.description || item.markdown?.substring(0, 200) || "No description"}`
    ).join("\n\n");
}

// Format scraped content for display
function formatScrapedContent(data: any): string {
  if (!data || !data.markdown) {
    return "Failed to extract content from URL.";
  }
  
  const title = data.metadata?.title || "Untitled";
  const content = data.markdown.substring(0, 3000); // Limit content length
  
  return `[Fetched Content]\nTitle: ${title}\n\n${content}${data.markdown.length > 3000 ? "\n\n... (content truncated)" : ""}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { toolName, toolInput, agentId }: ToolRequest = await req.json();

    console.log(`Executing tool: ${toolName}`, toolInput);

    let result: string;

    switch (toolName) {
      case "web_search": {
        const query = toolInput.query as string;
        if (!query) {
          result = "Error: No search query provided";
          break;
        }
        
        if (!FIRECRAWL_API_KEY) {
          result = `[Web Search for "${query}"]\nNote: Web search requires Firecrawl API configuration. Please connect Firecrawl in Workspace Settings → Integrations.`;
          break;
        }
        
        try {
          console.log(`Performing web search for: ${query}`);
          const response = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
              query, 
              limit: 5,
              scrapeOptions: { formats: ["markdown"] }
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error("Firecrawl search error:", response.status, errorText);
            result = `Error performing web search: ${response.status} - ${errorText}`;
            break;
          }
          
          const data = await response.json();
          console.log(`Search returned ${data.data?.length || 0} results`);
          result = formatSearchResults(data);
        } catch (error) {
          console.error("Web search error:", error);
          result = `Error performing web search: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
        break;
      }

      case "fetch_url": {
        const url = toolInput.url as string;
        if (!url) {
          result = "Error: No URL provided";
          break;
        }
        
        if (!FIRECRAWL_API_KEY) {
          result = `[Fetch URL: ${url}]\nNote: URL fetching requires Firecrawl API configuration. Please connect Firecrawl in Workspace Settings → Integrations.`;
          break;
        }
        
        try {
          console.log(`Fetching URL: ${url}`);
          const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
              url,
              formats: ["markdown"],
              onlyMainContent: true
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error("Firecrawl scrape error:", response.status, errorText);
            result = `Error fetching URL: ${response.status} - ${errorText}`;
            break;
          }
          
          const data = await response.json();
          console.log(`Successfully scraped ${url}`);
          result = formatScrapedContent(data);
        } catch (error) {
          console.error("URL fetch error:", error);
          result = `Error fetching URL: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
        break;
      }

      case "get_datetime": {
        const now = new Date();
        const datetime = {
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          dayOfWeek: now.toLocaleDateString('en', { weekday: 'long' }),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timestamp: now.toISOString(),
          unix: Math.floor(now.getTime() / 1000)
        };
        result = `[Current Date/Time]\nDate: ${datetime.date}\nTime: ${datetime.time}\nDay: ${datetime.dayOfWeek}\nTimezone: ${datetime.timezone}\nISO: ${datetime.timestamp}`;
        break;
      }

      case "calculator": {
        const expression = toolInput.expression as string;
        if (!expression) {
          result = "Error: No expression provided";
          break;
        }
        result = evaluateExpression(expression);
        break;
      }

      case "memory_store": {
        const content = toolInput.content as string;
        const memoryType = (toolInput.type as string) || "short_term";
        const importance = (toolInput.importance as number) || 0.5;

        if (!content) {
          result = "Error: No content provided to store";
          break;
        }

        const { error } = await supabase.from("agent_memory").insert({
          agent_id: agentId,
          content,
          memory_type: memoryType,
          importance,
        });

        if (error) {
          result = `Error storing memory: ${error.message}`;
        } else {
          result = `Successfully stored ${memoryType} memory: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`;
        }
        break;
      }

      case "memory_recall": {
        const searchQuery = toolInput.query as string;
        const limit = (toolInput.limit as number) || 5;

        let query = supabase
          .from("agent_memory")
          .select("content, memory_type, importance, created_at")
          .eq("agent_id", agentId)
          .order("importance", { ascending: false })
          .limit(limit);

        // If search query provided, filter by content (basic search)
        if (searchQuery) {
          query = query.ilike("content", `%${searchQuery}%`);
        }

        const { data: memories, error } = await query;

        if (error) {
          result = `Error recalling memories: ${error.message}`;
        } else if (!memories || memories.length === 0) {
          result = "No memories found matching your query.";
        } else {
          result = "[Retrieved Memories]\n" +
            memories.map((m, i) => 
              `${i + 1}. [${m.memory_type}] (importance: ${m.importance}): ${m.content}`
            ).join("\n");
        }
        break;
      }

      case "code_executor": {
        // Code execution is deferred - requires sandboxing for security
        const code = toolInput.code as string;
        const language = toolInput.language as string || "javascript";
        result = `[Code Execution - ${language}]\n` +
          `Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\n` +
          `Note: Secure code execution is not yet implemented. ` +
          `I can reason about what this code would do, but cannot execute it directly.`;
        break;
      }

      default:
        result = `Unknown tool: ${toolName}. Available tools: web_search, fetch_url, get_datetime, calculator, memory_store, memory_recall`;
    }

    console.log(`Tool ${toolName} result:`, result.substring(0, 200));

    return new Response(
      JSON.stringify({ result }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Tool execution error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

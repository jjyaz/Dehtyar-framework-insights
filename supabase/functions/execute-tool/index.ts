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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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
        // Placeholder - will implement real web search in Phase 2
        result = `[Web Search Results for "${query}"]\n` +
          `Note: Full web search integration coming soon. ` +
          `For now, I can help you reason about this topic based on my training data.`;
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
          result = `Successfully stored memory: "${content.substring(0, 50)}..."`;
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
        // Placeholder - code execution requires sandboxing
        result = "[Code Execution]\n" +
          "Note: Secure code execution is not yet implemented. " +
          "This feature requires proper sandboxing and will be available in a future update.";
        break;
      }

      default:
        result = `Unknown tool: ${toolName}. Available tools: web_search, calculator, memory_store, memory_recall`;
    }

    console.log(`Tool ${toolName} result:`, result.substring(0, 100));

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

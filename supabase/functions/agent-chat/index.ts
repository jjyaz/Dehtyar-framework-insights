import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface AgentRequest {
  agentId?: string;
  conversationId?: string;
  message: string;
  useMemory?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { agentId, conversationId, message, useMemory = true }: AgentRequest = await req.json();

    // Get agent configuration
    let agent = null;
    if (agentId) {
      const { data: agentData } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agentId)
        .single();
      agent = agentData;
    } else {
      // Default to Dehtyar agent
      const { data: agentData } = await supabase
        .from("agents")
        .select("*")
        .eq("name", "Dehtyar")
        .single();
      agent = agentData;
    }

    if (!agent) {
      throw new Error("Agent not found");
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ title: message.substring(0, 50) })
        .select()
        .single();
      convId = newConv?.id;
    }

    // Store user message
    await supabase.from("conversation_messages").insert({
      conversation_id: convId,
      role: "user",
      content: message,
    });

    // Get conversation history
    const { data: history } = await supabase
      .from("conversation_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Get relevant memories if enabled
    let memoryContext = "";
    if (useMemory) {
      const { data: memories } = await supabase
        .from("agent_memory")
        .select("content, memory_type")
        .eq("agent_id", agent.id)
        .order("importance", { ascending: false })
        .limit(5);

      if (memories && memories.length > 0) {
        memoryContext = "\n\n[MEMORY CONTEXT]\n" + 
          memories.map((m) => `[${m.memory_type}]: ${m.content}`).join("\n");
      }
    }

    // Get available tools
    const { data: tools } = await supabase.from("agent_tools").select("name, description, parameters");

    const toolsContext = tools && tools.length > 0
      ? "\n\n[AVAILABLE TOOLS]\n" + tools.map((t) => `- ${t.name}: ${t.description}`).join("\n")
      : "";

    // Build messages for AI
    const messages: AgentMessage[] = [
      {
        role: "system",
        content: agent.system_prompt + memoryContext + toolsContext +
          "\n\nYou are an autonomous AI agent capable of reasoning, planning, and executing tasks. " +
          "When given a complex goal, break it down into smaller tasks. " +
          "Think step by step and explain your reasoning. " +
          "If you need to use a tool, describe which tool you would use and why.",
      },
      ...(history || []).map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
    ];

    console.log("Agent request:", { agentId: agent.id, model: agent.model, messageCount: messages.length });

    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: agent.model || "google/gemini-2.5-flash",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // For non-streaming response storage, we'll handle the stream
    // but also collect the full response to store in DB
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    // Create a TransformStream to both forward and collect the response
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Process stream in background
    (async () => {
      try {
        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          await writer.write(new TextEncoder().encode(chunk));

          // Parse SSE to extract content
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                }
              } catch {
                // Ignore parse errors for partial JSON
              }
            }
          }
        }

        // Store assistant response after stream completes
        if (fullResponse && convId) {
          await supabase.from("conversation_messages").insert({
            conversation_id: convId,
            agent_id: agent.id,
            role: "assistant",
            content: fullResponse,
          });

          // Store in short-term memory if significant
          if (fullResponse.length > 100) {
            await supabase.from("agent_memory").insert({
              agent_id: agent.id,
              memory_type: "short_term",
              content: `User asked: "${message.substring(0, 100)}..." | Response: "${fullResponse.substring(0, 200)}..."`,
              importance: 0.5,
            });
          }
        }

        await writer.close();
      } catch (error) {
        console.error("Stream processing error:", error);
        await writer.abort(error);
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Conversation-Id": convId || "",
      },
    });
  } catch (error) {
    console.error("Agent chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

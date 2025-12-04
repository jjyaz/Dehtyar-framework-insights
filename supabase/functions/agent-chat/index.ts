import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ITERATIONS = 5;

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

interface ReasoningStep {
  thought: string;
  plan?: string[];
  criticism?: string;
  action: {
    type: "tool" | "respond" | "continue";
    tool_name?: string;
    tool_input?: Record<string, unknown>;
    message?: string;
  };
}

// Tool calling schema for structured reasoning
const agentReasoningTool = {
  type: "function",
  function: {
    name: "agent_reasoning",
    description: "Structure your reasoning and decide on an action. Use this for EVERY response.",
    parameters: {
      type: "object",
      properties: {
        thought: {
          type: "string",
          description: "What you're currently thinking about this problem",
        },
        plan: {
          type: "array",
          items: { type: "string" },
          description: "Your step-by-step plan to solve this",
        },
        criticism: {
          type: "string",
          description: "What could go wrong with your approach",
        },
        action: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["tool", "respond", "continue"],
              description: "tool=use a tool, respond=give final answer, continue=need more reasoning",
            },
            tool_name: {
              type: "string",
              description: "Name of tool to use (if type=tool)",
            },
            tool_input: {
              type: "object",
              description: "Input parameters for the tool (if type=tool)",
            },
            message: {
              type: "string",
              description: "Your response to the user (if type=respond)",
            },
          },
          required: ["type"],
        },
      },
      required: ["thought", "action"],
    },
  },
};

async function executeToolCall(
  supabaseUrl: string,
  toolName: string,
  toolInput: Record<string, unknown>,
  agentId: string
): Promise<string> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/execute-tool`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ toolName, toolInput, agentId }),
    });

    if (!response.ok) {
      const error = await response.text();
      return `[Tool Error: ${error}]`;
    }

    const result = await response.json();
    return result.result || result.error || "[No result]";
  } catch (error) {
    console.error("Tool execution error:", error);
    return `[Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}]`;
  }
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

    // Build initial messages
    const systemPrompt = agent.system_prompt + memoryContext + toolsContext +
      "\n\nIMPORTANT: You MUST use the agent_reasoning tool for EVERY response. " +
      "Structure your thinking with thought, plan, criticism, and action. " +
      "For complex tasks, use action.type='continue' to keep reasoning. " +
      "Use action.type='tool' to call a tool. " +
      "Use action.type='respond' with a message only when you have a complete answer.";

    const messages: AgentMessage[] = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
    ];

    console.log("Starting autonomous loop for agent:", agent.id, "conversation:", convId);

    // Create streaming response
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Helper to send SSE events
    const sendEvent = async (event: string, data: unknown) => {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    };

    // Process autonomous loop in background
    (async () => {
      let iteration = 0;
      let finalResponse = "";
      const reasoningHistory: string[] = [];

      try {
        while (iteration < MAX_ITERATIONS) {
          iteration++;
          console.log(`Iteration ${iteration}/${MAX_ITERATIONS}`);

          // Send iteration start event
          await sendEvent("iteration", { step: iteration, max: MAX_ITERATIONS });

          // Build messages with reasoning history
          const currentMessages = [
            ...messages,
            ...reasoningHistory.map((r) => ({ role: "assistant" as const, content: r })),
          ];

          // Call Lovable AI with tool calling
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: agent.model || "google/gemini-2.5-flash",
              messages: currentMessages,
              tools: [agentReasoningTool],
              tool_choice: { type: "function", function: { name: "agent_reasoning" } },
            }),
          });

          if (!response.ok) {
            if (response.status === 429) {
              await sendEvent("error", { message: "Rate limits exceeded, please try again later." });
              break;
            }
            if (response.status === 402) {
              await sendEvent("error", { message: "Payment required, please add funds." });
              break;
            }
            const errorText = await response.text();
            console.error("AI gateway error:", response.status, errorText);
            throw new Error(`AI gateway error: ${response.status}`);
          }

          const aiResponse = await response.json();
          const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

          if (!toolCall || toolCall.function.name !== "agent_reasoning") {
            // Fallback: if no tool call, try to extract content
            const content = aiResponse.choices?.[0]?.message?.content;
            if (content) {
              finalResponse = content;
              await sendEvent("reasoning", {
                step: iteration,
                thought: "Direct response without structured reasoning",
                action: { type: "respond", message: content },
              });
            }
            break;
          }

          // Parse the structured reasoning
          let reasoning: ReasoningStep;
          try {
            reasoning = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            console.error("Failed to parse reasoning:", toolCall.function.arguments);
            break;
          }

          console.log(`Step ${iteration} reasoning:`, reasoning.action.type);

          // Store reasoning step in database
          await supabase.from("agent_reasoning_steps").insert({
            conversation_id: convId,
            agent_id: agent.id,
            step_number: iteration,
            thought: reasoning.thought,
            plan: reasoning.plan,
            criticism: reasoning.criticism,
            action: reasoning.action,
          });

          // Send reasoning event to client
          await sendEvent("reasoning", {
            step: iteration,
            thought: reasoning.thought,
            plan: reasoning.plan,
            criticism: reasoning.criticism,
            action: reasoning.action,
          });

          // Handle action based on type
          if (reasoning.action.type === "tool" && reasoning.action.tool_name) {
            // Execute tool
            await sendEvent("tool_call", {
              tool: reasoning.action.tool_name,
              input: reasoning.action.tool_input,
            });

            const toolResult = await executeToolCall(
              SUPABASE_URL!,
              reasoning.action.tool_name,
              reasoning.action.tool_input || {},
              agent.id
            );

            // Update reasoning step with result
            await supabase
              .from("agent_reasoning_steps")
              .update({ action_result: toolResult })
              .eq("conversation_id", convId)
              .eq("step_number", iteration);

            await sendEvent("tool_result", {
              tool: reasoning.action.tool_name,
              result: toolResult,
            });

            // Add tool result to reasoning history for next iteration
            reasoningHistory.push(
              `[Previous thought: ${reasoning.thought}]\n` +
              `[Used tool: ${reasoning.action.tool_name}]\n` +
              `[Tool result: ${toolResult}]\n` +
              `Continue reasoning with this new information.`
            );
          } else if (reasoning.action.type === "continue") {
            // Add reasoning to history for continued thinking
            reasoningHistory.push(
              `[Previous thought: ${reasoning.thought}]\n` +
              `[Plan: ${reasoning.plan?.join(" → ") || "None"}]\n` +
              `[Criticism: ${reasoning.criticism || "None"}]\n` +
              `Continue with the next step of your plan.`
            );
          } else if (reasoning.action.type === "respond") {
            // Final response - stream it to the user
            finalResponse = reasoning.action.message || "";
            
            // Stream the final response character by character for effect
            for (let i = 0; i < finalResponse.length; i += 3) {
              const chunk = finalResponse.slice(i, i + 3);
              await writer.write(
                encoder.encode(`data: ${JSON.stringify({
                  choices: [{ delta: { content: chunk } }],
                })}\n\n`)
              );
              // Small delay for streaming effect
              await new Promise((r) => setTimeout(r, 10));
            }
            break;
          }
        }

        // If we hit max iterations without responding, generate a response
        if (!finalResponse && iteration >= MAX_ITERATIONS) {
          finalResponse = "I've been thinking deeply about your request, but I need more time to formulate a complete response. Could you help me focus by being more specific?";
          
          for (let i = 0; i < finalResponse.length; i += 3) {
            const chunk = finalResponse.slice(i, i + 3);
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({
                choices: [{ delta: { content: chunk } }],
              })}\n\n`)
            );
            await new Promise((r) => setTimeout(r, 10));
          }
        }

        // Store final assistant response
        if (finalResponse && convId) {
          await supabase.from("conversation_messages").insert({
            conversation_id: convId,
            agent_id: agent.id,
            role: "assistant",
            content: finalResponse,
          });

          // Store in memory if significant
          if (finalResponse.length > 100) {
            await supabase.from("agent_memory").insert({
              agent_id: agent.id,
              memory_type: "short_term",
              content: `User asked: "${message.substring(0, 100)}..." | Response summary: "${finalResponse.substring(0, 200)}..."`,
              importance: 0.5,
            });
          }
        }

        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();
      } catch (error) {
        console.error("Autonomous loop error:", error);
        await sendEvent("error", { message: error instanceof Error ? error.message : "Unknown error" });
        await writer.close();
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

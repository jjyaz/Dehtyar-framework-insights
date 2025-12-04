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
        const category = (toolInput.category as string) || "episodic";

        if (!content) {
          result = "Error: No content provided to store";
          break;
        }

        // Generate embedding using Lovable AI
        let embedding = null;
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        
        if (LOVABLE_API_KEY) {
          try {
            const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "text-embedding-3-small",
                input: content
              })
            });
            
            if (embeddingResponse.ok) {
              const embeddingData = await embeddingResponse.json();
              embedding = embeddingData.data?.[0]?.embedding;
              console.log("Generated embedding for memory");
            }
          } catch (err) {
            console.error("Error generating embedding:", err);
          }
        }

        const { error } = await supabase.from("agent_memory").insert({
          agent_id: agentId,
          content,
          memory_type: memoryType,
          importance,
          memory_category: category,
          embedding,
        });

        if (error) {
          result = `Error storing memory: ${error.message}`;
        } else {
          result = `Successfully stored ${category} memory (${memoryType}): "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`;
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

      // === PHASE 3: TASK DECOMPOSITION TOOLS ===
      
      case "create_task": {
        const title = toolInput.title as string;
        const description = toolInput.description as string;
        const priority = (toolInput.priority as number) || 0;
        const parentTaskId = toolInput.parent_task_id as string;
        
        if (!title) {
          result = "Error: Task title is required";
          break;
        }
        
        const { data: task, error } = await supabase
          .from("tasks")
          .insert({
            title,
            description,
            priority,
            parent_task_id: parentTaskId || null,
            agent_id: agentId,
            status: "pending"
          })
          .select()
          .single();
        
        if (error) {
          result = `Error creating task: ${error.message}`;
        } else {
          result = `[Task Created]\nID: ${task.id}\nTitle: ${title}\nPriority: ${priority}\nStatus: pending${parentTaskId ? `\nParent Task: ${parentTaskId}` : ""}`;
        }
        break;
      }
      
      case "decompose_task": {
        const goalTitle = toolInput.goal as string;
        const goalDescription = toolInput.description as string;
        const subtasks = toolInput.subtasks as Array<{ title: string; description?: string; priority?: number }>;
        
        if (!goalTitle || !subtasks || subtasks.length === 0) {
          result = "Error: Goal title and subtasks array are required";
          break;
        }
        
        // Create parent task
        const { data: parentTask, error: parentError } = await supabase
          .from("tasks")
          .insert({
            title: goalTitle,
            description: goalDescription,
            agent_id: agentId,
            status: "in_progress",
            priority: 1
          })
          .select()
          .single();
        
        if (parentError) {
          result = `Error creating parent task: ${parentError.message}`;
          break;
        }
        
        // Create subtasks
        const subtaskInserts = subtasks.map((st, index) => ({
          title: st.title,
          description: st.description || null,
          priority: st.priority ?? index,
          parent_task_id: parentTask.id,
          agent_id: agentId,
          status: "pending"
        }));
        
        const { data: createdSubtasks, error: subtaskError } = await supabase
          .from("tasks")
          .insert(subtaskInserts)
          .select();
        
        if (subtaskError) {
          result = `Parent task created but error creating subtasks: ${subtaskError.message}`;
        } else {
          result = `[Task Decomposed]\nGoal: ${goalTitle}\nID: ${parentTask.id}\n\nSubtasks created (${createdSubtasks.length}):\n` +
            createdSubtasks.map((st, i) => `  ${i + 1}. ${st.title} (ID: ${st.id})`).join("\n");
        }
        break;
      }
      
      case "list_tasks": {
        const statusFilter = toolInput.status as string;
        const parentOnly = toolInput.parent_only as boolean;
        
        let query = supabase
          .from("tasks")
          .select("id, title, description, status, priority, parent_task_id, created_at")
          .eq("agent_id", agentId)
          .order("priority", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(20);
        
        if (statusFilter) {
          query = query.eq("status", statusFilter);
        }
        
        if (parentOnly) {
          query = query.is("parent_task_id", null);
        }
        
        const { data: tasks, error } = await query;
        
        if (error) {
          result = `Error listing tasks: ${error.message}`;
        } else if (!tasks || tasks.length === 0) {
          result = "No tasks found.";
        } else {
          result = "[Current Tasks]\n" +
            tasks.map((t, i) => {
              const statusIcon = t.status === "completed" ? "✅" : t.status === "in_progress" ? "🔄" : "⏳";
              return `${i + 1}. ${statusIcon} ${t.title}\n   ID: ${t.id}\n   Status: ${t.status}${t.parent_task_id ? "\n   (subtask)" : ""}`;
            }).join("\n\n");
        }
        break;
      }
      
      case "get_task": {
        const taskId = toolInput.task_id as string;
        
        if (!taskId) {
          result = "Error: task_id is required";
          break;
        }
        
        // Get task with its subtasks
        const { data: task, error: taskError } = await supabase
          .from("tasks")
          .select("*")
          .eq("id", taskId)
          .single();
        
        if (taskError || !task) {
          result = `Error: Task not found (${taskId})`;
          break;
        }
        
        const { data: subtasks } = await supabase
          .from("tasks")
          .select("id, title, status, priority")
          .eq("parent_task_id", taskId)
          .order("priority", { ascending: true });
        
        const statusIcon = task.status === "completed" ? "✅" : task.status === "in_progress" ? "🔄" : "⏳";
        result = `[Task Details]\n${statusIcon} ${task.title}\nID: ${task.id}\nStatus: ${task.status}\nPriority: ${task.priority}\nDescription: ${task.description || "None"}`;
        
        if (subtasks && subtasks.length > 0) {
          const completed = subtasks.filter(s => s.status === "completed").length;
          result += `\n\nSubtasks (${completed}/${subtasks.length} completed):\n` +
            subtasks.map((st, i) => {
              const stIcon = st.status === "completed" ? "✅" : st.status === "in_progress" ? "🔄" : "⏳";
              return `  ${i + 1}. ${stIcon} ${st.title}`;
            }).join("\n");
        }
        break;
      }
      
      case "update_task": {
        const taskId = toolInput.task_id as string;
        const newStatus = toolInput.status as string;
        const newResult = toolInput.result as any;
        
        if (!taskId) {
          result = "Error: task_id is required";
          break;
        }
        
        const updates: Record<string, any> = {};
        if (newStatus) {
          updates.status = newStatus;
          if (newStatus === "completed") {
            updates.completed_at = new Date().toISOString();
          }
        }
        if (newResult !== undefined) {
          updates.result = newResult;
        }
        
        const { data: updatedTask, error } = await supabase
          .from("tasks")
          .update(updates)
          .eq("id", taskId)
          .select()
          .single();
        
        if (error) {
          result = `Error updating task: ${error.message}`;
        } else {
          result = `[Task Updated]\nID: ${taskId}\nNew Status: ${updatedTask.status}${updatedTask.completed_at ? `\nCompleted: ${updatedTask.completed_at}` : ""}`;
          
          // Check if all subtasks of parent are complete
          if (updatedTask.parent_task_id && newStatus === "completed") {
            const { data: siblings } = await supabase
              .from("tasks")
              .select("status")
              .eq("parent_task_id", updatedTask.parent_task_id);
            
            if (siblings && siblings.every(s => s.status === "completed")) {
              await supabase
                .from("tasks")
                .update({ status: "completed", completed_at: new Date().toISOString() })
                .eq("id", updatedTask.parent_task_id);
              result += "\n\n✅ All subtasks complete - parent task marked as completed!";
            }
          }
        }
        break;
      }
      
      case "get_next_task": {
        // Get the next pending task to work on
        const { data: nextTask, error } = await supabase
          .from("tasks")
          .select("id, title, description, priority, parent_task_id")
          .eq("agent_id", agentId)
          .eq("status", "pending")
          .order("priority", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(1)
          .single();
        
        if (error || !nextTask) {
          result = "No pending tasks found. All tasks are complete or none exist.";
        } else {
          // Mark as in progress
          await supabase
            .from("tasks")
            .update({ status: "in_progress" })
            .eq("id", nextTask.id);
          
          result = `[Next Task to Work On]\nTitle: ${nextTask.title}\nID: ${nextTask.id}\nPriority: ${nextTask.priority}\nDescription: ${nextTask.description || "None"}\n\nTask is now marked as in_progress.`;
        }
        break;
      }

      // === PHASE 4: ENHANCED MEMORY TOOLS ===
      
      case "memory_search": {
        const query = toolInput.query as string;
        const limit = (toolInput.limit as number) || 5;
        const category = toolInput.category as string;
        
        if (!query) {
          result = "Error: Search query is required";
          break;
        }
        
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        
        // Try semantic search with embeddings first
        if (LOVABLE_API_KEY) {
          try {
            // Generate embedding for the search query
            const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "text-embedding-3-small",
                input: query
              })
            });
            
            if (embeddingResponse.ok) {
              const embeddingData = await embeddingResponse.json();
              const queryEmbedding = embeddingData.data?.[0]?.embedding;
              
              if (queryEmbedding) {
                // Use pgvector for similarity search
                const { data: memories, error } = await supabase.rpc('match_memories', {
                  query_embedding: queryEmbedding,
                  match_threshold: 0.5,
                  match_count: limit,
                  p_agent_id: agentId,
                  p_category: category || null
                });
                
                if (!error && memories && memories.length > 0) {
                  // Update access count for retrieved memories
                  const memoryIds = memories.map((m: any) => m.id);
                  await supabase
                    .from("agent_memory")
                    .update({ access_count: supabase.rpc('increment_access_count') })
                    .in("id", memoryIds);
                  
                  result = "[Semantic Memory Search Results]\n" +
                    memories.map((m: any, i: number) => 
                      `${i + 1}. [${m.memory_category}] (similarity: ${(m.similarity * 100).toFixed(1)}%)\n   ${m.content}`
                    ).join("\n\n");
                  break;
                }
              }
            }
          } catch (err) {
            console.error("Semantic search error:", err);
          }
        }
        
        // Fallback to keyword search
        let fallbackQuery = supabase
          .from("agent_memory")
          .select("id, content, memory_type, memory_category, importance, created_at")
          .eq("agent_id", agentId)
          .ilike("content", `%${query}%`)
          .order("importance", { ascending: false })
          .limit(limit);
        
        if (category) {
          fallbackQuery = fallbackQuery.eq("memory_category", category);
        }
        
        const { data: fallbackMemories, error: fallbackError } = await fallbackQuery;
        
        if (fallbackError) {
          result = `Error searching memories: ${fallbackError.message}`;
        } else if (!fallbackMemories || fallbackMemories.length === 0) {
          result = `No memories found matching "${query}"`;
        } else {
          result = "[Keyword Memory Search Results]\n" +
            fallbackMemories.map((m, i) => 
              `${i + 1}. [${m.memory_category}] (importance: ${m.importance})\n   ${m.content}`
            ).join("\n\n");
        }
        break;
      }
      
      case "memory_reflect": {
        const topic = toolInput.topic as string;
        const depth = (toolInput.depth as number) || 10;
        
        if (!topic) {
          result = "Error: Topic is required for reflection";
          break;
        }
        
        // Get memories related to the topic
        const { data: memories, error } = await supabase
          .from("agent_memory")
          .select("content, memory_category, importance, created_at")
          .eq("agent_id", agentId)
          .ilike("content", `%${topic}%`)
          .order("importance", { ascending: false })
          .limit(depth);
        
        if (error || !memories || memories.length === 0) {
          result = `No memories found about "${topic}" to reflect on.`;
          break;
        }
        
        // Use Lovable AI to synthesize reflections
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        
        if (LOVABLE_API_KEY) {
          try {
            const memoryContext = memories.map((m, i) => 
              `Memory ${i + 1} [${m.memory_category}]: ${m.content}`
            ).join("\n");
            
            const reflectionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content: "You are a memory reflection system. Analyze the provided memories and synthesize key insights, patterns, and connections. Be concise but insightful."
                  },
                  {
                    role: "user",
                    content: `Reflect on these memories about "${topic}":\n\n${memoryContext}\n\nProvide 2-3 key insights or patterns you observe.`
                  }
                ]
              })
            });
            
            if (reflectionResponse.ok) {
              const reflectionData = await reflectionResponse.json();
              const reflection = reflectionData.choices?.[0]?.message?.content;
              
              if (reflection) {
                // Store the reflection as a new semantic memory
                await supabase.from("agent_memory").insert({
                  agent_id: agentId,
                  content: `[Reflection on "${topic}"] ${reflection}`,
                  memory_type: "reflection",
                  memory_category: "semantic",
                  importance: 0.8
                });
                
                result = `[Memory Reflection on "${topic}"]\n\nBased on ${memories.length} memories:\n\n${reflection}\n\n(This reflection has been stored as a semantic memory)`;
                break;
              }
            }
          } catch (err) {
            console.error("Reflection error:", err);
          }
        }
        
        // Fallback: just list the memories without AI synthesis
        result = `[Memories about "${topic}" for reflection]\n\n` +
          memories.map((m, i) => `${i + 1}. [${m.memory_category}] ${m.content}`).join("\n\n");
        break;
      }
      
      case "memory_forget": {
        const memoryId = toolInput.memory_id as string;
        const reason = toolInput.reason as string;
        
        if (!memoryId) {
          result = "Error: memory_id is required";
          break;
        }
        
        // Apply decay rather than hard delete
        const { data: memory, error: fetchError } = await supabase
          .from("agent_memory")
          .select("content, decay_factor")
          .eq("id", memoryId)
          .eq("agent_id", agentId)
          .single();
        
        if (fetchError || !memory) {
          result = `Error: Memory not found (${memoryId})`;
          break;
        }
        
        const newDecay = Math.max(0, (memory.decay_factor || 1.0) - 0.5);
        
        const { error: updateError } = await supabase
          .from("agent_memory")
          .update({ 
            decay_factor: newDecay,
            importance: newDecay < 0.2 ? 0 : undefined
          })
          .eq("id", memoryId);
        
        if (updateError) {
          result = `Error updating memory: ${updateError.message}`;
        } else if (newDecay < 0.2) {
          // Memory is effectively forgotten
          await supabase.from("agent_memory").delete().eq("id", memoryId);
          result = `[Memory Forgotten]\nMemory "${memory.content.substring(0, 50)}..." has been removed.\nReason: ${reason || "Not specified"}`;
        } else {
          result = `[Memory Decayed]\nMemory "${memory.content.substring(0, 50)}..." decay factor reduced to ${newDecay.toFixed(2)}.\nReason: ${reason || "Not specified"}\n\nAnother forget call will remove it completely.`;
        }
        break;
      }
      
      case "memory_consolidate": {
        const memoryIds = toolInput.memory_ids as string[];
        const summary = toolInput.summary as string;
        
        if (!memoryIds || memoryIds.length < 2) {
          result = "Error: At least 2 memory_ids are required for consolidation";
          break;
        }
        
        // Fetch the memories to consolidate
        const { data: memories, error: fetchError } = await supabase
          .from("agent_memory")
          .select("id, content, importance, memory_category")
          .in("id", memoryIds)
          .eq("agent_id", agentId);
        
        if (fetchError || !memories || memories.length < 2) {
          result = `Error: Could not find memories to consolidate`;
          break;
        }
        
        let consolidatedContent = summary;
        
        // If no summary provided, use AI to generate one
        if (!consolidatedContent) {
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          
          if (LOVABLE_API_KEY) {
            try {
              const memoryTexts = memories.map(m => m.content).join("\n---\n");
              
              const consolidateResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: [
                    {
                      role: "system",
                      content: "You consolidate related memories into a single coherent summary. Be concise but preserve important details."
                    },
                    {
                      role: "user",
                      content: `Consolidate these ${memories.length} related memories into one:\n\n${memoryTexts}`
                    }
                  ]
                })
              });
              
              if (consolidateResponse.ok) {
                const consolidateData = await consolidateResponse.json();
                consolidatedContent = consolidateData.choices?.[0]?.message?.content;
              }
            } catch (err) {
              console.error("Consolidation AI error:", err);
            }
          }
          
          // Fallback: simple concatenation
          if (!consolidatedContent) {
            consolidatedContent = `[Consolidated] ${memories.map(m => m.content).join(" | ")}`;
          }
        }
        
        // Calculate new importance (max of all + bonus)
        const maxImportance = Math.min(1.0, Math.max(...memories.map(m => m.importance || 0.5)) + 0.1);
        const dominantCategory = memories[0].memory_category || "semantic";
        
        // Create consolidated memory
        const { data: newMemory, error: insertError } = await supabase
          .from("agent_memory")
          .insert({
            agent_id: agentId,
            content: consolidatedContent,
            memory_type: "consolidated",
            memory_category: dominantCategory,
            importance: maxImportance
          })
          .select()
          .single();
        
        if (insertError) {
          result = `Error creating consolidated memory: ${insertError.message}`;
          break;
        }
        
        // Remove old memories
        await supabase.from("agent_memory").delete().in("id", memoryIds);
        
        result = `[Memories Consolidated]\n${memories.length} memories merged into:\n\n"${consolidatedContent.substring(0, 200)}${consolidatedContent.length > 200 ? '...' : ''}"\n\nNew memory ID: ${newMemory.id}\nImportance: ${maxImportance}`;
        break;
      }

      // === PHASE 5: COUNCIL/MULTI-AGENT TOOLS ===
      
      case "summon_agent": {
        const agentName = toolInput.agent_name as string;
        const reason = toolInput.reason as string;
        
        if (!agentName) {
          result = "Error: agent_name is required. Valid agents: Dohar, Dehto, Diyar";
          break;
        }
        
        // Find the agent by name
        const { data: targetAgent, error: agentError } = await supabase
          .from("agents")
          .select("id, name, role")
          .ilike("name", agentName)
          .single();
        
        if (agentError || !targetAgent) {
          result = `Error: Agent "${agentName}" not found. Valid agents: Dohar, Dehto, Diyar`;
          break;
        }
        
        // Log the summoning
        console.log(`Agent summoned: ${targetAgent.name} (${targetAgent.id}) - Reason: ${reason || "No reason given"}`);
        
        result = `[Agent Summoned]\nName: ${targetAgent.name}\nRole: ${targetAgent.role}\nID: ${targetAgent.id}\n\n${targetAgent.name} has joined the council.${reason ? `\nReason: ${reason}` : ""}`;
        break;
      }
      
      case "delegate_task": {
        const targetAgentName = toolInput.agent_name as string;
        const task = toolInput.task as string;
        const context = toolInput.context as string;
        
        if (!targetAgentName || !task) {
          result = "Error: agent_name and task are required";
          break;
        }
        
        // Find the target agent
        const { data: targetAgent, error: agentError } = await supabase
          .from("agents")
          .select("id, name, role, system_prompt")
          .ilike("name", targetAgentName)
          .single();
        
        if (agentError || !targetAgent) {
          result = `Error: Agent "${targetAgentName}" not found`;
          break;
        }
        
        // Use Lovable AI to generate the agent's response
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        
        if (LOVABLE_API_KEY) {
          try {
            const delegateResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content: targetAgent.system_prompt
                  },
                  {
                    role: "user",
                    content: `[Delegated Task from Council Lead]\n\nTask: ${task}${context ? `\n\nContext: ${context}` : ""}\n\nProvide your response to this delegated task.`
                  }
                ]
              })
            });
            
            if (delegateResponse.ok) {
              const delegateData = await delegateResponse.json();
              const response = delegateData.choices?.[0]?.message?.content;
              
              result = `[${targetAgent.name}'s Response to Delegated Task]\n\n${response || "No response generated"}`;
              break;
            }
          } catch (err) {
            console.error("Delegate task error:", err);
          }
        }
        
        result = `[Delegation Sent]\nAgent: ${targetAgent.name}\nTask: ${task}\n\n(Note: Could not generate AI response)`;
        break;
      }
      
      case "request_insight": {
        const targetAgentName = toolInput.agent_name as string;
        const topic = toolInput.topic as string;
        
        if (!targetAgentName || !topic) {
          result = "Error: agent_name and topic are required";
          break;
        }
        
        // Find the target agent
        const { data: targetAgent, error: agentError } = await supabase
          .from("agents")
          .select("id, name, role, system_prompt")
          .ilike("name", targetAgentName)
          .single();
        
        if (agentError || !targetAgent) {
          result = `Error: Agent "${targetAgentName}" not found`;
          break;
        }
        
        // Use Lovable AI to generate the agent's insight
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        
        if (LOVABLE_API_KEY) {
          try {
            const insightResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content: targetAgent.system_prompt
                  },
                  {
                    role: "user",
                    content: `[Request for Insight]\n\nTopic: ${topic}\n\nShare your unique perspective and insights on this topic. Be true to your character and provide valuable input.`
                  }
                ]
              })
            });
            
            if (insightResponse.ok) {
              const insightData = await insightResponse.json();
              const response = insightData.choices?.[0]?.message?.content;
              
              result = `[${targetAgent.name}'s Insight on "${topic}"]\n\n${response || "No insight generated"}`;
              break;
            }
          } catch (err) {
            console.error("Request insight error:", err);
          }
        }
        
        result = `[Insight Requested]\nAgent: ${targetAgent.name}\nTopic: ${topic}\n\n(Note: Could not generate AI response)`;
        break;
      }
      
      case "synthesize_council": {
        const insights = toolInput.insights as string[] | string;
        const topic = toolInput.topic as string;
        
        if (!insights || !topic) {
          result = "Error: insights array and topic are required";
          break;
        }
        
        const insightsList = Array.isArray(insights) ? insights : [insights];
        
        // Use Lovable AI to synthesize
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        
        if (LOVABLE_API_KEY) {
          try {
            const synthesisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content: "You are synthesizing multiple perspectives from a council of agents into a coherent recommendation. Be balanced and acknowledge different viewpoints while providing clear direction."
                  },
                  {
                    role: "user",
                    content: `[Council Synthesis Request]\n\nTopic: ${topic}\n\nAgent Insights:\n${insightsList.join("\n\n---\n\n")}\n\nSynthesize these perspectives into a unified recommendation.`
                  }
                ]
              })
            });
            
            if (synthesisResponse.ok) {
              const synthesisData = await synthesisResponse.json();
              const synthesis = synthesisData.choices?.[0]?.message?.content;
              
              result = `[Council Synthesis on "${topic}"]\n\n${synthesis || "No synthesis generated"}`;
              break;
            }
          } catch (err) {
            console.error("Synthesis error:", err);
          }
        }
        
        result = `[Synthesis Attempted]\nTopic: ${topic}\nInsights received: ${insightsList.length}\n\n(Note: Could not generate AI synthesis)`;
        break;
      }

      default:
        result = `Unknown tool: ${toolName}. Available tools: web_search, fetch_url, get_datetime, calculator, memory_store, memory_recall, memory_search, memory_reflect, memory_forget, memory_consolidate, create_task, decompose_task, list_tasks, get_task, update_task, get_next_task, summon_agent, delegate_task, request_insight, synthesize_council`;
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

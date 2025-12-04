import { useState, useCallback } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ReasoningStep {
  step: number;
  thought: string;
  plan?: string[];
  criticism?: string;
  action: {
    type: "tool" | "respond" | "continue";
    tool_name?: string;
    tool_input?: Record<string, unknown>;
    message?: string;
  };
  toolResult?: string;
}

interface UseAgentChatOptions {
  agentId?: string;
  conversationId?: string;
  onError?: (error: string) => void;
}

export function useAgentChat(options: UseAgentChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    options.conversationId || null
  );
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isThinking, setIsThinking] = useState(false);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      const userMessage: Message = { role: "user", content: message };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setIsThinking(true);
      setReasoningSteps([]);
      setCurrentStep(0);

      let assistantContent = "";

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              agentId: options.agentId,
              conversationId: currentConversationId,
              message,
              useMemory: true,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to get response");
        }

        // Get conversation ID from response header
        const convId = response.headers.get("X-Conversation-Id");
        if (convId && !currentConversationId) {
          setCurrentConversationId(convId);
        }

        // Process streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        // Add empty assistant message that we'll update
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete events
          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n\n")) !== -1) {
            const eventBlock = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 2);

            // Parse SSE event
            const lines = eventBlock.split("\n");
            let eventType = "message";
            let eventData = "";

            for (const line of lines) {
              if (line.startsWith("event: ")) {
                eventType = line.slice(7);
              } else if (line.startsWith("data: ")) {
                eventData = line.slice(6);
              }
            }

            if (eventData === "[DONE]") {
              continue;
            }

            try {
              if (eventType === "iteration") {
                const data = JSON.parse(eventData);
                setCurrentStep(data.step);
              } else if (eventType === "reasoning") {
                const data = JSON.parse(eventData);
                setReasoningSteps((prev) => [...prev, data]);
                
                // If this is a respond action, we'll be getting the message soon
                if (data.action?.type === "respond") {
                  setIsThinking(false);
                }
              } else if (eventType === "tool_call") {
                const data = JSON.parse(eventData);
                // Update the last reasoning step with tool info
                setReasoningSteps((prev) => {
                  const newSteps = [...prev];
                  if (newSteps.length > 0) {
                    newSteps[newSteps.length - 1] = {
                      ...newSteps[newSteps.length - 1],
                      action: {
                        ...newSteps[newSteps.length - 1].action,
                        tool_name: data.tool,
                        tool_input: data.input,
                      },
                    };
                  }
                  return newSteps;
                });
              } else if (eventType === "tool_result") {
                const data = JSON.parse(eventData);
                // Update the last reasoning step with tool result
                setReasoningSteps((prev) => {
                  const newSteps = [...prev];
                  if (newSteps.length > 0) {
                    newSteps[newSteps.length - 1].toolResult = data.result;
                  }
                  return newSteps;
                });
              } else if (eventType === "error") {
                const data = JSON.parse(eventData);
                throw new Error(data.message);
              } else {
                // Default: try to parse as content
                const json = JSON.parse(eventData);
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  setIsThinking(false);
                  assistantContent += content;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage?.role === "assistant") {
                      lastMessage.content = assistantContent;
                    }
                    return newMessages;
                  });
                }
              }
            } catch {
              // Try parsing as simple data line
              if (eventData && eventData !== "[DONE]") {
                try {
                  const json = JSON.parse(eventData);
                  const content = json.choices?.[0]?.delta?.content;
                  if (content) {
                    setIsThinking(false);
                    assistantContent += content;
                    setMessages((prev) => {
                      const newMessages = [...prev];
                      const lastMessage = newMessages[newMessages.length - 1];
                      if (lastMessage?.role === "assistant") {
                        lastMessage.content = assistantContent;
                      }
                      return newMessages;
                    });
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }

          // Handle remaining single-line data events
          let lineIndex: number;
          while ((lineIndex = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, lineIndex);
            buffer = buffer.slice(lineIndex + 1);

            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  setIsThinking(false);
                  assistantContent += content;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage?.role === "assistant") {
                      lastMessage.content = assistantContent;
                    }
                    return newMessages;
                  });
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (error) {
        console.error("Chat error:", error);
        options.onError?.(error instanceof Error ? error.message : "Unknown error");
        // Remove the empty assistant message on error
        setMessages((prev) => prev.filter((m) => m.content !== ""));
      } finally {
        setIsLoading(false);
        setIsThinking(false);
      }
    },
    [currentConversationId, options]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
    setReasoningSteps([]);
    setCurrentStep(0);
  }, []);

  return {
    messages,
    isLoading,
    isThinking,
    sendMessage,
    clearChat,
    conversationId: currentConversationId,
    reasoningSteps,
    currentStep,
  };
}

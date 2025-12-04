import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CouncilAgent {
  id: string;
  name: string;
  avatar_url?: string;
  chat_avatar_url?: string;
  isActive: boolean;
  isSpeaking: boolean;
}

export interface CouncilMessage {
  id: string;
  fromAgentId: string;
  fromAgentName: string;
  toAgentId?: string;
  toAgentName?: string;
  messageType: "summon" | "delegate" | "response" | "insight" | "decision" | "synthesis";
  content: string;
  timestamp: Date;
}

export interface CouncilSession {
  id: string;
  status: "active" | "deliberating" | "concluded";
  userRequest: string;
  activeAgents: string[];
  finalSynthesis?: string;
}

interface UseCouncilChatOptions {
  conversationId?: string;
  leadAgentId: string;
  onCouncilStart?: (session: CouncilSession) => void;
  onAgentSummoned?: (agent: CouncilAgent) => void;
  onAgentMessage?: (message: CouncilMessage) => void;
  onCouncilEnd?: (synthesis: string) => void;
}

export function useCouncilChat(options: UseCouncilChatOptions) {
  const [isCouncilActive, setIsCouncilActive] = useState(false);
  const [councilSession, setCouncilSession] = useState<CouncilSession | null>(null);
  const [councilAgents, setCouncilAgents] = useState<CouncilAgent[]>([]);
  const [councilMessages, setCouncilMessages] = useState<CouncilMessage[]>([]);
  const [speakingAgentId, setSpeakingAgentId] = useState<string | null>(null);
  const [allAgents, setAllAgents] = useState<Map<string, { name: string; avatar_url?: string; chat_avatar_url?: string }>>(new Map());

  // Fetch all agents on mount for name lookup
  useEffect(() => {
    const fetchAgents = async () => {
      const { data } = await supabase.from("agents").select("id, name, avatar_url, chat_avatar_url");
      if (data) {
        const agentMap = new Map();
        data.forEach((a) => agentMap.set(a.id, { name: a.name, avatar_url: a.avatar_url, chat_avatar_url: a.chat_avatar_url }));
        setAllAgents(agentMap);
      }
    };
    fetchAgents();
  }, []);

  // Subscribe to realtime updates for council_sessions
  useEffect(() => {
    if (!options.conversationId) return;

    const channel = supabase
      .channel(`council_${options.conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "council_sessions",
          filter: `conversation_id=eq.${options.conversationId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const session = payload.new as any;
            setCouncilSession({
              id: session.id,
              status: session.status,
              userRequest: session.user_request,
              activeAgents: session.active_agents || [],
              finalSynthesis: session.final_synthesis,
            });
            setIsCouncilActive(session.status !== "concluded");
            
            if (session.status === "concluded" && session.final_synthesis) {
              options.onCouncilEnd?.(session.final_synthesis);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.conversationId]);

  // Subscribe to realtime updates for agent_messages
  useEffect(() => {
    if (!councilSession?.id) return;

    const channel = supabase
      .channel(`council_messages_${councilSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_messages",
          filter: `council_session_id=eq.${councilSession.id}`,
        },
        (payload) => {
          const msg = payload.new as any;
          const fromAgent = allAgents.get(msg.from_agent_id);
          const toAgent = msg.to_agent_id ? allAgents.get(msg.to_agent_id) : null;

          const newMessage: CouncilMessage = {
            id: msg.id,
            fromAgentId: msg.from_agent_id,
            fromAgentName: fromAgent?.name || "Unknown",
            toAgentId: msg.to_agent_id,
            toAgentName: toAgent?.name,
            messageType: msg.message_type,
            content: msg.content,
            timestamp: new Date(msg.created_at),
          };

          setCouncilMessages((prev) => [...prev, newMessage]);
          setSpeakingAgentId(msg.from_agent_id);
          options.onAgentMessage?.(newMessage);

          // Update speaking agent after a delay
          setTimeout(() => setSpeakingAgentId(null), 2000);

          // If it's a summon message, add the agent to the council
          if (msg.message_type === "summon" && msg.to_agent_id) {
            const summonedAgent = allAgents.get(msg.to_agent_id);
            if (summonedAgent) {
              const newAgent: CouncilAgent = {
                id: msg.to_agent_id,
                name: summonedAgent.name,
                avatar_url: summonedAgent.avatar_url,
                chat_avatar_url: summonedAgent.chat_avatar_url,
                isActive: true,
                isSpeaking: false,
              };
              setCouncilAgents((prev) => {
                if (prev.find((a) => a.id === newAgent.id)) return prev;
                return [...prev, newAgent];
              });
              options.onAgentSummoned?.(newAgent);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [councilSession?.id, allAgents]);

  // Update speaking status in councilAgents
  useEffect(() => {
    setCouncilAgents((prev) =>
      prev.map((agent) => ({
        ...agent,
        isSpeaking: agent.id === speakingAgentId,
      }))
    );
  }, [speakingAgentId]);

  const startCouncil = useCallback(
    (sessionData: CouncilSession, leadAgent: CouncilAgent) => {
      setIsCouncilActive(true);
      setCouncilSession(sessionData);
      setCouncilAgents([{ ...leadAgent, isActive: true, isSpeaking: false }]);
      setCouncilMessages([]);
      options.onCouncilStart?.(sessionData);
    },
    [options]
  );

  const endCouncil = useCallback(() => {
    setIsCouncilActive(false);
    setSpeakingAgentId(null);
  }, []);

  const clearCouncil = useCallback(() => {
    setIsCouncilActive(false);
    setCouncilSession(null);
    setCouncilAgents([]);
    setCouncilMessages([]);
    setSpeakingAgentId(null);
  }, []);

  return {
    isCouncilActive,
    councilSession,
    councilAgents,
    councilMessages,
    speakingAgentId,
    startCouncil,
    endCouncil,
    clearCouncil,
  };
}

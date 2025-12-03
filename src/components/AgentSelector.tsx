import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Loader2 } from "lucide-react";
import { getAgentAvatars } from "@/lib/avatarMap";

export interface Agent {
  id: string;
  name: string;
  role: string;
  avatar_url: string | null;
  chat_avatar_url: string | null;
}

interface AgentSelectorProps {
  onSelect: (agent: Agent) => void;
  onClose: () => void;
}

export function AgentSelector({ onSelect, onClose }: AgentSelectorProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAgents() {
      const { data, error } = await supabase
        .from("agents")
        .select("id, name, role, avatar_url, chat_avatar_url")
        .order("name");
      
      if (error) {
        console.error("Failed to fetch agents:", error);
      } else {
        setAgents(data || []);
      }
      setIsLoading(false);
    }

    fetchAgents();
  }, []);

  return (
    <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg overflow-hidden w-full max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/80">
        <div className="flex flex-col">
          <span className="font-pixel text-sm text-foreground">Choose Your Agent</span>
          <span className="text-xs text-muted-foreground">Select an agent to begin your conversation</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-muted rounded-md transition-colors"
          title="Close"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Video Preview */}
      <div className="px-4 pt-4">
        <video
          src="/videos/agents-preview-v2.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full rounded-lg border border-border/30 shadow-inner"
        />
      </div>

      {/* Agent Grid */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No agents available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {agents.map((agent) => {
              const avatars = getAgentAvatars(agent.name);
              const avatarSrc = avatars.avatar;
              
              return (
                <button
                  key={agent.id}
                  onClick={() => onSelect(agent)}
                  className="flex flex-col items-center p-4 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/60 hover:border-primary/50 transition-all group"
                >
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={agent.name}
                      className="w-20 h-20 mb-3 group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-20 h-20 mb-3 bg-muted rounded-full flex items-center justify-center">
                      <span className="font-pixel text-2xl text-muted-foreground">
                        {agent.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className="font-pixel text-xs text-foreground">{agent.name}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{agent.role}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

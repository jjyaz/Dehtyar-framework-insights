import { useRef, useEffect } from "react";
import { AgentBubble } from "./AgentBubble";
import { CouncilAgent, CouncilMessage } from "@/hooks/useCouncilChat";
import { getAgentAvatars } from "@/lib/avatarMap";
import { cn } from "@/lib/utils";
import { Users, MessageCircle, Sparkles } from "lucide-react";

interface CouncilViewProps {
  leadAgent: CouncilAgent;
  councilAgents: CouncilAgent[];
  messages: CouncilMessage[];
  speakingAgentId: string | null;
  userRequest: string;
  finalSynthesis?: string;
  isActive: boolean;
  className?: string;
}

function MessageTypeIcon({ type }: { type: CouncilMessage["messageType"] }) {
  switch (type) {
    case "summon":
      return <Users className="w-3 h-3 text-primary" />;
    case "delegate":
      return <MessageCircle className="w-3 h-3 text-blue-500" />;
    case "insight":
      return <Sparkles className="w-3 h-3 text-yellow-500" />;
    case "synthesis":
      return <Sparkles className="w-3 h-3 text-primary" />;
    default:
      return null;
  }
}

function getAgentColor(agentName: string): string {
  const colors: Record<string, string> = {
    Dehtyar: "border-primary/50 bg-primary/10",
    Dohar: "border-purple-500/50 bg-purple-500/10",
    Dehto: "border-cyan-500/50 bg-cyan-500/10",
    Diyar: "border-orange-500/50 bg-orange-500/10",
  };
  return colors[agentName] || "border-muted bg-muted/30";
}

function getAgentTextColor(agentName: string): string {
  const colors: Record<string, string> = {
    Dehtyar: "text-primary",
    Dohar: "text-purple-400",
    Dehto: "text-cyan-400",
    Diyar: "text-orange-400",
  };
  return colors[agentName] || "text-foreground";
}

export function CouncilView({
  leadAgent,
  councilAgents,
  messages,
  speakingAgentId,
  userRequest,
  finalSynthesis,
  isActive,
  className,
}: CouncilViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Position agents in a circle (excluding lead who is at bottom)
  const getAgentPosition = (index: number, total: number) => {
    // Spread agents across top half of circle (from 200deg to 340deg)
    const startAngle = 200;
    const endAngle = 340;
    const angleRange = endAngle - startAngle;
    const angle = startAngle + (angleRange / (total + 1)) * (index + 1);
    const radians = (angle * Math.PI) / 180;
    const radius = 40; // percentage from center
    const x = 50 + radius * Math.cos(radians);
    const y = 50 + radius * Math.sin(radians);
    return { x, y };
  };

  const otherAgents = councilAgents.filter((a) => a.id !== leadAgent.id);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Council Circle */}
      <div className="relative w-full h-48 bg-muted/20 border-b border-border/50">
        {/* Center - Current Topic */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center max-w-[60%]">
          <p className="text-[10px] font-pixel text-muted-foreground mb-1">COUNCIL TOPIC</p>
          <p className="text-xs text-foreground line-clamp-2">{userRequest}</p>
          {isActive && (
            <div className="flex items-center justify-center gap-1 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] text-primary font-pixel">DELIBERATING</span>
            </div>
          )}
        </div>

        {/* Lead Agent at bottom center */}
        <div
          className="absolute transform -translate-x-1/2"
          style={{ left: "50%", bottom: "8px" }}
        >
          <AgentBubble
            agentName={leadAgent.name}
            avatarUrl={leadAgent.avatar_url}
            chatAvatarUrl={leadAgent.chat_avatar_url}
            isSpeaking={leadAgent.id === speakingAgentId}
            isActive={leadAgent.isActive}
            size="lg"
          />
        </div>

        {/* Other agents positioned around the circle */}
        {otherAgents.map((agent, index) => {
          const pos = getAgentPosition(index, otherAgents.length);
          return (
            <div
              key={agent.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <AgentBubble
                agentName={agent.name}
                avatarUrl={agent.avatar_url}
                chatAvatarUrl={agent.chat_avatar_url}
                isSpeaking={agent.id === speakingAgentId}
                isActive={agent.isActive}
                size="md"
              />
            </div>
          );
        })}

        {/* Connection lines between agents (optional visual) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {otherAgents.map((agent, index) => {
            const pos = getAgentPosition(index, otherAgents.length);
            return (
              <line
                key={agent.id}
                x1="50"
                y1="85"
                x2={pos.x}
                y2={pos.y}
                className={cn(
                  "stroke-border/30 transition-all duration-300",
                  agent.id === speakingAgentId && "stroke-primary/50"
                )}
                strokeWidth="0.3"
                strokeDasharray={agent.id === speakingAgentId ? "none" : "2,2"}
              />
            );
          })}
        </svg>
      </div>

      {/* Messages Timeline */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-pixel">Waiting for council deliberation...</p>
          </div>
        )}

        {messages.map((msg) => {
          const avatars = getAgentAvatars(msg.fromAgentName);
          const avatar = avatars.chatAvatar || avatars.avatar;

          return (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.fromAgentId === leadAgent.id ? "justify-start" : "justify-start"
              )}
            >
              {/* Agent Avatar */}
              <div className="w-8 h-8 flex-shrink-0">
                {avatar ? (
                  <img src={avatar} alt={msg.fromAgentName} className="w-8 h-8 object-cover rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="font-pixel text-xs">{msg.fromAgentName.charAt(0)}</span>
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn("font-pixel text-xs", getAgentTextColor(msg.fromAgentName))}>
                    {msg.fromAgentName}
                  </span>
                  <MessageTypeIcon type={msg.messageType} />
                  {msg.toAgentName && (
                    <span className="text-[10px] text-muted-foreground">
                      → {msg.toAgentName}
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm border",
                    getAgentColor(msg.fromAgentName)
                  )}
                >
                  <p className="text-foreground whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          );
        })}

        {/* Final Synthesis */}
        {finalSynthesis && (
          <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-pixel text-xs text-primary">COUNCIL SYNTHESIS</span>
            </div>
            <p className="text-sm text-foreground">{finalSynthesis}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

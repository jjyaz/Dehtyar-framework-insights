import { getAgentAvatars } from "@/lib/avatarMap";
import { cn } from "@/lib/utils";

interface AgentBubbleProps {
  agentName: string;
  avatarUrl?: string;
  chatAvatarUrl?: string;
  isSpeaking?: boolean;
  isActive?: boolean;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
}

export function AgentBubble({
  agentName,
  avatarUrl,
  chatAvatarUrl,
  isSpeaking = false,
  isActive = true,
  size = "md",
  showName = true,
  className,
}: AgentBubbleProps) {
  const avatars = getAgentAvatars(agentName);
  const displayAvatar = chatAvatarUrl || avatars.chatAvatar || avatarUrl || avatars.avatar;

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
  };

  const nameSizeClasses = {
    sm: "text-[8px]",
    md: "text-[10px]",
    lg: "text-xs",
  };

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div
        className={cn(
          "relative rounded-full transition-all duration-300",
          sizeClasses[size],
          isSpeaking && "animate-pulse",
          !isActive && "opacity-50 grayscale"
        )}
      >
        {/* Glow effect when speaking */}
        {isSpeaking && (
          <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
        )}

        {/* Outer ring */}
        <div
          className={cn(
            "absolute inset-0 rounded-full border-2 transition-colors duration-300",
            isSpeaking ? "border-primary shadow-lg shadow-primary/50" : "border-border/50",
            isActive && "border-primary/30"
          )}
        />

        {/* Avatar */}
        {displayAvatar ? (
          <img
            src={displayAvatar}
            alt={agentName}
            className={cn(
              "w-full h-full object-cover rounded-full",
              isSpeaking && "glow-pink"
            )}
          />
        ) : (
          <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
            <span className="font-pixel text-foreground">{agentName.charAt(0)}</span>
          </div>
        )}

        {/* Active indicator */}
        {isActive && (
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
              isSpeaking ? "bg-primary animate-pulse" : "bg-green-500"
            )}
          />
        )}
      </div>

      {showName && (
        <span
          className={cn(
            "font-pixel text-center max-w-[80px] truncate",
            nameSizeClasses[size],
            isSpeaking ? "text-primary" : "text-muted-foreground"
          )}
        >
          {agentName}
        </span>
      )}
    </div>
  );
}

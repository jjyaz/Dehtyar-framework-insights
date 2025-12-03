// Import all available avatar assets
import dehtyarAvatar from "@/assets/dehtyar.png";
import dehtyarChatAvatar from "@/assets/dehtyar-chat.png";

// Map agent names to their avatar imports
const avatarMap: Record<string, { avatar: string; chatAvatar: string }> = {
  dehtyar: {
    avatar: dehtyarAvatar,
    chatAvatar: dehtyarChatAvatar,
  },
};

export function getAgentAvatars(agentName: string): { avatar: string | null; chatAvatar: string | null } {
  const key = agentName.toLowerCase();
  const entry = avatarMap[key];
  
  return {
    avatar: entry?.avatar || null,
    chatAvatar: entry?.chatAvatar || null,
  };
}

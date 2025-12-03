// Import all available avatar assets
import dehtyarAvatar from "@/assets/dehtyar.png";
import dehtyarChatAvatar from "@/assets/dehtyar-chat.png";
import doharAvatar from "@/assets/dohar.png";
import doharChatAvatar from "@/assets/dohar-chat.png";
import diyarAvatar from "@/assets/diyar.png";
import diyarChatAvatar from "@/assets/diyar-chat.png";
import dehtoAvatar from "@/assets/dehto.png";
import dehtoChatAvatar from "@/assets/dehto-chat.png";

// Map agent names to their avatar imports
const avatarMap: Record<string, { avatar: string; chatAvatar: string }> = {
  dehtyar: {
    avatar: dehtyarAvatar,
    chatAvatar: dehtyarChatAvatar,
  },
  dohar: {
    avatar: doharAvatar,
    chatAvatar: doharChatAvatar,
  },
  diyar: {
    avatar: diyarChatAvatar,
    chatAvatar: diyarAvatar,
  },
  dehto: {
    avatar: dehtoAvatar,
    chatAvatar: dehtoChatAvatar,
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

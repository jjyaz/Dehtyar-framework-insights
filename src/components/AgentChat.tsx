import { useState, useRef, useEffect } from "react";
import { useAgentChat } from "@/hooks/useAgentChat";
import { useToast } from "@/hooks/use-toast";
import { Send, Trash2, User, Loader2 } from "lucide-react";
import dehtyarChat from "@/assets/dehtyar-chat.png";

interface AgentChatProps {
  agentId?: string;
  className?: string;
}

export function AgentChat({ agentId, className = "" }: AgentChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { messages, isLoading, sendMessage, clearChat } = useAgentChat({
    agentId,
    onError: (error) => {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput("");
    }
  };

  return (
    <div className={`flex flex-col h-full bg-background/50 backdrop-blur-sm border border-border/50 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/80">
        <div className="flex items-center gap-2">
          <img src={dehtyarChat} alt="Dehtyar" className="w-10 h-10" />
          <span className="font-pixel text-sm text-foreground">Dehtyar Agent</span>
        </div>
        <button
          onClick={clearChat}
          className="p-2 hover:bg-muted rounded-md transition-colors"
          title="Clear chat"
        >
          <Trash2 className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <img src={dehtyarChat} alt="Dehtyar" className="w-24 h-24 mx-auto mb-4 opacity-80" />
            <p className="font-pixel text-sm">I am Dehtyar, your autonomous AI agent.</p>
            <p className="text-xs mt-2">Ask me anything or give me a task to accomplish.</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && (
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                <img src={dehtyarChat} alt="Dehtyar" className="w-12 h-12" />
              </div>
            )}
            
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-foreground border border-border/50"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content || (isLoading && message.role === "assistant" ? "..." : "")}</p>
            </div>
            
            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-foreground" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3 justify-start">
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
              <img src={dehtyarChat} alt="Dehtyar" className="w-12 h-12" />
            </div>
            <div className="bg-muted/50 rounded-lg px-4 py-2 border border-border/50">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border/50 bg-background/80">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Dehtyar anything..."
            className="flex-1 bg-muted/50 border border-border/50 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

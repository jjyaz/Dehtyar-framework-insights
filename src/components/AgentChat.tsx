import { useState, useRef, useEffect } from "react";
import { useAgentChat, ReasoningStep } from "@/hooks/useAgentChat";
import { useToast } from "@/hooks/use-toast";
import { Send, X, Trash2, User, Loader2, Brain, ChevronDown, ChevronUp, Wrench, ArrowLeft } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Agent } from "@/components/AgentSelector";

interface AgentChatProps {
  selectedAgent: Agent;
  className?: string;
  onClose?: () => void;
  onBack?: () => void;
}

function ReasoningPanel({ steps, currentStep, isThinking }: { 
  steps: ReasoningStep[]; 
  currentStep: number;
  isThinking: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (steps.length === 0 && !isThinking) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs bg-muted/30 border-b border-border/50 hover:bg-muted/50 transition-colors">
        <Brain className={`w-3 h-3 ${isThinking ? "animate-pulse text-primary" : "text-muted-foreground"}`} />
        <span className="text-muted-foreground">
          {isThinking ? `Thinking... Step ${currentStep}` : `${steps.length} reasoning step${steps.length !== 1 ? "s" : ""}`}
        </span>
        {isOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="bg-muted/20 border-b border-border/50">
        <div className="p-3 space-y-3 max-h-48 overflow-y-auto text-xs">
          {steps.map((step, index) => (
            <div key={index} className="space-y-1 pb-2 border-b border-border/30 last:border-0">
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="font-medium">Step {step.step}</span>
                {step.action.type === "tool" && (
                  <span className="flex items-center gap-1 text-primary">
                    <Wrench className="w-3 h-3" />
                    {step.action.tool_name}
                  </span>
                )}
              </div>
              <p className="text-foreground/80">💭 {step.thought}</p>
              {step.plan && step.plan.length > 0 && (
                <p className="text-muted-foreground">📋 {step.plan.join(" → ")}</p>
              )}
              {step.criticism && (
                <p className="text-muted-foreground">⚠️ {step.criticism}</p>
              )}
              {step.toolResult && (
                <div className="mt-1 p-2 bg-background/50 rounded text-muted-foreground">
                  <span className="font-medium">Result:</span> {step.toolResult.substring(0, 200)}
                  {step.toolResult.length > 200 && "..."}
                </div>
              )}
            </div>
          ))}
          {isThinking && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Processing step {currentStep}...</span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AgentChat({ selectedAgent, className = "", onClose, onBack }: AgentChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const agentAvatar = selectedAgent.chat_avatar_url || selectedAgent.avatar_url;

  const { 
    messages, 
    isLoading, 
    isThinking,
    sendMessage, 
    clearChat,
    reasoningSteps,
    currentStep,
  } = useAgentChat({
    agentId: selectedAgent.id,
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
  }, [messages, reasoningSteps]);

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
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title="Back to agents"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {agentAvatar ? (
            <img src={agentAvatar} alt={selectedAgent.name} className="w-10 h-10" />
          ) : (
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <span className="font-pixel text-lg">{selectedAgent.name.charAt(0)}</span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-pixel text-sm text-foreground">{selectedAgent.name}</span>
            {isThinking && (
              <span className="text-xs text-primary flex items-center gap-1">
                <Brain className="w-3 h-3 animate-pulse" />
                Reasoning...
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title="Close chat"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Reasoning Panel */}
      <ReasoningPanel steps={reasoningSteps} currentStep={currentStep} isThinking={isThinking} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            {agentAvatar ? (
              <img src={agentAvatar} alt={selectedAgent.name} className="w-24 h-24 mx-auto mb-4 opacity-80" />
            ) : (
              <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <span className="font-pixel text-4xl">{selectedAgent.name.charAt(0)}</span>
              </div>
            )}
            <p className="font-pixel text-sm">I am {selectedAgent.name}, your autonomous AI agent.</p>
            <p className="text-xs mt-2">I think step-by-step and can use tools to help you.</p>
            <p className="text-xs mt-1 text-muted-foreground/70">Ask me anything or give me a task to accomplish.</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && (
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                {agentAvatar ? (
                  <img src={agentAvatar} alt={selectedAgent.name} className="w-12 h-12" />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                    <span className="font-pixel text-lg">{selectedAgent.name.charAt(0)}</span>
                  </div>
                )}
              </div>
            )}
            
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-foreground border border-border/50"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">
                {message.content || (isLoading && message.role === "assistant" ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {isThinking ? "Thinking..." : "Responding..."}
                  </span>
                ) : "")}
              </p>
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
              {agentAvatar ? (
                <img src={agentAvatar} alt={selectedAgent.name} className="w-12 h-12" />
              ) : (
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <span className="font-pixel text-lg">{selectedAgent.name.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="bg-muted/50 rounded-lg px-4 py-2 border border-border/50">
              <span className="flex items-center gap-2 text-sm">
                <Brain className="w-4 h-4 animate-pulse text-primary" />
                Starting to think...
              </span>
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
            placeholder={`Ask ${selectedAgent.name} anything...`}
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

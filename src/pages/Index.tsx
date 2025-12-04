import { useState, useCallback } from "react";
import { DehtyarCharacter } from "@/components/DehtyarCharacter";
import { FeatureStation } from "@/components/FeatureStation";
import { ScrollIndicator } from "@/components/ScrollIndicator";
import { Sparkles } from "@/components/Sparkles";
import { PixelButton } from "@/components/PixelButton";
import { AgentChat } from "@/components/AgentChat";
import { AgentSelector, Agent } from "@/components/AgentSelector";
import { DocumentationScroll } from "@/components/DocumentationScroll";
import { Brain, Users, MessageSquare, ScrollText, Wrench, Eye, ChevronDown, Github } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [showChat, setShowChat] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [caDropdownOpen, setCaDropdownOpen] = useState(false);

  const openDehtyarChat = useCallback(async () => {
    // Fetch Dehtyar directly and open chat
    const { data } = await supabase
      .from("agents")
      .select("id, name, role, avatar_url, chat_avatar_url")
      .eq("name", "Dehtyar")
      .single();
    
    if (data) {
      setSelectedAgent(data);
    }
    setShowChat(true);
  }, []);

  const openAgentSelector = useCallback(() => {
    setSelectedAgent(null);
    setShowChat(true);
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    {
      icon: <Brain className="w-12 h-12" />,
      title: "Memory Sanctum",
      subtitle: "COGNITIVE CORE",
      description:
        "Short-term context and long-term vector storage. The agent remembers what matters and forgets what doesn't.",
      features: [
        "Persistent knowledge base",
        "Context-aware recall",
        "Intelligent forgetting",
      ],
      side: "left" as const,
      sourceRepos: [
        { name: "AutoGPT", url: "https://github.com/Significant-Gravitas/AutoGPT" },
        { name: "SuperAGI", url: "https://github.com/TransformerOptimus/SuperAGI" },
      ],
      implementation: {
        status: "complete" as const,
        details: "agent_memory table with memory_type (short_term/long_term), importance scoring (0-1), and last_accessed tracking. The execute-tool edge function provides memory_store and memory_recall tools.",
        techStack: ["Supabase Database", "Edge Functions"],
      },
    },
    {
      icon: <Users className="w-12 h-12" />,
      title: "The Guild System",
      subtitle: "MULTI-AGENT CREWS",
      description:
        "Role-based agents working in harmony. Researchers, writers, analysts—each with their purpose.",
      features: [
        "Role specialization",
        "Hierarchical delegation",
        "Collaborative problem-solving",
      ],
      side: "right" as const,
      sourceRepos: [
        { name: "CrewAI", url: "https://github.com/crewAIInc/crewAI" },
      ],
      implementation: {
        status: "partial" as const,
        details: "agents table supports multiple agents with role, system_prompt, model, and tools configuration. Multi-agent orchestration and crew delegation planned for Phase 5.",
        techStack: ["Agent Registry", "Database Schema"],
      },
    },
    {
      icon: <MessageSquare className="w-12 h-12" />,
      title: "Council Chamber",
      subtitle: "AGENT DISCOURSE",
      description:
        "Agents converse to reach consensus. Multi-agent dialogue with human oversight when needed.",
      features: [
        "Inter-agent communication",
        "Human-in-the-loop gates",
        "Consensus building",
      ],
      side: "left" as const,
      sourceRepos: [
        { name: "AutoGen", url: "https://github.com/microsoft/autogen" },
      ],
      implementation: {
        status: "planned" as const,
        details: "Framework for multi-agent conversation with human-in-the-loop gates. Will build on conversations and conversation_messages tables for structured discourse.",
        techStack: ["Future: Multi-Agent Chat"],
      },
    },
    {
      icon: <ScrollText className="w-12 h-12" />,
      title: "Quest Board",
      subtitle: "TASK ORCHESTRATION",
      description:
        "Complex goals broken into achievable quests. Prioritized, tracked, and executed with precision.",
      features: [
        "Goal decomposition",
        "Priority management",
        "Progress tracking",
      ],
      side: "right" as const,
      sourceRepos: [
        { name: "AgentGPT", url: "https://github.com/reworkd/AgentGPT" },
      ],
      implementation: {
        status: "partial" as const,
        details: "tasks table with parent_task_id for hierarchical decomposition, priority for ordering, and status tracking. Full task decomposition loop planned for Phase 3.",
        techStack: ["Database Schema", "Future: Task Orchestrator"],
      },
    },
    {
      icon: <Wrench className="w-12 h-12" />,
      title: "The Armory",
      subtitle: "TOOLKIT ARSENAL",
      description:
        "A marketplace of capabilities. Web browsing, code execution, API integration—tools for every quest.",
      features: [
        "Extensible toolkits",
        "Performance metrics",
        "Safe execution sandbox",
      ],
      side: "left" as const,
      sourceRepos: [
        { name: "SuperAGI", url: "https://github.com/TransformerOptimus/SuperAGI" },
        { name: "Superagent", url: "https://github.com/superagent-ai/superagent" },
      ],
      implementation: {
        status: "complete" as const,
        details: "agent_tools table defines available tools. execute-tool edge function routes to implementations: calculator (safe math evaluation), memory_store, memory_recall, web_search (placeholder).",
        techStack: ["Edge Functions", "Tool Registry"],
      },
    },
    {
      icon: <Eye className="w-12 h-12" />,
      title: "Oracle Loop",
      subtitle: "AUTONOMOUS CYCLE",
      description:
        "Think. Reason. Plan. Criticize. Act. The eternal loop of autonomous intelligence.",
      features: [
        "Self-reflection",
        "Strategic planning",
        "Continuous improvement",
      ],
      side: "right" as const,
      sourceRepos: [
        { name: "AutoGPT", url: "https://github.com/Significant-Gravitas/AutoGPT" },
      ],
      implementation: {
        status: "complete" as const,
        details: "agent_reasoning_steps table stores each step. The agent-chat edge function implements a 5-iteration autonomous loop using structured tool calling with JSON output (thought, plan, criticism, action).",
        techStack: ["AI Gateway", "Edge Functions", "SSE Streaming"],
      },
    },
  ];

  return (
    <div className="min-h-screen parchment-texture relative overflow-hidden">
      <Sparkles />

      {/* Social Links - Top Left */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <a
          href="https://github.com/jjyaz/Dehtyar-framework-insights"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 bg-background/90 border-2 border-primary/50 rounded hover:border-primary hover:text-primary transition-colors"
        >
          <Github className="w-5 h-5" />
        </a>
        <a
          href="https://x.com/DehtyarAGI"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 bg-background/90 border-2 border-primary/50 rounded hover:border-primary hover:text-primary transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      </div>

      {/* CA Dropdown - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <div className="relative">
          <button
            onClick={() => setCaDropdownOpen(!caDropdownOpen)}
            className="flex items-center gap-1 px-3 py-2 bg-background/90 border-2 border-primary/50 rounded font-pixel text-xs text-foreground hover:border-primary transition-colors"
          >
            CA
            <ChevronDown className={`w-3 h-3 transition-transform ${caDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {caDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 bg-background border-2 border-primary/50 rounded shadow-lg p-3 min-w-[320px]">
              <p className="font-pixel text-[8px] text-foreground break-all">
                XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-16 md:pt-24 relative">
        {/* Scroll edges decoration */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-parchment-dark to-transparent" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-parchment-dark to-transparent" />

        <div className="max-w-4xl mx-auto text-center">
          {/* Title */}
          <h1 className="font-pixel text-2xl md:text-4xl text-ink mb-4 animate-fade-up">
            DEHTYAR
          </h1>
          <p className="font-pixel text-[10px] md:text-xs text-primary mb-8 animate-fade-up text-glow-pink"
             style={{ animationDelay: "0.1s" }}>
            AUTONOMOUS AI AGENT FRAMEWORK
          </p>

          {/* Character */}
          <div className="flex justify-center mb-8 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <DehtyarCharacter />
          </div>

          {/* Tagline */}
          <p
            className="font-medieval text-2xl md:text-3xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-up"
            style={{ animationDelay: "0.3s" }}
          >
            Your autonomous digital companion.
            <br />
            <span className="text-foreground">Serious about tasks. Aloof about drama.</span>
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-up"
            style={{ animationDelay: "0.4s" }}
          >
            <PixelButton variant="primary" onClick={openDehtyarChat}>Meet Dehtyar</PixelButton>
            <PixelButton variant="secondary" onClick={scrollToFeatures}>Explore Features</PixelButton>
            <PixelButton variant="ghost" onClick={openAgentSelector}>Deploy Agent</PixelButton>
          </div>

          {/* Scroll Indicator */}
          <div className="animate-fade-up" style={{ animationDelay: "0.5s" }}>
            <ScrollIndicator />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="flex justify-center py-8">
        <div className="flex items-center gap-4">
          <div className="h-px w-24 bg-border" />
          <span className="text-primary text-2xl">◆</span>
          <div className="h-px w-24 bg-border" />
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-pixel text-lg md:text-xl text-center text-ink mb-4">
            THE FRAMEWORK
          </h2>
          <p className="font-medieval text-xl md:text-2xl text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
            Capabilities forged from the finest autonomous agent architectures.
            Each feature, a tool for conquest.
          </p>

          <div className="space-y-24">
            {features.map((feature, index) => (
              <div
                key={index}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <FeatureStation {...feature} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="flex justify-center py-8">
        <div className="flex items-center gap-4">
          <div className="h-px w-24 bg-border" />
          <span className="text-primary text-2xl">◆</span>
          <div className="h-px w-24 bg-border" />
        </div>
      </div>

      {/* Call to Action */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-pixel text-lg md:text-xl text-ink mb-4">
            BEGIN YOUR JOURNEY
          </h2>
          <p className="font-medieval text-xl md:text-2xl text-muted-foreground mb-8">
            The framework awaits. Deploy your first autonomous agent
            and let Dehtyar guide you through the realm of AI.
          </p>
          <PixelButton variant="primary" className="text-sm md:text-base px-8 py-4" onClick={openDehtyarChat}>
            Summon Dehtyar
          </PixelButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-pixel text-[8px] text-muted-foreground">
            DEHTYAR FRAMEWORK © 2025
          </p>
          <div className="flex gap-6">
            <button onClick={() => setShowDocs(true)} className="font-medieval text-lg text-muted-foreground hover:text-primary transition-colors">
              Documentation
            </button>
            <a href="https://github.com/jjyaz/Dehtyar-framework-insights" target="_blank" rel="noopener noreferrer" className="font-medieval text-lg text-muted-foreground hover:text-primary transition-colors">
              GitHub
            </a>
            <a href="#" className="font-medieval text-lg text-muted-foreground hover:text-primary transition-colors">
              Community
            </a>
          </div>
        </div>
      </footer>

      {/* Agent Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl animate-fade-up">
            {selectedAgent ? (
              <div className="h-[600px]">
                <AgentChat 
                  selectedAgent={selectedAgent}
                  className="h-full" 
                  onClose={() => {
                    setShowChat(false);
                    setSelectedAgent(null);
                  }}
                  onBack={() => setSelectedAgent(null)}
                />
              </div>
            ) : (
              <AgentSelector 
                onSelect={(agent) => setSelectedAgent(agent)}
                onClose={() => setShowChat(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* Documentation Modal */}
      {showDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="animate-fade-up">
            <DocumentationScroll onClose={() => setShowDocs(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;

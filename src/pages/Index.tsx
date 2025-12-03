import { useState } from "react";
import { DehtyarCharacter } from "@/components/DehtyarCharacter";
import { FeatureStation } from "@/components/FeatureStation";
import { ScrollIndicator } from "@/components/ScrollIndicator";
import { Sparkles } from "@/components/Sparkles";
import { PixelButton } from "@/components/PixelButton";
import { AgentChat } from "@/components/AgentChat";
import { DocumentationScroll } from "@/components/DocumentationScroll";
import { Brain, Users, MessageSquare, ScrollText, Wrench, Eye } from "lucide-react";

const Index = () => {
  const [showChat, setShowChat] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

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
    },
  ];

  return (
    <div className="min-h-screen parchment-texture relative overflow-hidden">
      <Sparkles />

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 relative">
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
            <PixelButton variant="primary" onClick={() => setShowChat(true)}>Meet Dehtyar</PixelButton>
            <PixelButton variant="secondary">Explore Features</PixelButton>
            <PixelButton variant="ghost" onClick={() => setShowChat(true)}>Deploy Agent</PixelButton>
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
      <section className="py-16 px-6">
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
          <PixelButton variant="primary" className="text-sm md:text-base px-8 py-4" onClick={() => setShowChat(true)}>
            Summon Dehtyar
          </PixelButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-pixel text-[8px] text-muted-foreground">
            DEHTYAR FRAMEWORK © 2024
          </p>
          <div className="flex gap-6">
            <button onClick={() => setShowDocs(true)} className="font-medieval text-lg text-muted-foreground hover:text-primary transition-colors">
              Documentation
            </button>
            <a href="https://github.com/jjyaz/Dehtyar-framework-insights" target="_blank" rel="noopener noreferrer" className="font-medieval text-lg text-muted-foreground hover:text-primary transition-colors">
              GitHub
            </a>
            <a href="#" className="font-medieval text-lg text-muted-foreground hover:text-primary transition-colors">
              Discord
            </a>
          </div>
        </div>
      </footer>

      {/* Agent Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl h-[600px] animate-fade-up">
            <AgentChat className="h-full" onClose={() => setShowChat(false)} />
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

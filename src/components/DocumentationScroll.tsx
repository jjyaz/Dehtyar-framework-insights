import { X, ExternalLink } from "lucide-react";
import { PixelButton } from "./PixelButton";

interface DocumentationScrollProps {
  onClose: () => void;
}

const repositories = [
  {
    url: "https://github.com/Significant-Gravitas/AutoGPT",
    name: "AutoGPT",
    description: "Experimental open-source attempt to make GPT-4 fully autonomous; like BabyAGI's task loop but with broader web/tool integration and sub-goal generation. More production-oriented but shares self-executing agent core.",
  },
  {
    url: "https://github.com/reworkd/AgentGPT",
    name: "AgentGPT",
    description: "Browser-based platform for deploying autonomous agents; mirrors BabyAGI's goal decomposition but adds a no-code UI for quick setup and multi-agent swarms. Lighter on self-building, heavier on accessibility.",
  },
  {
    url: "https://github.com/TransformerOptimus/SuperAGI",
    name: "SuperAGI",
    description: "Framework for managing autonomous AI agents with toolkits; extends BabyAGI's function packs with a GUI console, vector DB support, and performance tracking. More scalable for multi-agent setups.",
  },
  {
    url: "https://github.com/crewAIInc/crewAI",
    name: "CrewAI",
    description: "Framework for orchestrating role-based autonomous agents; like BabyAGI's task prioritization but for collaborative \"crews\" (multi-agent teams). Faster and leaner, no LangChain dependency.",
  },
  {
    url: "https://github.com/microsoft/autogen",
    name: "AutoGen",
    description: "Multi-agent conversation framework for LLM apps; builds on BabyAGI's single-agent loop with chat-based collaboration and code execution. More research-focused, less experimental UI.",
  },
  {
    url: "https://github.com/superagent-ai/superagent",
    name: "Superagent",
    description: "JS/TS library for building LLM agents; akin to BabyAGI's functions for tool management but with a focus on production deployment and chaining. Simpler for web devs.",
  },
];

export const DocumentationScroll = ({ onClose }: DocumentationScrollProps) => {
  return (
    <div className="bg-parchment border-4 border-parchment-dark rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b-2 border-parchment-dark/30">
        <h2 className="font-pixel text-sm md:text-base text-ink">
          DEHTYAR'S FRAMEWORK REPOSITORIES
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-parchment-dark/20 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-ink" />
        </button>
      </div>

      {/* Scroll decoration */}
      <div className="h-2 bg-gradient-to-b from-parchment-dark/20 to-transparent" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <p className="font-medieval text-lg text-muted-foreground text-center mb-8">
          The sacred texts from which Dehtyar draws wisdom.
        </p>

        {repositories.map((repo, index) => (
          <a
            key={index}
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-parchment-dark/10 rounded-lg border-2 border-transparent hover:border-primary/50 transition-all group"
          >
            <div className="flex items-start gap-3">
              <ExternalLink className="w-5 h-5 text-primary mt-1 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="flex-1 min-w-0">
                <h3 className="font-pixel text-xs text-ink mb-2 group-hover:text-primary transition-colors">
                  {repo.name}
                </h3>
                <p className="font-medieval text-base text-muted-foreground leading-relaxed">
                  {repo.description}
                </p>
                <p className="font-mono text-xs text-primary/70 mt-2 truncate">
                  {repo.url}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Footer decoration */}
      <div className="h-2 bg-gradient-to-t from-parchment-dark/20 to-transparent" />
      
      {/* Footer */}
      <div className="p-4 border-t-2 border-parchment-dark/30 flex justify-center">
        <PixelButton variant="secondary" onClick={onClose}>
          Close Scroll
        </PixelButton>
      </div>
    </div>
  );
};

import { ReactNode } from "react";
import { Github, CheckCircle, Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SourceRepo {
  name: string;
  url: string;
}

interface Implementation {
  status: "complete" | "partial" | "planned";
  details: string;
  techStack: string[];
}

interface FeatureStationProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  side: "left" | "right";
  sourceRepos?: SourceRepo[];
  implementation?: Implementation;
}

const StatusBadge = ({ status }: { status: Implementation["status"] }) => {
  const config = {
    complete: { icon: CheckCircle, label: "Complete", className: "bg-green-900/50 text-green-400 border-green-700" },
    partial: { icon: Clock, label: "Partial", className: "bg-amber-900/50 text-amber-400 border-amber-700" },
    planned: { icon: Calendar, label: "Planned", className: "bg-muted text-muted-foreground border-border" },
  };
  const { icon: Icon, label, className } = config[status];
  
  return (
    <Badge variant="outline" className={`${className} font-pixel text-[8px] gap-1`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

const SourceBadge = ({ repo }: { repo: SourceRepo }) => (
  <a
    href={repo.url}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 px-2 py-1 bg-card/50 border border-border rounded text-[10px] font-pixel text-muted-foreground hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-colors"
  >
    <Github className="w-3 h-3" />
    {repo.name}
  </a>
);

const TechPill = ({ tech }: { tech: string }) => (
  <span className="px-2 py-0.5 bg-primary/10 border border-primary/30 rounded text-[9px] font-pixel text-primary">
    {tech}
  </span>
);

export const FeatureStation = ({
  icon,
  title,
  subtitle,
  description,
  features,
  side,
  sourceRepos,
  implementation,
}: FeatureStationProps) => {
  return (
    <div
      className={`flex flex-col md:flex-row items-start gap-8 ${
        side === "right" ? "md:flex-row-reverse" : ""
      }`}
    >
      {/* Icon Section */}
      <div className="flex-shrink-0">
        <div className="w-24 h-24 md:w-32 md:h-32 bg-card pixel-border flex items-center justify-center">
          <div className="text-primary text-4xl md:text-5xl">{icon}</div>
        </div>
      </div>

      {/* Content Section */}
      <div className={`flex-1 ${side === "right" ? "text-right" : "text-left"}`}>
        <p className="font-pixel text-[10px] text-primary mb-1">{subtitle}</p>
        <h3 className="font-pixel text-lg md:text-xl text-ink mb-3">{title}</h3>
        <p className="font-medieval text-xl md:text-2xl text-muted-foreground mb-4 leading-relaxed">
          {description}
        </p>
        
        <ul className={`space-y-2 mb-6 ${side === "right" ? "ml-auto" : ""}`}>
          {features.map((feature, index) => (
            <li
              key={index}
              className={`flex items-center gap-2 font-medieval text-lg text-foreground ${
                side === "right" ? "flex-row-reverse" : ""
              }`}
            >
              <span className="text-primary">◆</span>
              {feature}
            </li>
          ))}
        </ul>

        {/* Source Attribution */}
        {sourceRepos && sourceRepos.length > 0 && (
          <div className={`mb-4 ${side === "right" ? "flex flex-col items-end" : ""}`}>
            <p className="font-pixel text-[9px] text-muted-foreground mb-2">INSPIRED BY</p>
            <div className={`flex flex-wrap gap-2 ${side === "right" ? "justify-end" : ""}`}>
              {sourceRepos.map((repo, index) => (
                <SourceBadge key={index} repo={repo} />
              ))}
            </div>
          </div>
        )}

        {/* Implementation Details */}
        {implementation && (
          <div className={`p-4 bg-card/30 border border-border/50 rounded-lg ${side === "right" ? "text-right" : "text-left"}`}>
            <div className={`flex items-center gap-2 mb-2 ${side === "right" ? "flex-row-reverse" : ""}`}>
              <StatusBadge status={implementation.status} />
              <span className="font-pixel text-[9px] text-muted-foreground">IMPLEMENTATION</span>
            </div>
            <p className="font-medieval text-sm text-muted-foreground mb-3 leading-relaxed">
              {implementation.details}
            </p>
            <div className={`flex flex-wrap gap-1.5 ${side === "right" ? "justify-end" : ""}`}>
              {implementation.techStack.map((tech, index) => (
                <TechPill key={index} tech={tech} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

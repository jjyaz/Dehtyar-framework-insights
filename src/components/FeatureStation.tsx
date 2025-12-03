import { ReactNode } from "react";

interface FeatureStationProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  side: "left" | "right";
}

export const FeatureStation = ({
  icon,
  title,
  subtitle,
  description,
  features,
  side,
}: FeatureStationProps) => {
  return (
    <div
      className={`flex flex-col md:flex-row items-center gap-8 ${
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
        <ul className={`space-y-2 ${side === "right" ? "ml-auto" : ""}`}>
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
      </div>
    </div>
  );
};

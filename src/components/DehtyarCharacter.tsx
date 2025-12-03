import { useState, useEffect } from "react";
import dehtyarImage from "@/assets/dehtyar.png";

interface DehtyarCharacterProps {
  showSpeech?: boolean;
  speechText?: string;
}

export const DehtyarCharacter = ({ showSpeech = true, speechText }: DehtyarCharacterProps) => {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 4000 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  const messages = [
    "Your tasks are my concern.",
    "I shall see it done.",
    "Awaiting your command...",
    "The framework stands ready.",
  ];

  const [currentMessage, setCurrentMessage] = useState(speechText || messages[0]);

  useEffect(() => {
    if (!speechText) {
      const messageInterval = setInterval(() => {
        setCurrentMessage(messages[Math.floor(Math.random() * messages.length)]);
      }, 8000);
      return () => clearInterval(messageInterval);
    }
  }, [speechText]);

  return (
    <div className="relative">
      {/* Character */}
      <div className={`animate-float ${isBlinking ? 'opacity-90' : 'opacity-100'}`}>
        <img
          src={dehtyarImage}
          alt="Dehtyar - Your autonomous AI companion"
          className="w-48 h-48 md:w-64 md:h-64 object-contain glow-pink animate-pulse-glow image-pixelated"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Speech Bubble */}
      {showSpeech && (
        <div className="absolute -top-4 -right-8 md:-right-16 transform">
          <div className="relative bg-parchment-light pixel-border px-4 py-2 max-w-[200px]">
            <p className="font-pixel text-[8px] md:text-[10px] text-ink leading-relaxed">
              {currentMessage}
            </p>
            {/* Speech bubble tail */}
            <div 
              className="absolute -bottom-2 left-4 w-0 h-0"
              style={{
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid hsl(35 35% 92%)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const ScrollIndicator = () => {
  return (
    <div className="flex flex-col items-center gap-2 animate-scroll-hint">
      <p className="font-pixel text-[8px] text-muted-foreground">Scroll to explore</p>
      <div className="w-6 h-10 border-2 border-muted-foreground rounded-full flex justify-center">
        <div className="w-1.5 h-3 bg-primary rounded-full mt-2 animate-bounce" />
      </div>
    </div>
  );
};

"use client";

import { clsx } from "clsx";

interface ToggleSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  labelLeft: string;
  labelRight: string;
  className?: string;
}

export default function ToggleSwitch({
  value,
  onChange,
  labelLeft,
  labelRight,
  className,
}: ToggleSwitchProps) {
  return (
    <div className={clsx("flex items-center gap-3", className)}>
      <span className={clsx("text-sm font-medium transition-colors", value ? "text-muted-foreground" : "text-white")}>
        {labelLeft}
      </span>
      <button
        onClick={() => onChange(!value)}
        className={clsx(
          "relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none",
          value ? "bg-primary" : "bg-white/20"
        )}
      >
        <div
          className={clsx(
            "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200",
            value ? "translate-x-6" : "translate-x-0"
          )}
        />
      </button>
      <span className={clsx("text-sm font-medium transition-colors", value ? "text-white" : "text-muted-foreground")}>
        {labelRight}
      </span>
    </div>
  );
}

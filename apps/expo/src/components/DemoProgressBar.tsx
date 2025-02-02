import React from "react";

import { ProgressBar } from "./ProgressBar";

interface DemoProgressBarProps {
  currentStep: number;
  totalSteps: number;
  variant?: "light" | "dark";
}

export function DemoProgressBar({
  currentStep,
  totalSteps,
  variant = "light",
}: DemoProgressBarProps) {
  const backgroundColor =
    variant === "light" ? "bg-white/20" : "bg-interactive-1/20";
  const foregroundColor = variant === "light" ? "bg-white" : "bg-interactive-1";

  return (
    <ProgressBar
      currentStep={currentStep}
      totalSteps={totalSteps}
      backgroundColor={backgroundColor}
      foregroundColor={foregroundColor}
    />
  );
}

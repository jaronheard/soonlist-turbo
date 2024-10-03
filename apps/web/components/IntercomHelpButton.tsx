"use client";

import React from "react";
import { HelpCircle } from "lucide-react";

import { Button } from "@soonlist/ui/button";

// Extend the Window interface to include Intercom
declare global {
  interface Window {
    Intercom: (command: string, ...args: unknown[]) => void;
  }
}

export function IntercomHelpButton() {
  const handleClick = () => {
    if (typeof window !== "undefined" && window.Intercom) {
      // Open the new message screen
      window.Intercom("showNewMessage");
    }
  };

  return (
    <Button
      variant="outline"
      className="flex items-center gap-2"
      onClick={handleClick}
    >
      <HelpCircle className="h-4 w-4" />
      Get Help
    </Button>
  );
}

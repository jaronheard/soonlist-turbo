"use client";

import React from "react";
import { useUser } from "@clerk/nextjs";
import { HelpCircle } from "lucide-react";

import { Button } from "@soonlist/ui/button";

import { newMessage } from "~/lib/intercom/intercom";

interface IntercomHelpButtonProps {
  message?: string;
}

export function IntercomHelpButton({ message }: IntercomHelpButtonProps) {
  const { isSignedIn } = useUser();

  const handleClick = () => {
    if (isSignedIn) {
      newMessage(message || "I need some help with Soonlist...");
    } else {
      const subject = encodeURIComponent(
        message || "I need some help with Soonlist...",
      );
      window.location.href = `mailto:support@soonlist.com?subject=${subject}`;
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

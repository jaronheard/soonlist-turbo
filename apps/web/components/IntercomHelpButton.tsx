"use client";

import React from "react";
import { HelpCircle } from "lucide-react";

import { Button } from "@soonlist/ui/button";

import { newMessage } from "~/lib/intercom/intercom";

export function IntercomHelpButton() {
  const handleClick = () => newMessage("I need some help with Soonlist...");

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

"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@soonlist/ui/button";
import { Label } from "@soonlist/ui/label";
import { Textarea } from "@soonlist/ui/textarea";

export function TextEventForm({
  handleInputChange,
  input,
  onSubmit,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleInputChange: (e: any) => void;
  input: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (e: any) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleKeyDown = (event: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      onSubmit(event);
    }
  };

  return (
    <form className="grid w-full max-w-xl gap-1.5" onSubmit={onSubmit}>
      <Label className="hidden" htmlFor="input">
        Enter text with event info
      </Label>
      <Textarea
        id="input"
        onKeyDown={handleKeyDown}
        value={input}
        onChange={handleInputChange}
        rows={6}
        placeholder={
          "Or use text (e.g. a description from a website, a text message, your words...)"
        }
      />
      <div className="p-2"></div>
      <Button type="submit" disabled={!input}>
        <Sparkles className="mr-2 size-4" />
        Generate from text
      </Button>
    </form>
  );
}

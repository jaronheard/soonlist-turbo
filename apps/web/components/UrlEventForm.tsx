"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@soonlist/ui/button";
import { Input } from "@soonlist/ui/input";
import { Label } from "@soonlist/ui/label";

export function UrlEventForm({
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
        Enter url with event info
      </Label>
      <Input
        type="url"
        id="input"
        onKeyDown={handleKeyDown}
        value={input}
        onChange={handleInputChange}
        placeholder={
          "e.g. https://www.eventbrite.com/e/art-openings-in-portland-oregon-tickets-15782812128"
        }
      />
      <div className="p-2"></div>
      <Button type="submit" disabled={!input}>
        <Sparkles className="mr-2 size-4" />
        Generate from link
      </Button>
    </form>
  );
}

"use client";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Button } from "./ui/button";

export function Form({
  handleInputChange,
  input,
  isLoading,
  onSubmit,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleInputChange: (e: any) => void;
  input: string;
  isLoading: boolean;
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
      {!isLoading && (
        <>
          <div className="p-2"></div>
          <Button type="submit" disabled={!input}>
            <Sparkles className="mr-2 size-4" />
            Generate from text
          </Button>
          <p className="mt-4 text-center">
            <span className="text-slate-500">
              Or look at a sample{" "}
              <a
                href="/event/cloqaw5z80001l8086s39cxk3"
                className="font-bold text-slate-900"
              >
                event
              </a>{" "}
              or{" "}
              <Link
                href="/jaronheard/events"
                className="font-bold text-slate-900"
              >
                list
              </Link>{" "}
              or{" "}
              <Link href="/onboarding" className="font-bold text-slate-900">
                learn more
              </Link>
              .
            </span>
          </p>
        </>
      )}
      {isLoading && (
        <>
          <Button disabled>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Please wait
          </Button>
          <div className="p-1"></div>
          <p className="text-center">
            <span className="text-slate-500">
              You can add other details while event details are being generated.
            </span>
          </p>
        </>
      )}
    </form>
  );
}

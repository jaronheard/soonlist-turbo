import React from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@soonlist/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@soonlist/ui/card";

import { HelpButton } from "~/components/HelpButton";

export const metadata = {
  title: "Try Soonlist iOS App | TestFlight",
  openGraph: {
    title: "Try Soonlist iOS App | TestFlight",
  },
};

export default function TestFlightPage() {
  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center font-heading text-4xl font-bold text-neutral-1">
            Get the app!
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-8">
          <p className="text-center text-lg">
            The best way to use Soonlist is using the iOS app.
          </p>
          <Button asChild className="h-16 w-full max-w-xs text-xl">
            <a
              href="https://testflight.apple.com/join/AjmerTKm"
              target="_blank"
              rel="noopener noreferrer"
            >
              Install iOS App
            </a>
          </Button>
          <p className="text-center text-lg">
            You'll install it through TestFlight, which is free and easy.
          </p>
          <HelpButton />
          <a
            href="/account/emoji-picker"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

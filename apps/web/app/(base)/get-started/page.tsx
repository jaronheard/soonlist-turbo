"use client";

import { useAuth, useUser } from "@clerk/nextjs";

import { Button } from "@soonlist/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@soonlist/ui/card";

import { FullPageLoadingSpinner } from "~/components/FullPageLoadingSpinner";
import { HelpButton } from "~/components/HelpButton";
import { api } from "~/trpc/react";
import { EmojiPicker } from "./EmojiPicker";
import { OnboardingTabs } from "./OnboardingTabs";

export default function Page() {
  const { isLoaded } = useAuth();
  const { user: activeUser } = useUser();

  const { data: user, isLoading } = api.user.getByUsername.useQuery(
    { userName: activeUser?.username || "" },
    { enabled: !!activeUser?.username },
  );

  if (!isLoaded || isLoading) {
    return <FullPageLoadingSpinner />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="prose">
        <h1 className="font-heading text-4xl font-bold leading-[1.08333] tracking-tight text-gray-800 md:text-5xl">
          <span className="relative inline-block text-interactive-1">
            <svg
              width="492"
              height="96"
              viewBox="0 0 492 96"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute inset-0 z-[-1] h-full w-full scale-110 opacity-100"
            >
              <path
                d="M0.977745 90.0631L13.3028 15.2256C13.6677 13.01 15.557 11.3673 17.8018 11.314L487.107 0.163765C490.41 0.0852941 492.749 3.36593 491.598 6.46257L474.712 51.884C474.083 53.5754 472.537 54.7535 470.739 54.9104L5.99405 95.4768C2.9558 95.742 0.482147 93.0724 0.977745 90.0631Z"
                fill="#FEEA9F"
              />
            </svg>
            Welcome to Soonlist!
          </span>
        </h1>
        <p>
          Thank you for becoming a founding member! We can't wait for you to try
          Soonlist and to make it even better with you.
        </p>
        <p className="-mt-4 ml-4">
          💖 <span className="font-medium italic">Jaron</span> & 🙏{" "}
          <span className="font-medium italic">Josh, founders of Soonlist</span>
        </p>
        <p>Let's get started!</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center font-heading text-3xl font-bold text-neutral-1">
            1. Complete Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OnboardingTabs
            additionalInfo={{
              bio: user?.bio || undefined,
              publicEmail: user?.publicEmail || undefined,
              publicPhone: user?.publicPhone || undefined,
              publicInsta: user?.publicInsta || undefined,
              publicWebsite: user?.publicWebsite || undefined,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-center font-heading text-3xl font-bold text-neutral-1">
            2. Choose Your Emoji
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-center text-lg">
            Pick your signature emoji to show off with your profile picture.
          </p>
          <EmojiPicker currentEmoji={user?.emoji || undefined} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-center font-heading text-3xl font-bold text-neutral-1">
            3. Get the Soonlist App
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-center text-lg">
            We're using Apple's TestFlight to provide access to Soonlist for
            Founding Members.
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
          <p className="text-center text-sm text-muted-foreground">
            This link will guide you through installing TestFlight, then you'll
            return to that page to install Soonlist.
          </p>
          <div className="flex justify-center">
            <HelpButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

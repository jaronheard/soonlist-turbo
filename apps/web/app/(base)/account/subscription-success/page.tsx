"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { HelpButton } from "~/components/HelpButton";
import { api } from "~/trpc/react";

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { isLoaded, isSignedIn } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const { mutate: handleSuccessfulCheckout } =
    api.stripe.handleSuccessfulCheckout.useMutation({
      onSuccess: () => {
        setIsProcessing(false);
        router.push("/account/invitation-sent");
      },
      onError: handleError,
    });

  const { mutate: handleLoggedInSuccessfulCheckout } =
    api.stripe.handleLoggedInSuccessfulCheckout.useMutation({
      onSuccess: () => {
        setIsProcessing(false);
        router.push("/get-started");
      },
      onError: handleError,
    });

  function handleError(error: unknown): void {
    console.error("Error handling successful checkout:", error);
    setIsProcessing(false);
    toast.error(
      "There was an error processing your subscription. Please try again or contact support.",
    );
  }

  useEffect(() => {
    if (!isLoaded || !sessionId || isProcessing) return;

    setIsProcessing(true);
    if (isSignedIn) {
      handleLoggedInSuccessfulCheckout({ sessionId });
    } else {
      handleSuccessfulCheckout({ sessionId });
    }
  }, [
    isLoaded,
    isSignedIn,
    sessionId,
    isProcessing,
    handleLoggedInSuccessfulCheckout,
    handleSuccessfulCheckout,
  ]);

  if (!isLoaded || !sessionId) {
    toast.error("Invalid session. Please try again or contact support.");
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-8 text-center">
      {isProcessing && (
        <>
          <Loader2 className="h-12 w-12 animate-spin" />
          <p>Processing your subscription. Please wait...</p>
        </>
      )}
      <HelpButton message="I need help with my subscription" />
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { IntercomHelpButton } from "~/components/IntercomHelpButton";
import { api } from "~/trpc/react";

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const { mutate: handleSuccessfulCheckout } =
    api.stripe.handleSuccessfulCheckout.useMutation({
      onSuccess: () => {
        router.push("/account/invitation-sent");
      },
      onError: (error) => {
        console.error("Error handling successful checkout:", error);
        toast.error(
          "There was an error processing your subscription. Please try again or contact support.",
        );
      },
    });

  useEffect(() => {
    if (sessionId) {
      handleSuccessfulCheckout({ sessionId });
    }
  }, [sessionId, handleSuccessfulCheckout]);

  return (
    <div className="flex flex-col items-center justify-center space-y-8 text-center">
      <Loader2 className="h-12 w-12 animate-spin" />
      <IntercomHelpButton message="I need help with my subscription" />
    </div>
  );
}

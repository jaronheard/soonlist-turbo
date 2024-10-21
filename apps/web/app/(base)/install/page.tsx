import { redirect } from "next/navigation";

import { Button } from "@soonlist/ui/button";

import { api } from "~/trpc/server";

export default async function InstallTestFlightPage({
  searchParams,
}: {
  searchParams: { session_id: string };
}) {
  const sessionId = searchParams.session_id;

  if (!sessionId) {
    redirect("/");
  }

  // Verify the session and get the session data
  const { success } = await api.stripe.verifyCheckoutSession({
    sessionId,
  });

  if (!success) {
    redirect("/");
  }

  // You can use the session data here if needed
  console.log("Verified session:", session);

  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <h1 className="mb-4 text-3xl font-bold">Install TestFlight</h1>
      <p className="mb-6 text-lg">
        Thank you for your purchase! To get started with Soonlist, please
        install TestFlight on your iOS device.
      </p>
      <Button asChild className="h-16 w-full max-w-xs text-xl">
        <a
          href="https://apps.apple.com/us/app/testflight/id899247664"
          target="_blank"
          rel="noopener noreferrer"
        >
          Install TestFlight
        </a>
      </Button>
      <p className="mt-4 text-sm text-gray-600">
        After installing TestFlight, you'll receive an email invitation to join
        the Soonlist beta.
      </p>
    </div>
  );
}

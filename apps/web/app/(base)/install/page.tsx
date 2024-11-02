import { redirect } from "next/navigation";

// import { api } from "~/trpc/server";
import { TestFlightInstall } from "../get-started/GetStartedClient";

export default function InstallTestFlightPage({
  searchParams,
}: {
  searchParams: { session_id: string };
}) {
  const sessionId = searchParams.session_id;

  if (!sessionId) {
    redirect("/");
  }

  // Verify the session and get the session data
  // TODO: Uncomment this once we have a way to verify the session
  // const { success } = await api.stripe.verifyCheckoutSession({
  //   sessionId,
  // });

  // if (!success) {
  //   redirect("/");
  // }

  return <TestFlightInstall title="Get started with the app (iOS)" />;
}

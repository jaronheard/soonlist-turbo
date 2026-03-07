import { redirect } from "next/navigation";

import { TestFlightInstall } from "../get-started/GetStartedClient";

export default async function InstallTestFlightPage(props: {
  searchParams: Promise<{ session_id: string }>;
}) {
  const searchParams = await props.searchParams;
  const sessionId = searchParams.session_id;

  if (!sessionId) {
    redirect("/");
  }

  return <TestFlightInstall title="Get started with the app (iOS)" />;
}

import { auth } from "@clerk/nextjs/server";

import { GetStartedClient } from "./GetStartedClient";

export default async function Page() {
  // Protect the page server-side
  await auth.protect();

  return <GetStartedClient />;
}

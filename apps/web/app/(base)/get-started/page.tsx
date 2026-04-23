import { auth } from "@clerk/nextjs/server";

import { GetStartedClient } from "./GetStartedClient";

export default async function Page() {
  await auth.protect();

  return <GetStartedClient />;
}

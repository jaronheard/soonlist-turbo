import { auth } from "@clerk/nextjs/server";

import { GetStartedClient } from "./GetStartedClient";

export default function Page() {
  // Protect the page server-side
  auth().protect();

  return <GetStartedClient />;
}

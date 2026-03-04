import { auth } from "@clerk/nextjs/server";

import InstagramClient from "./InstagramClient";

export default async function Page() {
  // Protect the page server-side — redirects unauthenticated users to sign-in
  await auth.protect();

  return <InstagramClient />;
}

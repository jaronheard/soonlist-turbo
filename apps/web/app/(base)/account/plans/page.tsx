import React from "react";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

import { AppStoreDownload } from "~/components/AppStoreDownload";

export const metadata = {
  title: "Plans | Soonlist",
  openGraph: {
    title: "Plans | Soonlist",
  },
};

export default async function Page() {
  const { userId } = await auth();
  
  if (!userId) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-8 px-4 text-center">
        <div>
          <h1 className="mb-4 text-3xl font-bold">Soonlist Premium</h1>
          <p className="mb-8 text-lg text-gray-600">
            Please sign in to manage your plan
          </p>
          <Link
            href="/sign-in"
            className="text-blue-600 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-8 px-4 text-center">
      <div>
        <h1 className="mb-4 text-3xl font-bold">Soonlist Premium</h1>
        <p className="mb-2 text-lg text-gray-600">
          Upgrade to Founding Member status in our mobile app
        </p>
        <p className="mb-8 text-gray-600">
          Get unlimited events, premium features, and support development
        </p>
        <AppStoreDownload className="mx-auto text-lg px-8 py-3" />
        <p className="mt-6 text-sm text-gray-500">
          Manage your existing subscription in the app
        </p>
      </div>
    </div>
  );
}
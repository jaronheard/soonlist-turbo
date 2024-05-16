"use client";

import { api } from "~/trpc/react";

export default function Page() {
  const error = api.ai.testError.useQuery();

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Error</h1>
        <p className="text-lg text-gray-600">This is an error page</p>
        <p className="text-lg text-gray-600">{error.error?.message}</p>
      </div>
    </div>
  );
}

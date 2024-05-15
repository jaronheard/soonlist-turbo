import { api } from "~/trpc/server";

export default async function Page() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const error = await api.ai.testError();

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Error</h1>
        <p className="text-lg text-gray-600">This is an error page</p>
        <p className="text-lg text-gray-600">Check your server logs</p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { api } from "~/trpc/react";

export default function HandleCheckout() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const handleCheckoutAndInvite =
    api.stripe.handleCheckoutAndInvite.useMutation({
      onSuccess: () => {
        router.push("/account/invitation-sent");
      },
      onError: (error) => {
        setError(error.message);
        setIsLoading(false);
      },
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!sessionId) {
      setError("Invalid session ID");
      setIsLoading(false);
      return;
    }

    handleCheckoutAndInvite.mutate({ sessionId, email });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Complete Your Registration</h1>
      <form onSubmit={handleSubmit} className="max-w-md">
        <div className="mb-4">
          <label htmlFor="email" className="mb-2 block">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border px-3 py-2"
          />
        </div>
        {error && <p className="mb-4 text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? "Processing..." : "Complete Registration"}
        </button>
      </form>
    </div>
  );
}

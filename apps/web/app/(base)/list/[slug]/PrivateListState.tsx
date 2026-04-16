import Link from "next/link";
import { Lock } from "lucide-react";

interface PrivateListOwner {
  username: string;
  displayName: string;
  userImage: string;
}

export function PrivateListState({
  owner,
}: {
  owner: PrivateListOwner | null;
}) {
  const displayHandle = owner?.username ?? null;
  const ownerLabel = owner?.displayName ?? owner?.username ?? "the owner";

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-xl border bg-white p-6 text-center">
        <Lock className="mx-auto mb-4 size-12 text-neutral-3" />
        <h1 className="mb-2 font-heading text-xl font-bold text-neutral-1">
          This list is private
        </h1>
        <p className="text-neutral-2">
          {displayHandle ? (
            <>
              Ask{" "}
              <Link
                href={`/${displayHandle}`}
                className="font-semibold text-interactive-1 hover:underline"
              >
                @{displayHandle}
              </Link>{" "}
              for access.
            </>
          ) : (
            <>Ask {ownerLabel} for access.</>
          )}
        </p>
      </div>
    </div>
  );
}

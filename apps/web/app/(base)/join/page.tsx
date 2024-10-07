import { SignedOut } from "@clerk/nextjs";

import { cn } from "@soonlist/ui";
import { Badge } from "@soonlist/ui/badge";

import { WaitlistSignup } from "~/components/WaitlistSignup";
import PlansPage from "../account/plans/page";

export const metadata = {
  title: "Become A Founding Member | Soonlist",
  openGraph: {
    title: "Become A Founding Member | Soonlist",
  },
};

export default function Page() {
  return (
    <>
      <PlansPage />
      <SignedOut>
        <div className="isolate mx-auto mt-6 grid max-w-md grid-cols-1 gap-y-8 sm:mt-8 lg:mx-0 lg:max-w-none lg:grid-cols-1">
          <div className="flex flex-col justify-between rounded-xl border border-neutral-3 bg-white p-8 shadow-sm xl:p-10">
            <div>
              <div className="flex items-center justify-between gap-x-4">
                <h3
                  className={cn(
                    "text-gray-900",
                    "font-heading text-2xl font-semibold leading-8",
                  )}
                >
                  Join the Waitlist
                </h3>
              </div>
              <p className="mt-4 text-lg leading-6 text-neutral-2">
                Not in the Portland Metro Region? Be the first to know when
                Soonlist is in your area.
              </p>
            </div>
            <div className="mt-8">
              <WaitlistSignup />
            </div>
          </div>
        </div>
      </SignedOut>
    </>
  );
}

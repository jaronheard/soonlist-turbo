import Image from "next/image";

import { ScrollToTop } from "~/components/ScrollToTop";

export default function Page() {
  return (
    <>
      <ScrollToTop />
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-8 bg-white px-4">
        <div className="text-center">
          <h1 className="mb-4 text-3xl font-bold">Get Soonlist</h1>
          <p className="mb-8 text-lg text-gray-600">
            Sign up is available on our mobile app
          </p>
          <a
            href="https://apps.apple.com/us/app/soonlist-save-events-instantly/id6670222216?itscg=30200&itsct=apps_box_badge&mttnsubad=6670222216"
            className="inline-block"
          >
            <Image
              src="https://toolbox.marketingtools.apple.com/api/v2/badges/download-on-the-app-store/black/en-us?releaseDate=1739059200"
              alt="Download on the App Store"
              width={246}
              height={82}
              className="h-[82px] w-[246px] object-contain align-middle"
            />
          </a>
          <p className="mt-6 text-sm text-gray-500">
            Already have an account?{" "}
            <a href="/sign-in" className="text-blue-600 hover:underline">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </>
  );
}

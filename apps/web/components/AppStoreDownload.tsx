import Image from "next/image";

interface AppStoreDownloadProps {
  className?: string;
}

export function AppStoreDownload({ className = "" }: AppStoreDownloadProps) {
  const appStoreUrl =
    "https://apps.apple.com/us/app/soonlist-save-events-instantly/id6670222216?itscg=30200&itsct=apps_box_badge&mttnsubad=6670222216";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=${encodeURIComponent(
    appStoreUrl,
  )}`;

  return (
    <div className={`block ${className}`}>
      <div className="flex flex-col items-center justify-center gap-4">
        {/* Desktop-only QR code above badge */}
        <div className="hidden flex-col items-center justify-center md:flex">
          <div className="rounded-lg border border-neutral-3 bg-white p-3 shadow-sm">
            <Image
              src={qrCodeUrl}
              alt="Scan to download Soonlist on the App Store"
              width={240}
              height={240}
              className="h-60 w-60 object-contain"
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">Scan to download or</p>
        </div>

        {/* App Store Badge */}
        <a
          href={appStoreUrl}
          className="group block"
          aria-label="Download Soonlist on the App Store"
        >
          <div className="transition-transform duration-200 group-hover:scale-105">
            <Image
              src="https://toolbox.marketingtools.apple.com/api/v2/badges/download-on-the-app-store/black/en-us?releaseDate=1739059200"
              alt="Download on the App Store"
              width={246}
              height={82}
              className="h-[82px] w-[246px] object-contain align-middle"
            />
          </div>
        </a>

        {/* App Store Social Proof */}
        <div className="flex flex-col items-center justify-center gap-4">
          {/* Rating with improved copy and layout */}
          <div className="flex items-center gap-2 transition-opacity duration-200 group-hover:opacity-90">
            <span className="text-lg font-medium text-gray-700">
              Rated 4.9 / 5
            </span>
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  className="h-5 w-5 text-amber-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>

          {/* Free trial copy with subdued styling */}
          <p className="text-sm text-gray-500 transition-opacity duration-200 group-hover:opacity-90">
            Try for free. No one turned away for lack of funds.
          </p>
        </div>
      </div>
    </div>
  );
}

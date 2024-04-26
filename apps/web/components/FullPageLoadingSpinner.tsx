// this is the a full page loading spinner

export function FullPageLoadingSpinner() {
  return (
    <div className="fixed inset-x-0 bottom-0 top-[4.5rem] z-50 flex items-center justify-center bg-white opacity-90 sm:top-[5.75rem]">
      {/* Notice the z-index here */}
      <div className="size-6 animate-spin rounded-full border-b-2 border-gray-400"></div>
    </div>
  );
}

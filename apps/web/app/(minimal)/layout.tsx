import { Toaster } from "@soonlist/ui/sonner";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Toaster />
      <main className="flex-grow overflow-auto">
        <div className="relative mx-auto w-full max-w-7xl px-6 pb-[7rem] pt-[4.5rem]">
          {children}
        </div>
      </main>
    </div>
  );
}

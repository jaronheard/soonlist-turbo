import { Toaster } from "@soonlist/ui/sonner";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Toaster />
      <main className="flex-grow overflow-auto">
        <div className="relative mx-auto w-full max-w-7xl p-6 lg:px-8 lg:py-24">
          {children}
        </div>
      </main>
    </div>
  );
}

import { Toaster } from "@soonlist/ui/sonner";

import { Footer } from "~/components/Footer";
import { Header } from "~/components/Header";
import { WorkflowStatusContainer } from "~/components/WorkflowStatus";
import { ResetNewEventContext } from "~/context/ResetNewEventContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ResetNewEventContext />
      <Header />
      <Toaster />
      <WorkflowStatusContainer />
      <main className="mx-auto min-h-[calc(100vh-4.5rem)] w-full max-w-2xl px-6 pb-16 pt-6 sm:min-h-[calc(100vh-5.75rem)] lg:px-8 lg:py-24">
        {children}
      </main>
      <Footer />
    </>
  );
}

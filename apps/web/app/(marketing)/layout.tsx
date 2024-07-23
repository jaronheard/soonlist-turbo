"use client";

import { Toaster } from "@soonlist/ui/sonner";

import { Footer } from "~/components/Footer";
import { Header } from "~/components/Header";
import { ResetNewEventContext } from "~/context/ResetNewEventContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ResetNewEventContext />
      <Header />
      <Toaster />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </div>
  );
}

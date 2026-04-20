"use client";

import { Footer } from "~/components/Footer";
import { Header } from "~/components/Header";
import { ResetNewEventContext } from "~/context/ResetNewEventContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ResetNewEventContext />
      <Header />
      <div className="h-14" aria-hidden />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </div>
  );
}

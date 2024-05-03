"use client";

import { Toaster } from "@soonlist/ui/sonner";

import { Footer } from "~/components/Footer";
import { Header } from "~/components/Header";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Header />
      <Toaster />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </div>
  );
}

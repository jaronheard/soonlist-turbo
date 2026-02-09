import Link from "next/link";
import { Home } from "lucide-react";

import { Button } from "@soonlist/ui/button";

import { Footer } from "~/components/Footer";
import { Header } from "~/components/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <div className="h-14 sm:h-20" aria-hidden />
      <main className="mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-2xl flex-col items-center justify-center px-6 pb-16 pt-6 sm:min-h-[calc(100vh-5.75rem)] lg:px-8 lg:py-24">
        <div className="flex w-full flex-col items-center justify-center text-center">
          {/* 404 Number */}
          <div className="mb-6">
            <h1 className="font-heading text-8xl font-bold leading-none text-interactive-1 md:text-9xl">
              404
            </h1>
          </div>

          {/* Main Message */}
          <h2 className="mb-4 font-heading text-3xl font-bold leading-tight text-gray-800 md:text-4xl">
            Page not found
          </h2>
          <p className="mb-8 max-w-md text-lg leading-7 text-gray-400 md:text-xl">
            The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Action Button */}
          <Button
            asChild
            size="lg"
            className="bg-interactive-1 hover:bg-interactive-1/90"
          >
            <Link href="/">
              <Home className="mr-2 size-5" />
              Go Home
            </Link>
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}

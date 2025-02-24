"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedOut } from "@clerk/nextjs";

import { Button, buttonVariants } from "@soonlist/ui/button";

const excludedCTARoutes = [
  "/join",
  "/sign-in",
  "/sign-up",
  "/install",
  "/get-started",
];

function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`py-16 ${className}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">{children}</div>
    </section>
  );
}

function SectionTitle({
  subtitle,
  title,
  description,
}: {
  subtitle?: string;
  title: string;
  description?: string | React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {subtitle && (
        <h2 className="text-2xl font-bold text-interactive-1">{subtitle}</h2>
      )}
      <p className="mt-5 font-heading text-4xl font-bold leading-[1.08333] tracking-tight text-gray-800 md:text-5xl">
        {title}
      </p>
      {description && (
        <p className="mt-6 text-xl leading-7.5 text-gray-400 md:text-2xl md:leading-9">
          {description}
        </p>
      )}
    </div>
  );
}

export function Footer() {
  const pathname = usePathname();

  return (
    <div className="">
      <SignedOut>
        {!excludedCTARoutes.includes(pathname) && (
          <>
            <Section className="bg-interactive-3">
              <div className="text-center">
                <SectionTitle
                  title="Save events instantly"
                  subtitle="Get the app"
                  description="From screenshots to your list of possibilities."
                />
                <div className="mt-10 flex items-center justify-center gap-x-6">
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
                </div>
              </div>
            </Section>
          </>
        )}
      </SignedOut>
      <footer className="w-full bg-neutral-1 p-8 text-background sm:p-24">
        <nav className="mx-auto flex max-w-7xl flex-col justify-between gap-8 lg:flex-row">
          {/* Logo and Social Section */}
          <div className="pr-8">
            <h1 className="font-heading text-4xl font-bold">Soonlist</h1>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="sm">
                <Link href="https://apps.apple.com/us/app/soonlist-save-events-instantly/id6670222216">
                  <span className="inline">&nbsp;Get the app</span>
                </Link>
              </Button>
              {/* Social Media Links */}
              {navigation.social.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={buttonVariants({
                    size: "sm",
                    variant: "secondary",
                  })}
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="size-6" aria-hidden="true" />
                  <div className="p-1"></div>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex w-full flex-wrap justify-between gap-8">
            {/* Events Section */}
            {/* <div>
              <h2 className="text-lg font-medium opacity-[66.666%]">Events</h2>
              <ul className="text-semibold mt-2 space-y-1 text-lg">
                {navigation.events.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href}>{item.name}</Link>
                  </li>
                ))}
              </ul>
            </div> */}
            {/* Support Section */}
            <div>
              <h2 className="text-lg font-medium opacity-[66.666%]">Support</h2>
              <ul className="text-semibold mt-2 space-y-1 text-lg">
                {navigation.support.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href}>{item.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
            {/* Project Section */}
            <div>
              <h2 className="text-lg font-medium opacity-[66.666%]">Project</h2>
              <ul className="text-semibold mt-2 space-y-1 text-lg">
                {navigation.project.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href}>{item.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
            {/* Legal Section */}
            <div>
              <h2 className="text-lg font-medium opacity-[66.666%]">Legal</h2>
              <ul className="text-semibold mt-2 space-y-1 text-lg">
                {navigation.legal.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href}>{item.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
      </footer>
    </div>
  );
}

const navigation = {
  events: [
    { name: "New", href: "/new" },
    { name: "All", href: "/events" },
    { name: "Discover", href: "/explore" },
  ],
  support: [
    { name: "Contact us", href: "/contact" },
    // {
    //   name: "Changelog",
    //   href: "https://jaronheard.notion.site/Soonlist-Changelog-3f6510dac9e642429d793fae5d96af8f",
    // },
  ],
  project: [{ name: "About", href: "/about" }],
  legal: [
    { name: "Privacy", href: "/privacy" },
    { name: "Terms", href: "/terms" },
  ],
  social: [
    // {
    //   name: "Facebook",
    //   href: "#",
    //   icon: (props) => (
    //     <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    //       <path
    //         fillRule="evenodd"
    //         d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
    //         clipRule="evenodd"
    //       />
    //     </svg>
    //   ),
    // },
    {
      name: "Instagram",
      href: "https://www.instagram.com/soonlistapp",
      icon: (props: React.SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path
            fillRule="evenodd"
            d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    // {
    //   name: "X",
    //   href: "#",
    //   icon: (props) => (
    //     <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    //       <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
    //     </svg>
    //   ),
    // },
    {
      name: "GitHub",
      href: "https://github.com/jaronheard/soonlist-turbo",
      icon: (props: React.SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path
            fillRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    // {
    //   name: "YouTube",
    //   href: "#",
    //   icon: (props) => (
    //     <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    //       <path
    //         fillRule="evenodd"
    //         d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z"
    //         clipRule="evenodd"
    //       />
    //     </svg>
    //   ),
    // },
  ],
};

import React from "react";
import { CheckCircleIcon, CurrencyDollarIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { CTAButton } from "@/components/CallToActions";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/Accordian";
import { Button } from "@/components/ui/button";
import { ContactUs } from "@/components/ContactUs";

export const metadata = {
  title: "Get Started | Soonlist",
  openGraph: {
    title: "Get Started | Soonlist",
  },
};

// TODO: this page needs an overhaul. Also a lot of the content is duplicated on the about page

export default function Page() {
  return (
    <div>
      <div className="prose mx-auto sm:prose-lg lg:prose-xl xl:prose-2xl 2xl:prose-2xl">
        <h1 className="font-heading">Welcome to Soonlist</h1>
        <h2 className="font-heading">Our Vision</h2>
        <p className="">
          To allow individuals and organizations to easily curate, collect and
          share events in a way that allows for more cross-pollination,
          community, and coalition building, through a transparent,
          community-owned platform … and seamlessly integrate with our digital
          calendars.
        </p>
        <div className="">
          <h2 className="font-heading">Using Soonlist</h2>
          <p className="">
            At the core, Soonlist is a way to collect, curate and share events,
            and seamlessly add them to your calendar.
          </p>
          <h2 className="font-heading">Adding events</h2>
          <ul role="list" className="">
            <li className="">
              <div className="flex gap-x-3">
                <CheckCircleIcon
                  className="mt-1.5 size-6 flex-none text-neutral-1"
                  aria-hidden="true"
                />
                <span>
                  <strong className="">iOS/MacOS Shortcut: </strong>
                  Capture events from Instagram stories or anywhere else.{" "}
                  <a
                    href="https://www.icloud.com/shortcuts/a44e63d78fd44a08b22dcaaea2bfa7f6"
                    className="text-interactive-1 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download the shortcut here
                  </a>
                  .
                </span>
              </div>
              <Accordion type="multiple" className="-mt-6">
                <AccordionItem value="instructions" className="">
                  <AccordionTrigger>Instructions</AccordionTrigger>
                  <AccordionContent className="">
                    <ol className="">
                      <li>
                        Visit{" "}
                        <a
                          href="https://www.icloud.com/shortcuts/a44e63d78fd44a08b22dcaaea2bfa7f6"
                          className="text-interactive-1 underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          this link
                        </a>{" "}
                        and click the <code>Get Shortcut</code> button to add it
                        to your devices.
                      </li>
                      <li>
                        Share text or an image to the shortcut. Use the share
                        icon from any screenshot, image, or selected text to
                        invoke the shortcut. Choose{" "}
                        <code>New Soonlist event</code> from near the bottom of
                        the list of options.
                      </li>
                      <li>
                        The shortcut will generate a calendar event draft that
                        you can modify as needed. Once you&apos;re satisfied,
                        tap <code>Save</code> to save it to your list of events.
                      </li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </li>

            <li className="flex gap-x-3">
              <CheckCircleIcon
                className="mt-1.5 size-6 flex-none text-neutral-1"
                aria-hidden="true"
              />
              <span>
                <strong className="font-semibold text-gray-900">
                  Add event from text or image
                </strong>{" "}
                Create a new event from text or an image. Soonlist will extract
                the date, time, and location from the text or image and create a
                draft event for you to edit and save.
              </span>
            </li>
          </ul>
          <h2 className="font-heading">Customize, Calendar, and Share</h2>
          <ul role="list" className="">
            <li className="flex gap-x-3">
              <CheckCircleIcon
                className="mt-1.5 size-6 flex-none text-neutral-1"
                aria-hidden="true"
              />
              <span>
                <strong className="font-semibold text-gray-900">
                  Customize:
                </strong>{" "}
                Soonlist will take your image or text and get you 90-100% of the
                way to a shareable calendar event, but you can edit it before
                saving
              </span>
            </li>
            <li className="flex gap-x-3">
              <CheckCircleIcon
                className="mt-1.5 size-6 flex-none text-neutral-1"
                aria-hidden="true"
              />
              <span>
                <strong className="font-semibold text-gray-900">
                  Add to Calendar:
                </strong>{" "}
                Click the add to calendar button to add it to your calendar.
              </span>
            </li>
            <li className="flex gap-x-3">
              <CheckCircleIcon
                className="mt-1.5 size-6 flex-none text-neutral-1"
                aria-hidden="true"
              />
              <span>
                <strong className="font-semibold text-gray-900">
                  Share Links:
                </strong>{" "}
                From your saved event page or your events list, use the share
                icon or copy the url to share with friends.
              </span>
            </li>
          </ul>
        </div>
        <div className="">
          <div className="">
            <h2 className="font-heading">Building in Public</h2>
            <p className="">
              We believe in the power of transparency and community engagement.
              That&apos;s why we&apos;re building in public, open-source,
              towards community ownership.
            </p>
            <h3 className="font-heading">Business Model</h3>
            <p className="">
              We are exploring sources of revenue that support our goal of
              community ownership. Have an idea?{" "}
              <ContactUs>Let us know!</ContactUs> Our three best ideas:
            </p>
            <ul role="list" className="">
              <li className="flex gap-x-3">
                <CurrencyDollarIcon
                  className="mt-1.5 size-6 flex-none text-neutral-1"
                  aria-hidden="true"
                />
                <span>
                  <strong className="font-semibold text-gray-900">
                    Members Support Curators:
                  </strong>{" "}
                  Soonlist users can financially support event curators through
                  tips/subscriptions, and Soonlist takes a cut to support
                  development.
                </span>
              </li>
              <li className="flex gap-x-3">
                <CurrencyDollarIcon
                  className="mt-1.5 size-6 flex-none text-neutral-1"
                  aria-hidden="true"
                />
                <span>
                  <strong className="font-semibold text-gray-900">
                    Free/Supporter Monthly Subscriptions:
                  </strong>{" "}
                  Some features are just available to paying members. We want
                  most members to be able to use Soonlist for free, so this
                  would be more advanced features or customizations.
                </span>
              </li>
              <li className="flex gap-x-3">
                <CurrencyDollarIcon
                  className="mt-1.5 size-6 flex-none text-neutral-1"
                  aria-hidden="true"
                />
                <span>
                  <strong className="font-semibold text-gray-900">
                    Commercial Events:
                  </strong>{" "}
                  We could find ways to monetize larger, commercial events to
                  make Soonlist free for smaller or non-commercial events.
                </span>
              </li>
            </ul>
            <h3 className="font-heading">Collaborative Open Source</h3>
            <p className="">
              Soonlist is more than a platform; it&apos;s a collaborative
              endeavor. We&apos;re open-source, meaning{" "}
              <a
                href="https://github.com/jaronheard/Soonlist"
                className="text-interactive-1 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                our codebase is publicly available
              </a>{" "}
              , allowing anyone to contribute, inspect, or adapt it.
            </p>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-min gap-6">
        <CTAButton />
        <Button variant="link" asChild>
          <Link href="/explore">
            Discover <span aria-hidden="true">→</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

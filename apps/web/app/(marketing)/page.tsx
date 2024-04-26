import {
  ArrowRight,
  Calendar,
  Megaphone,
  Share,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CTAButton } from "@/components/CallToActions";
import { buttonVariants } from "@/components/ui/button";
import { SampleEvent } from "@/components/SampleEvent";
import { SampleList } from "@/components/SampleList";

const sampleEventId =
  process.env.NODE_ENV === "production"
    ? "zpryvhmtljl0"
    : "clpiq9ohe0005vt8uksvndxq3";
const sampleEventListId =
  process.env.NODE_ENV === "production"
    ? "cloetmfc60001jr0ays7hsxum"
    : "tlmtav2fb70t";

const advancedFeatures = [
  {
    name: "Community First",
    description:
      "Be part of a community where value is shared, from our business model to financially supporting curators.",
    icon: Users,
  },
  {
    name: "Curator Empowerment",
    description:
      "Elevate, recognize, and value curators with tools that amplify their contributions to communities.",
    icon: Megaphone,
  },
  {
    name: "Instant Connection",
    description:
      "Leverage AI to swiftly create and share events, and get back to getting together faster.",
    icon: Zap,
  },
];

const testimonials = [
  {
    body: "The commitment to community and collective growth is evident, and I'm here for it.",
    author: {
      name: "Jennifer Batchelor",
      handle: "jennybatch",
      imageUrl:
        "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvdXBsb2FkZWQvaW1nXzJjQUNWUDZhWVVpUUV6Q1NFaXlucHRDb2txOSJ9",
    },
  },
  {
    body: "Screenshotting a story and turning it into a calendar event in seconds feels like getting away with something!",
    author: {
      name: "Jaron Heard",
      handle: "jaronheard",
      imageUrl:
        "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvdXBsb2FkZWQvaW1nXzJaRmFCY2VkQ2RrZ1VUM3BUWFJmU2tLM3B2eCJ9",
    },
  },
  // More testimonials...
  {
    body: "As an organizer of dance parties and environmental justice activist, I've been dreaming of making event lists this easy for years!",
    author: {
      name: "Sarah Baker",
      handle: "boogiebuffet",
      imageUrl:
        "https://upcdn.io/12a1yek/raw/uploads/Soonlist/sarah_profile.webp",
    },
  },
  {
    body: "I’m stoked that Soonlist helps me discover and share music events, especially those in non-conventional venues.",
    author: {
      name: "Josh Carr",
      handle: "joshcarr",
      imageUrl:
        "https://upcdn.io/12a1yek/raw/uploads/Soonlist/josh_google_profile.webp",
    },
  },
  {
    body: "I am so appreciative of a platform that allows me to connect with others and share events that is not based in social media.",
    author: {
      name: "Gina Roberti",
      handle: "ginabobina",
      imageUrl:
        "https://upcdn.io/12a1yek/raw/uploads/Soonlist/gina_google_profile.webp",
    },
  },
  // {
  //   body: "Even in these early stages, the vision for how this can benefit communities is clear and it's exciting to be part of.",
  //   author: {
  //     name: "Sarah Ashton",
  //     handle: "sarah-a",
  //     imageUrl:
  //       "https://www.soonlist.com/_next/image?url=https%3A%2F%2Fimg.clerk.com%2FeyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18yWUpwZnIyc25rM0JBOERmbUFPNXFMWlo0MXIifQ&w=750&q=75",
  //   },
  // },
];

function EventDetails({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs text-gray-500">
        7:30PM - 11:00PM // Turn Turn Turn
      </div>
      <div className="mt-1 text-lg font-semibold">
        Dance Party: Sweat Out 2023
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Let go! The entry fee ranges from $5 to $10. Arrive by 8:15 to be
        entered into a vinyl raffle where the top prize is $88 Mississippi...
      </p>
      <div className="flex w-full justify-between text-interactive-1">
        <div className="mt-4 inline-flex items-center text-sm font-medium">
          Learn more
          <ArrowRight className="ml-1 size-4 text-interactive-2" />
        </div>
        <div className="mt-4 flex space-x-2">
          <Calendar className="size-8 rounded-full bg-interactive-3 p-1.5 text-interactive-1" />
          <Share className="size-8 rounded-full bg-interactive-3 p-1.5 text-interactive-1" />
        </div>
      </div>
    </div>
  );
}

function MakeAndShareListsOfEvents() {
  return (
    <div className="px-4 py-16 text-center md:rounded-xl md:border md:border-neutral-3 md:px-16 lg:px-24">
      <div className="mx-auto max-w-2.5xl">
        <h1 className="font-heading text-4xl font-bold leading-[1.08333] tracking-tight text-gray-800 md:text-5xl">
          Make and share lists of events
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-2xl leading-9 text-gray-400">
          Easily discover, curate, and share events that bring us together. Join
          a network of passionate curators and participants building community
          around events that matter.
        </p>
      </div>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        <div>
          <h2 className="text-2.5xl font-bold leading-9 tracking-wide">
            Discover Events
          </h2>
          <div className="py-2"></div>
          <p className="mt-2 text-lg leading-7 text-gray-500">
            Discover events from other curators or add your own in just a few
            clicks.
          </p>
          <div className="flex space-x-2 px-5 pt-14">
            <Image
              src="https://upcdn.io/12a1yek/raw/uploads/Soonlist/events-collage.png"
              height={316}
              width={285}
              alt=""
              className="size-full"
            />
          </div>
        </div>
        <div className="flex flex-col items-center">
          <h2 className="text-2.5xl font-bold leading-9 tracking-wide">
            Curate & Build
          </h2>
          <div className="py-2"></div>
          <p className="mt-2 text-lg leading-7 text-gray-500">
            Let AI do the work of uncovering dates, times, locations, and more.
          </p>
          <div className="flex space-x-2 px-5 pt-12">
            <div className="flex size-80 items-start justify-center rounded-full bg-interactive-3 text-base font-bold leading-5 text-interactive-1">
              <div className="">
                <Sparkles className="mx-auto mb-6 mt-4 size-12 rounded-full bg-interactive-2 p-1.5" />
                <div className="flex flex-col gap-2">
                  <div className="">JAN 17 WEDS</div>
                  <div className="">4:00PM - 5:00PM</div>
                  <div className="text-balance">
                    Dance Party: Sweat Out 2023 w/ PLNT DDJ
                  </div>
                  <p className="text-balance px-3.5 font-medium">
                    Let go! The entry fee ranges from $5 to $10. Arrive by 8:15
                    to be entered...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-2.5xl font-bold leading-9 tracking-wide">
            Organize & Share
          </h2>
          <div className="py-2"></div>
          <p className="mt-2 text-lg leading-7 text-gray-500">
            Organize events into useful, shareable lists. Easily share events.
          </p>
          <div className="pt-24"></div>
          <div className="relative h-64">
            <div className="absolute z-30 mr-5 rounded-lg border-[0.85px] border-neutral-3 bg-white p-4 text-left shadow-sm">
              <EventDetails />
            </div>
            <div className="absolute inset-x-2.5 top-2.5 z-20 rounded-lg border-[0.85px] border-neutral-3 bg-white p-4 text-left shadow-sm">
              <EventDetails className="opacity-0" />
            </div>
            <div className="absolute left-5 top-5 z-10 rounded-lg border-[0.85px] border-neutral-3 bg-white p-4 text-left shadow-sm">
              <EventDetails className="opacity-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="bg-white">
      <div className="relative isolate bg-interactive-3 px-6 pt-14 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-y-16 py-16 pb-48 md:grid-cols-2 md:gap-x-16 md:pt-24">
          <div className="mx-auto">
            <div className="mx-auto">
              <h1 className="font-heading text-6xl font-bold leading-[0.875] tracking-tighterish text-gray-700 md:text-8xl md:leading-[0.875]">
                Events for <span className="text-interactive-1">everybody</span>
              </h1>
              <p className="mt-6 max-w-[30rem] text-2xl leading-9 text-gray-400">
                Gather, organize, and share events that matter to you and your
                communities
              </p>
            </div>
            <div className="mt-10 flex items-center gap-x-6">
              <CTAButton />
              <Link
                href="/explore"
                className={buttonVariants({ variant: "secondary" })}
              >
                Discover Events <ArrowRight className="ml-1 size-4" />
              </Link>
            </div>
          </div>
          <div className="mx-auto">
            <SampleEvent eventId={sampleEventId} />
          </div>
        </div>
      </div>
      <div className="isolate mx-auto -mt-24 max-w-7xl bg-white md:rounded-lg">
        <MakeAndShareListsOfEvents />
      </div>
      <div className="relative isolate bg-white px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 grid-rows-1 gap-y-16 py-16 md:grid-cols-2 md:gap-x-16 md:pt-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto">
              <h1 className="font-heading text-4xl font-bold leading-[1.08333] tracking-tight text-gray-800 md:text-5xl">
                Curated event lists built by community members you know and
                trust
              </h1>
              <p className="mt-6 text-xl leading-7.5 text-gray-400 md:text-2xl md:leading-9">
                Join a network of passionate curators and participants building
                community around events that matter.
              </p>
            </div>
          </div>
          <SampleList listId={sampleEventListId} />
        </div>
      </div>
      <div className="relative isolate bg-white px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 grid-rows-1 gap-y-16 py-16 md:grid-cols-2 md:gap-x-16 md:pt-24">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-lg">
            <h1 className="font-heading text-4xl font-bold leading-[1.08333] tracking-tight text-gray-800 md:text-5xl">
              Building togetherness
            </h1>
            <p className="mt-6 text-xl leading-7.5 text-gray-400 md:text-2xl md:leading-9">
              We&apos;re building an ecosystem that simplifies discovering,
              sharing, and engaging with events. It&apos;s a space where
              everyone has the power and tools to contribute to our shared
              calendars and build community.
            </p>
            <dl className="mt-10 max-w-xl space-y-8 text-base leading-7 text-gray-600 lg:max-w-none">
              {advancedFeatures.map((feature) => (
                <div key={feature.name} className="relative flex gap-8">
                  <feature.icon
                    className="size-10 shrink-0 rounded-full bg-interactive-2 p-2 text-neutral-1
                      "
                    aria-hidden="true"
                  />
                  <div className="flex flex-col gap-2">
                    <dt className="block text-2xl font-semibold leading-normal text-gray-900">
                      {feature.name}
                    </dt>{" "}
                    <dd className="block text-lg leading-6 text-neutral-2">
                      {feature.description}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative h-full min-h-[24rem] overflow-hidden rounded-xl md:px-6 lg:px-0">
            <Image
              src="https://upcdn.io/12a1yek/raw/uploads/2024/01/17/IMG_3960.png"
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 1008px"
              className="object-cover"
            />
          </div>
        </div>
      </div>
      <div className="relative isolate bg-white pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <div className="mx-auto max-w-xl text-center">
            <p className="font-heading text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              People are already excited
            </p>
          </div>
          <div className="mx-auto mt-16 flow-root max-w-2xl md:mt-20 lg:mx-0 lg:max-w-none">
            <div className="-mt-8 md:-mx-4 md:columns-2 md:text-[0] lg:columns-3">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.author.handle}
                  className="pt-8 md:inline-block md:w-full md:px-4"
                >
                  <figure className="rounded-[10px] border-[0.85px] border-neutral-3 bg-accent-yellow p-6 shadow-sm">
                    <blockquote className="text-center font-heading text-2xl font-bold text-neutral-1">
                      <p>{`“${testimonial.body}”`}</p>
                    </blockquote>
                    <figcaption className="w-min-content mt-6 flex items-center justify-center gap-x-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="size-14 rounded-full border-[6px] border-accent-orange"
                        src={testimonial.author.imageUrl}
                        alt=""
                      />
                      <div>
                        <div className="text-lg font-semibold leading-none text-neutral-1">
                          {testimonial.author.name}
                        </div>
                        <div className="py-0.5"></div>
                        <div className="text-lg font-medium leading-none text-neutral-2">{`@${testimonial.author.handle}`}</div>
                      </div>
                    </figcaption>
                  </figure>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

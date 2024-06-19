import Image from "next/image";

import { CTAButton } from "~/components/CallToActions";
import { AutoPlayVideo } from "./components";

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
    body: "I’m stoked that Soonlist helps me save and share music events, especially those in non-conventional venues.",
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
  {
    body: "I'm a freak for my calendar, and Soonlist is the perfect way to keep it fresh and full of events that inspire me.",
    author: {
      name: "Eric Benedon",
      handle: "eggsbenedon",
      imageUrl:
        "https://upcdn.io/12a1yek/raw/uploads/Soonlist/eric_profile.webp",
    },
  },
];

function ConnectWithWhatMatters() {
  return (
    <div className="px-4 py-16 text-center md:rounded-xl md:border md:border-neutral-3 md:px-16 lg:px-24">
      <div className="mx-auto max-w-2.5xl">
        <h1 className="font-heading text-4xl font-bold leading-[1.08333] tracking-tight text-gray-800 md:text-5xl">
          Add, organize, and share events that inspire you.
        </h1>
        {/* <p className="mx-auto mt-6 max-w-3xl text-2xl leading-9 text-gray-400">
          Add, organize, and share events that inspire you.
        </p> */}
      </div>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        <div>
          <h2 className="text-2.5xl font-bold leading-9 tracking-wide">
            Add (it all)
          </h2>
          <div className="py-2"></div>
          <p className="mt-2 text-lg leading-7 text-gray-500">
            Capture events details from screenshots, websites, flyers, and
            beyond.
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
        <div>
          <h2 className="text-2.5xl font-bold leading-9 tracking-wide">
            Organize (your way)
          </h2>
          <div className="py-2"></div>
          <p className="mt-2 text-lg leading-7 text-gray-500">
            Make lists, add to your personal calendar, and stay up to date.
          </p>
          <div className="flex space-x-2 px-5 pt-14">
            <Image
              src="https://upcdn.io/12a1yek/raw/uploads/Soonlist/lists-v1.png"
              height={316}
              width={285}
              alt=""
              className="size-full"
            />
          </div>
        </div>
        <div className="flex flex-col items-center">
          <h2 className="text-2.5xl font-bold leading-9 tracking-wide">
            Share (with anyone)
          </h2>
          <div className="py-2"></div>
          <p className="mt-2 text-lg leading-7 text-gray-500">
            Send links to friends, family, or your community—no social media
            needed.
          </p>
          <div className="flex space-x-2 px-5 pt-14">
            <Image
              src="https://upcdn.io/12a1yek/raw/uploads/Soonlist/sharing-v1.png"
              height={316}
              width={285}
              alt=""
              className="size-full"
            />
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
        <Image
          src="https://upcdn.io/12a1yek/raw/uploads/Soonlist/events-collage.png"
          fill
          alt=""
          priority
          className="absolute inset-x-0 bottom-24 top-0 z-[-1] mx-auto max-w-lg object-contain object-top opacity-[0.05]"
        />
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-y-16 py-16 pb-48 md:grid-cols-1 md:gap-x-16 md:pt-24">
          <div className="mx-auto">
            <div className="mx-auto text-center">
              <h1 className="font-heading text-6xl font-bold leading-[0.875] tracking-tighterish text-gray-700 md:text-8xl md:leading-[0.875]">
                Organize{" "}
                <span className="relative inline-block text-interactive-1">
                  <svg
                    width="492"
                    height="96"
                    viewBox="0 0 492 96"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="tranform absolute inset-0 z-[-1] h-full w-full scale-110 opacity-100"
                  >
                    <path
                      d="M0.977745 90.0631L13.3028 15.2256C13.6677 13.01 15.557 11.3673 17.8018 11.314L487.107 0.163765C490.41 0.0852941 492.749 3.36593 491.598 6.46257L474.712 51.884C474.083 53.5754 472.537 54.7535 470.739 54.9104L5.99405 95.4768C2.9558 95.742 0.482147 93.0724 0.977745 90.0631Z"
                      fill="#FEEA9F"
                    />
                  </svg>
                  possibilities
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-[36rem] text-2xl leading-9 text-gray-400">
                The best way to add, organize, and share events.
              </p>
            </div>
            <div className="mt-10 flex w-full items-center justify-center gap-x-6">
              <CTAButton />
            </div>
          </div>
          <div className="">
            <p className="text-center font-heading text-2xl font-bold text-gray-700">
              See it in action 👀
            </p>
            <div className="relative mx-auto h-[32rem] w-[18rem] overflow-hidden rounded-xl shadow-lg md:px-6 lg:px-0">
              <AutoPlayVideo src="https://upcdn.io/12a1yek/raw/uploads/Soonlist/soonlist-update-cropped-update-v4.mp4" />
            </div>
          </div>
          {/* <div className="mx-auto">
            <SampleEvent eventId={sampleEventId} />
          </div> */}
        </div>
      </div>
      <div className="isolate mx-auto -mt-24 max-w-7xl bg-white md:rounded-lg">
        <ConnectWithWhatMatters />
      </div>
      {/* <div className="relative isolate bg-white px-6 py-24 sm:py-32 lg:px-8">
        <Pricing />
      </div> */}
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

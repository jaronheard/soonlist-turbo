import Image from "next/image";
import { Bell, Calendar, ChevronDownIcon, Share2, Zap } from "lucide-react";

import { CTAButtonMembership } from "~/components/CallToActions";
import { FoundingMemberPricing } from "~/components/FoundingMemberPricing";
import { api } from "~/trpc/server";
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
    <div className="m-2 px-4 py-16 text-center md:rounded-xl md:border md:border-neutral-3 md:px-16 lg:px-24">
      <div className="mx-auto max-w-2.5xl">
        <h1 className="pb-4 font-heading text-4xl font-bold leading-[1.08333] tracking-tight text-gray-800 md:text-5xl">
          How It Works
        </h1>
      </div>
      <div className="relative mx-auto h-[32rem] w-[18rem] overflow-hidden rounded-xl shadow-lg md:px-6 lg:px-0">
        <AutoPlayVideo src="https://upcdn.io/12a1yek/raw/uploads/Soonlist/soonlist-update-cropped-update-v4.mp4" />
      </div>
      <div className="mt-12 grid divide-y divide-neutral-200 md:grid-cols-3 md:divide-x md:divide-y-0">
        <div className="flex flex-col items-center px-4 py-8 md:py-0">
          <h2 className="text-2.5xl font-bold leading-9 tracking-wide">
            Capture Effortlessly
          </h2>
          <div className="py-2"></div>
          <p className="mt-2 text-lg leading-7 text-gray-500">
            See an interesting event? Save it instantly, no matter where you
            found it.
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
        <div className="flex flex-col items-center px-4 py-8 md:py-0">
          <h2 className="text-2.5xl font-bold leading-9 tracking-wide">
            Organize Automatically
          </h2>
          <div className="py-2"></div>
          <p className="mt-2 text-lg leading-7 text-gray-500">
            We sort and categorize your saved events, so you always know what's
            coming up.
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
        <div className="flex flex-col items-center px-4 py-8 md:py-0">
          <h2 className="text-2.5xl font-bold leading-9 tracking-wide">
            Show Up Confidently
          </h2>
          <div className="py-2"></div>
          <p className="mt-2 text-lg leading-7 text-gray-500">
            Get gentle reminders and easy ways to share with friends, ensuring
            you never miss out.
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

function FeaturesHighlight() {
  const features = [
    {
      title: "Smart Capture",
      description:
        "Save events from any source – screenshots, flyers, texts, and more",
      icon: Zap,
    },
    {
      title: "Auto Organize",
      description: "Your saved events, automatically organized in one place",
      icon: Calendar,
    },
    {
      title: "Easy Sharing",
      description: "Discover and share events with like-minded enthusiasts",
      icon: Share2,
    },
    {
      title: "Reminder System",
      description:
        "Gentle nudges to help you follow through on your intentions",
      icon: Bell,
    },
  ];

  return (
    <div className="m-2 px-4 py-16 text-center md:rounded-xl md:border md:border-neutral-3 md:px-16 lg:px-24">
      <div className="mx-auto max-w-2.5xl">
        <h2 className="text-2xl font-bold text-interactive-1">Features</h2>
        <p className="pb-4 pt-5 font-heading text-4xl font-bold leading-[1.08333] tracking-tight text-gray-800 md:text-5xl">
          Everything you need to organize your possibilities
        </p>
      </div>
      <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <div key={feature.title} className="flex flex-col items-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-interactive-1">
              <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold leading-9 tracking-wide text-gray-900">
              {feature.title}
            </h2>
            <div className="py-2"></div>
            <p className="mt-2 text-lg leading-7 text-gray-500">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

async function MembershipSection() {
  const publicCheckoutUrls =
    await api.stripe.getPublicSubscriptionCheckoutUrls();
  const checkoutUrls = publicCheckoutUrls.reduce(
    (acc, curr) => ({ ...acc, [curr.plan]: curr.redirectURL }),
    {},
  );

  const { takenEmojis } = await api.user.getAllTakenEmojis();

  return (
    <FoundingMemberPricing
      checkoutUrls={checkoutUrls}
      currentPlan="free"
      planActive={false}
      takenEmojis={takenEmojis}
    />
  );
}

function FAQSection() {
  const faqs = [
    {
      question: "How does Soonlist help me show up to events?",
      answer:
        "Soonlist combines smart event capture, personalized organization, and gentle reminders to ensure you not only save interesting events but actually attend them. We bridge the gap between discovery and attendance.",
    },
    {
      question: "Is Soonlist only for certain types of events?",
      answer:
        "Not at all! Soonlist is for anyone who wants to make the most of their opportunities. Whether you're into art, music, sports, professional networking, or personal growth, Soonlist helps you capture and organize all your possibilities.",
    },
    {
      question:
        "How is the Soonlist community different from social media groups?",
      answer:
        "Unlike broad social networks, the Soonlist community is united by a shared desire to turn intentions into actions. Our members are supportive, curious, and always eager to share unique event discoveries.",
    },
    {
      question: "Can I try Soonlist before committing to a year?",
      answer:
        "While we don't offer a free trial, we have a 30-day satisfaction guarantee. If you don't feel more connected to your possibilities within the first month, we'll refund your membership fee, no questions asked.",
    },
    {
      question: "Is the $29/year price guaranteed for life?",
      answer:
        "The $29/year rate is a special offer for our first 100 subscribers, a 70% discount off our regular $99/year price. As a founding member, you'll lock in this discounted rate for as long as you maintain your subscription.",
    },
    {
      question:
        "What happens if I subscribe after the first 100 spots are filled?",
      answer:
        "Our founding membership is limited to 100 spots. The benefits and perks of this may not be available to members after these spots are filled. The regular subscription price of $99/year will be available to everyone after the first 100. We encourage you to subscribe early to secure the best value and be part of our founding community.",
    },
    {
      question: "What if I can't afford the cost of subscription?",
      answer:
        "At Soonlist, we believe everyone should have the opportunity to organize their possibilities, regardless of financial circumstances. If you truly can't afford the membership fee, please email us at support@soonlist.com with the subject \"NOTAFLOF\" (No One Turned Away For Lack Of Funds). We'll work with you to ensure you can access Soonlist's features. For those who can afford it, your subscription helps support this inclusive policy. Remember, we offer a 30-day money-back guarantee, so there's no risk in joining our community and transforming your possibilities into experiences.",
    },
  ];

  return (
    <div className="bg-gradient-to-b from-white to-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-6 text-xl leading-7.5 text-gray-400 md:text-2xl md:leading-9">
            Got questions? We've got answers. Or{" "}
            <a href="mailto:support@soonlist.com" className="underline">
              email us
            </a>
            .
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl divide-y divide-gray-200">
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group py-6">
      <summary className="flex w-full cursor-pointer items-center justify-between text-left">
        <span className="text-lg font-medium text-gray-900">{question}</span>
        <ChevronDownIcon className="h-6 w-6 text-indigo-500 transition-transform duration-300 group-open:rotate-180" />
      </summary>
      <p className="mt-4 text-base text-gray-600">{answer}</p>
    </details>
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
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-y-16 py-16 pb-24 md:grid-cols-1 md:gap-x-16 md:pt-24">
          <div className="mx-auto">
            <div className="mx-auto text-center">
              <h1 className="font-heading text-6xl font-bold leading-[0.875] tracking-tighterish text-gray-700 md:text-8xl md:leading-[0.875]">
                All Your{" "}
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
                      d="M0.977745 90.0631L13.3028 15.2256C13.6677 13.01 15.557 11.3673 17.8018 11.314L487.107 0.163765C490.41 0.0852941 492.749 3.36593 491.598 6.4625792.749 3.36593 491.598 6.46257L456.629 93.9515C455.321 97.4489 450.628 97.8499 448.728 94.6723L0.977745 90.0631Z"
                      fill="#FEEA9F"
                    />
                  </svg>
                  Possibilities,
                </span>
                Organized
              </h1>
              <p className="mx-auto mt-6 max-w-[36rem] text-2xl leading-9 text-gray-400">
                See it, save it, show up... it's that easy with Soonlist
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <CTAButtonMembership>Start Showing Up</CTAButtonMembership>
              </div>
            </div>
          </div>
          <div className="mx-auto max-w-2xl">
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Are you missing out on events that matter to you?
            </p>
            <div className="mx-auto max-w-2xl">
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <div className="rotate-2 transform">
                  <div className="inline-block rounded-md bg-accent-yellow px-2 py-1 text-xs text-neutral-1 shadow-sm">
                    Warehouse dance party from Instagram Stories
                  </div>
                </div>
                <div className="-rotate-3 transform">
                  <div className="inline-block rounded-md bg-accent-orange px-2 py-1 text-xs text-neutral-1 shadow-sm">
                    Touring band flyers on the coffee shop wall
                  </div>
                </div>
                <div className="rotate-1 transform">
                  <div className="inline-block rounded-md bg-accent-green px-2 py-1 text-xs text-neutral-1 shadow-sm">
                    Ceramics workshops from your friend
                  </div>
                </div>
                <div className="-rotate-2 transform">
                  <div className="inline-block rounded-md bg-accent-blue px-2 py-1 text-xs text-neutral-1 shadow-sm">
                    A networking event from your company newsletter
                  </div>
                </div>
              </div>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Soonlist helps you <span className="font-bold">capture</span>,{" "}
                <span className="font-bold">organize</span>,{" "}
                <span className="font-bold">share</span> and{" "}
                <span className="font-bold">remember</span> possibilities. All
                you have to do is <span className="font-bold">show up</span>.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ConnectWithWhatMatters />
      <FeaturesHighlight />

      <div className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-interactive-1">
              Testimonials
            </h2>
            <p className="mt-5 font-heading text-4xl font-bold leading-[1.08333] tracking-tight text-gray-800 md:text-5xl">
              Hear from our users
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {/* {testimonials.map((testimonial) => (
                <div key={testimonial.author.name} className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    {testimonial.author.name}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">{testimonial.body}</p>
                  </dd>
                </div>
              ))} */}
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
            </dl>
          </div>
        </div>
      </div>

      <MembershipSection />
      <FAQSection />

      <div className="bg-white">
        <div className="px-6 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              All Your Possibilities, Organized
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600">
              See it, save it, show up... it's that easy with Soonlist
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <CTAButtonMembership>Become a member now!</CTAButtonMembership>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

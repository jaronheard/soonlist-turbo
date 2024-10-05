import Image from "next/image";
import { Bell, Calendar, ChevronDownIcon, Share2, Zap } from "lucide-react";

import { CTAButtonMembership } from "~/components/CallToActions";
import { FoundingMemberPricing } from "~/components/FoundingMemberPricing";
import { api } from "~/trpc/server";

// import { AutoPlayVideo } from "./components";

const testimonials = [
  {
    body: "Soonlist has brought SO much more ease into the process of organizing and prioritizing the events that are important to me!",
    author: {
      name: "Della Mueller",
      handle: "delladella",
      imageUrl:
        "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18yaEtlMGdrZVhSWm5KNEVheVBLZlpGdUxkSDIifQ",
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
    title: "Reminders",
    description: "Gentle nudges to help you follow through on your intentions",
    icon: Bell,
  },
];

const faqs = [
  {
    question: "How does Soonlist help me show up to events?",
    answer:
      "The app works in three simple steps: Capture an event from any source: social media, flyers, or text messages. Soonlist organizes these into listings automatically, creating a personalized feed of possibilities. Receive notifications on saved events and discover other people's events, so you can jump into real experiences.",
  },
  {
    question: "Is Soonlist only for certain types of events?",
    answer:
      "Right now, Soonlist works great for all kinds of one-off single events. Whatever the event topic or type, we want to help you capture and organize everything that you see. We're planning to add support fpr capture and organize recurring and multi-day, multi-event experiences soon!",
  },
  {
    question: "How is the Soonlist different from social media?",
    answer:
      "Soonlist isn't supported by advertising, it's supported by paid subscriptions. Our business model is to help you show up more to what you care about in a way that you'll pay for. The business model of social media is to capture your attention, and then monetize it through advertising. You can also use Soonlist without posting anything publicly.",
  },
  {
    question: "Can I try Soonlist before committing to a year?",
    answer:
      "While we don't offer a free trial, we have a 30-day satisfaction guarantee. If you don't feel more connected to your possibilities within the first month, we'll refund your membership fee, no questions asked.",
  },
  {
    question: "Is the $29/year Founding Member price guaranteed for life?",
    answer:
      "The $29/year rate is a special offer for our first 100 subscribers, a 70% discount off our regular $99/year price. As a founding member, you'll lock in this discounted rate for as long as you maintain your subscription.",
  },
  {
    question:
      "What happens if I subscribe after the first 100 spots are filled?",
    answer:
      "Our founding membership is limited to 100 spots. The regular subscription price of $99/year will be available to everyone after the first 100. We encourage you to subscribe early to secure the best value and be part of our founding community.",
  },
  {
    question: "What if I can't afford the cost of subscription?",
    answer:
      "At Soonlist, we believe in making our service accessible to all. If the membership fee is a barrier, email us at support@soonlist.com with the subject \"NOTAFLOF\" (No One Turned Away For Lack Of Funds). We'll work with you to ensure you can access Soonlist's features. Paid subscriptions, by community members who can afford it, help support this inclusive policy.",
  },
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

function HeroSection() {
  return (
    <Section className="pb-8 pt-16">
      <div className="relative isolate">
        <div className="absolute inset-x-0 bottom-24 top-0 z-[-1] mx-auto max-w-lg">
          <div className="relative h-full w-full">
            <Image
              src="https://upcdn.io/12a1yek/raw/uploads/Soonlist/events-collage.png"
              fill
              alt=""
              priority
              className="object-contain object-top opacity-[0.10]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-interactive-3"></div>
          </div>
        </div>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-y-8 md:grid-cols-1 md:gap-x-8">
          <div className="mx-auto text-center">
            <h1 className="font-heading text-5xl font-bold leading-tight tracking-tighterish text-gray-700 md:text-7xl md:leading-tight">
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
                    d="M0.977745 90.0631L13.3028 15.2256C13.6677 13.01 15.557 11.3673 17.8018 11.314L487.107 0.163765C490.41 0.0852941 492.749 3.36593 491.598 6.46257L474.712 51.884C474.083 53.5754 472.537 54.7535 470.739 54.9104L5.99405 95.4768C2.9558 95.742 0.482147 93.0724 0.977745 90.0631Z"
                    fill="#FEEA9F"
                  />
                </svg>
                Possibilities
              </span>
              , Organized
            </h1>
            <p className="mt-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
              See it, save it, show up. It's that easy with Soonlist.
            </p>
            <div className="mt-8 flex items-center justify-center gap-x-6">
              <CTAButtonMembership>Become A Member Now</CTAButtonMembership>
            </div>
          </div>
          <div className="mx-auto max-w-2xl">
            <p className="mt-4 text-lg leading-7 text-gray-600">
              Are you missing out on events that matter to you?
            </p>
            <div className="mx-auto mt-2 max-w-2xl">
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
              <p className="mt-6 text-lg leading-7 text-gray-600">
                Soonlist helps you <span className="font-bold">capture</span>,{" "}
                <span className="font-bold">organize</span>,{" "}
                <span className="font-bold">share</span>, and{" "}
                <span className="font-bold">remember</span> possibilities.
              </p>
              <p className="text-lg leading-7 text-gray-600">
                All you have to do is <span className="font-bold">show up</span>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function ConnectWithWhatMatters() {
  return (
    <Section>
      <div className="rounded-xl border border-neutral-3 bg-white px-4 py-16 text-center md:px-16 lg:px-24">
        <SectionTitle title="How It Works" />
        {/* <div className="relative mx-auto mt-6 h-[32rem] w-[18rem] overflow-hidden rounded-xl shadow-lg md:px-6 lg:px-0">
          <AutoPlayVideo src="https://upcdn.io/12a1yek/raw/uploads/Soonlist/soonlist-update-cropped-update-v4.mp4" />
        </div> */}
        <div className="mt-12 grid divide-y divide-neutral-200 md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="flex flex-col items-center px-4 py-8 md:py-0">
            <h2 className="text-2.5xl font-bold leading-9 tracking-wide">
              Capture Effortlessly
            </h2>
            <div className="py-2"></div>
            <p className="mt-2 text-left text-lg leading-7 text-gray-500">
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
            <p className="mt-2 text-left text-lg leading-7 text-gray-500">
              We sort and categorize your saved events, so you always know
              what's coming up.
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
            <p className="mt-2 text-left text-lg leading-7 text-gray-500">
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
    </Section>
  );
}

function FeaturesHighlight() {
  return (
    <Section>
      <SectionTitle
        subtitle="Features"
        title="Everything you need to organize your possibilities"
      />
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
    </Section>
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
    <Section>
      <FoundingMemberPricing
        checkoutUrls={checkoutUrls}
        currentPlan="free"
        planActive={false}
        takenEmojis={takenEmojis}
        hideEmojiDetails={true}
      />
    </Section>
  );
}

function TestimonialsSection() {
  return (
    <Section>
      <SectionTitle subtitle="Testimonials" title="Hear from our users" />
      <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
        <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
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
    </Section>
  );
}

function FAQSection() {
  return (
    <Section className="bg-gradient-to-b from-white to-gray-50">
      <SectionTitle
        title="Frequently Asked Questions"
        description={
          <>
            Got questions? We've got answers. Or{" "}
            <a href="mailto:support@soonlist.com" className="underline">
              email us
            </a>
            .
          </>
        }
      />
      <div className="mx-auto mt-16 max-w-2xl divide-y divide-gray-200">
        {faqs.map((faq, index) => (
          <FAQItem key={index} question={faq.question} answer={faq.answer} />
        ))}
      </div>
    </Section>
  );
}

function ClosingCTASection() {
  return (
    <Section className="bg-interactive-3">
      <div className="text-center">
        <SectionTitle
          title="All Your Possibilities, Organized"
          subtitle="Join Now"
          description="See it, save it, show up. It's that easy with Soonlist."
        />
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <CTAButtonMembership>Become A Member Now</CTAButtonMembership>
        </div>
      </div>
    </Section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group py-6">
      <summary className="flex w-full cursor-pointer items-center justify-between text-left">
        <span className="text-lg font-medium text-gray-900">{question}</span>
        <ChevronDownIcon className="h-6 w-6 text-interactive-2 transition-transform duration-300 group-open:rotate-180" />
      </summary>
      <p className="mt-4 text-base text-gray-600">{answer}</p>
    </details>
  );
}

export default function Page() {
  return (
    <div className="bg-gray-50">
      <div className="bg-interactive-3 pb-48">
        <HeroSection />
      </div>
      <div className="-mt-48">
        <ConnectWithWhatMatters />
      </div>
      <FeaturesHighlight />
      <TestimonialsSection />
      <MembershipSection />
      <FAQSection />
      <ClosingCTASection />
    </div>
  );
}

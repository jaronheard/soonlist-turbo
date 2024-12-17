import React from "react";
import Image from "next/image";
import {
  Calendar,
  Crown,
  Heart,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react";

import Section from "../_components/section";
import dataForUsersFor2024 from "./dataForUsersFor2024";

export function generateMetadata({ params }: Props) {
  return {
    title: `@${params.userName} | Captured 2024! | Soonlist`,
  };
}

const YearInReviewCard = ({
  user_id,
  username,
  total_events_captured,
  most_active_month,
  favorite_type,
  favorite_category,
  events_followed,
  user_index,
  first_event_name,
  first_event_image,
  first_event_date,
}) => {
  return (
    <div className="mx-auto max-w-2xl p-8 text-center text-gray-700">
      <Section>
        <div className="space-y-2 ">
          <p className="text-3xl font-medium">@{username}</p>
          <p className="font-medium">here is your</p>
          <h1 className="font-heading text-5xl font-bold leading-none tracking-tighterish text-gray-700 md:text-7xl md:leading-none">
            2024 <br />
            <span className="relative inline-block text-6xl text-interactive-1 md:text-8xl">
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
              captured!
            </span>
          </h1>
        </div>
      </Section>

      {user_index < 10 && (
        <Section>
          <p className="mt-6  text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            You're one of the{" "}
            <span className="mt-4 block font-heading text-6xl font-bold text-interactive-1">
              top ten
            </span>{" "}
            capturers this year!
          </p>
        </Section>
      )}

      <Section>
        <div>
          <p className="mt-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            You captured{" "}
            <span className="mt-4 block font-heading text-6xl font-bold text-interactive-1">
              {parseInt(total_events_captured).toLocaleString()}
            </span>{" "}
            total events!
          </p>
        </div>
      </Section>

      {/* if they have a favorite type and category and they are not "unknown" */}
      {favorite_type && favorite_type !== "unknown" && (
        <Section>
          <p className="m-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            Your favorite event type was:
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <div className={"-rotate-3 transform"}>
              <div className="inline-block rounded-md bg-accent-orange px-2 py-1 text-3xl text-neutral-1 shadow-sm">
                <span className="capitalize">{favorite_type}</span>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* if they have a favorite type and category and they are not "unknown" */}
      {favorite_category && favorite_category !== "unknown" && (
        <Section>
          <p className="m-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            Your favorite category was:
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <div className={"rotate-3 transform"}>
              <div className="inline-block rounded-md bg-accent-yellow px-2 py-1 text-3xl text-neutral-1 shadow-sm">
                <span className="capitalize">{favorite_category}</span>
              </div>
            </div>
          </div>
        </Section>
      )}

      <Section>
        <p className="m-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
          Your most active month on Soonlist was:
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <div className={"-rotate-1 transform"}>
            <div className="inline-block rounded-md bg-accent-green px-2 py-1 text-3xl text-neutral-1 shadow-sm">
              <span className="capitalize">{most_active_month}</span>
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <p className="m-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
          Remember this event? The first event you captured in 2024:
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <div className="">
            <p className="font-heading text-4xl font-bold capitalize text-purple-700">
              {first_event_name}
            </p>
            <p className="text-sm text-gray-500">
              {new Date(first_event_date).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="relative m-auto mt-4 h-72  w-72 flex-shrink-0 overflow-hidden rounded-md border-4 border-yellow-300">
          <Image
            src={first_event_image}
            alt={first_event_name}
            layout="fill"
            className="absolute inset-0 object-cover"
          />
        </div>
      </Section>

      <Section>
        <div className="pt-4 text-center text-sm text-gray-500">
          <p>Keep capturing amazing events!</p>
          <p className="mt-1">Generated by Soonlist</p>
        </div>
      </Section>
    </div>
  );
};

interface Props {
  params: { userName: string };
}

// Example usage:
const Page = ({ params }: Props) => {
  const userName = params.userName;

  if (!userName || !dataForUsersFor2024[userName]) {
    return <div>No data for this user</div>;
  }

  const userData = dataForUsersFor2024[userName];

  //   const userData =   {
  //   user_id: "user_2ZFNoiajf80Q4ZiTQj8hAgatRCt",
  //   username: "jaronheard",
  //   total_events_captured: "252",
  //   unique_event_types: "22",
  //   most_active_month: "June",
  //   favorite_type: "concert",
  //   favorite_category: "music",
  //   events_followed: "28",
  //   first_event_id: "clrbwg21u0001f48lm6x2zsoq",
  //   first_event_name: "Dig A Hole Zines Fundraising PARTY",
  //   first_event_image:
  //     "https://upcdn.io/12a1yek/image/uploads/2024/01/13/4ktjNP7rKz-file.jpeg?crop-x=0&crop-y=87&crop-w=1350&crop-h=1350",
  //   first_event_date: "2024-01-13 06:00:00",
  // },

  return <YearInReviewCard {...userData} />;
};

export default Page;

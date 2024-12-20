import React from "react";

import { env } from "~/env";
import UserStatsCard from "../_components/userStatsCard";
import dataForUsersFor2024 from "./dataForUsersFor2024";

export function generateMetadata({ params }: Props) {
  return {
    title: `@${params.userName} | Captured 2024! | Soonlist`,
    openGraph: {
      title: `@${params.userName} | Captured 2024! | Soonlist`,
      description: `@${params.userName}'s year in captured events!`,
      url: `${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/2024/${params.userName}`,
      type: "article",
      images: ["/soonlist-2024-captured.png"],
    },
  };
}

interface Props {
  params: { userName: string };
}

// Example usage:
const Page = ({ params }: Props) => {
  const userName = params.userName;
  let component = <div />;
  if (userName && userName in dataForUsersFor2024) {
    const userData = dataForUsersFor2024[userName];
    if (userData) {
      component = <UserStatsCard {...userData} />;
    }
  } else {
    component = (
      <div>
        <p className="text-center text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
          Become a member of Soonlist to join our community and start capturing
          your events!
        </p>
        <p className="text-center text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
          Scroll down to join now!
        </p>
      </div>
    );
  }

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

  return (
    <div className="flex flex-col items-center justify-center">
      <h1 className="text-center font-heading text-5xl font-bold leading-none tracking-tighterish text-gray-700 md:text-7xl md:leading-none">
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
      <p className="mt-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
        Here's how you did in 2024!
      </p>
      {component}
    </div>
  );
};

export default Page;

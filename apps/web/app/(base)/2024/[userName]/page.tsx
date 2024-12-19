import React from "react";
import Image from "next/image";
// use these to check if the user is signed in
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

import Section from "../_components/section";
import UserStatsCard from "../_components/userStatsCard";
import dataForUsersFor2024 from "./dataForUsersFor2024";

export function generateMetadata({ params }: Props) {
  return {
    title: `@${params.userName} | Captured 2024! | Soonlist`,
  };
}

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

  return <UserStatsCard {...userData} />;
};

export default Page;

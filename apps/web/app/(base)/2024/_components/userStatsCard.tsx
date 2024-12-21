//  userStatsCard.tsx;

import Image from "next/image";

import { Logo } from "~/components/Logo";

export interface UserStatsCardProps {
  user_id: string;
  username: string;
  emoji: string | null;
  created_at: string;
  total_events_captured: string;
  unique_event_types: string;
  favorite_type: string | null;
  favorite_category: string | null;
  events_followed: string;
  first_event_id: string | null;
  first_event_name: string | null;
  first_event_image: string | null;
  first_event_date: string | null;
  user_index?: number;
}

// example data
// {
//     user_id: "user_2ZFNoiajf80Q4ZiTQj8hAgatRCt",
//     username: "jaronheard",
//     emoji: "💖",
//     created_at: "2023-11-04 01:58:14",
//     total_events_captured: "252",
//     unique_event_types: "22",
//     favorite_type: "concert",
//     favorite_category: "music",
//     events_followed: "28",
//     first_event_id: "clrbwg21u0001f48lm6x2zsoq",
//     first_event_name: "Dig A Hole Zines Fundraising PARTY",
//     first_event_image:
//       "https://upcdn.io/12a1yek/image/uploads/2024/01/13/4ktjNP7rKz-file.jpeg?crop-x=0&crop-y=87&crop-w=1350&crop-h=1350",
//     first_event_date: "2024-01-13 06:00:00",
//   },

const Stat = ({
  label,
  value,
  top,
  left,
  color,
}: {
  label: string;
  value: string | null;
  top: string;
  left: string;
  color: string;
}) => {
  if (!value || value === "NULL" || value === "unknown" || value === "0") {
    return (
      <div
        className={`absolute`}
        style={{ top: `${top}px`, left: `${left}px` }}
      />
    );
  }

  return (
    <div
      className={`absolute`}
      style={{
        top: `${top}px`,
        left: `${left}px`,
      }}
    >
      <p className="text-[10px] font-bold uppercase leading-none">{label}</p>
      {/* if value is a url, render an image     */}
      {value.includes("http") ? (
        <div className="relative mt-2 h-36 w-36 flex-shrink-0 overflow-hidden rounded-md border-4 border-yellow-300">
          <Image
            src={value}
            alt={label}
            layout="fill"
            className="absolute inset-0 object-cover"
          />
        </div>
      ) : (
        <p className="text-3xl font-bold leading-none">{value}</p>
      )}
      <div
        className={`absolute inset-0 -left-6 -top-6 -z-10 h-14 w-14 rounded-[4px] bg-accent-${color}`}
      ></div>
    </div>
  );
};

const UserStatsCard: React.FC<UserStatsCardProps> = ({
  username,
  emoji,
  total_events_captured,
  favorite_type,
  favorite_category,
  first_event_image,
  created_at,
}) => {
  return (
    <div className="relative -z-20 mx-auto h-[500px] w-[500px] scale-[70%] transform rounded-lg bg-purple-100 p-4 sm:scale-[80%] md:-translate-x-0 md:scale-100">
      <Logo
        variant="hidePreview"
        className="absolute -left-1 top-4 block h-8"
      />
      <p className="text-right font-heading text-3xl font-bold">
        2024<span className="text-interactive-1">Captured!</span>
      </p>
      <p className="text-2xl font-bold text-interactive-1">@{username}</p>
      <div className="absolute inset-0 top-10">
        <Stat
          label="Events Captured"
          value={total_events_captured}
          top="100"
          left="50"
          color="orange"
        />
        <Stat
          label="Fave Category"
          value={favorite_category}
          top="375"
          left="100"
          color="green"
        />
        <Stat
          label="Fave Type"
          value={favorite_type}
          //   value="performance"
          top="350"
          left="300"
          color="blue"
        />
        <Stat
          label="Join Date"
          value={
            new Date(created_at).getFullYear() === 2023
              ? "2023!"
              : new Date(created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                })
          }
          top="250"
          left="75"
          color="yellow"
        />
        <Stat
          label="Founding Member"
          value={emoji}
          top="75"
          left="350"
          color="green"
        />
        <Stat
          label="First Event on Soonlist"
          value={first_event_image}
          top="150"
          left="200"
          color="blue"
        />
      </div>
    </div>
  );
};

export default UserStatsCard;

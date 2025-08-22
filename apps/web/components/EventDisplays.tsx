"use client";

import { useContext, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SignedIn, useUser } from "@clerk/nextjs";
import {
  Accessibility,
  CalendarIcon,
  Copy,
  Ear,
  Earth,
  EyeOff,
  GlobeIcon,
  MapPin,
  MessageSquareIcon,
  Mic,
  PersonStanding,
  Share,
  ShieldPlus,
  TagIcon,
} from "lucide-react";
import { toast } from "sonner";

import type {
  DateInfo,
  EventMetadata as EventMetadataDisplay,
  SimilarityDetails,
} from "@soonlist/cal";
import type {
  AddToCalendarButtonPropsRestricted,
  ATCBActionEventConfig,
} from "@soonlist/cal/types";
import type { Comment, EventFollow, List, User } from "@soonlist/db/types";
import {
  eventTimesAreDefined,
  formatCompactTimeRange,
  formatRelativeTime,
  getDateInfoUTC,
  getDateTimeInfo,
} from "@soonlist/cal";
import { Badge } from "@soonlist/ui/badge";
import { Label } from "@soonlist/ui/label";

import type { AddToCalendarCardProps } from "./AddToCalendarCard";
import type { EventWithUser } from "./EventList";
import { TimezoneContext } from "~/context/TimezoneContext";
import { env } from "~/env";
import { DEFAULT_TIMEZONE } from "~/lib/constants";
import { feedback } from "~/lib/intercom/intercom";
import { cn } from "~/lib/utils";
import { CalendarButton } from "./CalendarButton";
import { DeleteButton } from "./DeleteButton";
import { EditButton } from "./EditButton";
import EventCard from "./EventCard";
import { FollowEventButton } from "./FollowButtons";
import { buildDefaultUrl } from "./ImageUpload";
import { ShareButton } from "./ShareButton";
import { UserAvatarMini } from "./UserAvatarMini";

interface EventListItemProps {
  list?: List; // this is the list that this is a part of
  variant?: "card" | "minimal";
  user?: User;
  eventFollows: EventFollow[];
  comments: Comment[];
  id: string;
  createdAt?: Date;
  event: AddToCalendarCardProps;
  visibility: "public" | "private";
  hideCurator?: boolean;
  showOtherCurators?: boolean;
  similarEvents?: {
    event: EventWithUser;
    similarityDetails: SimilarityDetails;
  }[];
  filePath?: string;
  happeningNow?: boolean;
  lists?: List[]; // this is all lists that this event is a part of
  index?: number; // used to alternate image rotation like the Expo app
}

interface EventPageProps {
  user?: User;
  eventFollows: EventFollow[];
  comments: Comment[];
  id: string;
  createdAt?: Date;
  event: AddToCalendarButtonPropsRestricted;
  image?: string | null;
  visibility: "public" | "private";
  singleEvent?: boolean;
  hideCurator?: boolean;
  showOtherCurators?: boolean;
  similarEvents?: {
    event: EventWithUser;
    similarityDetails: SimilarityDetails;
  }[];
  lists?: List[];
  children?: React.ReactNode;
  eventMetadata?: EventMetadataDisplay;
}

function EventDateDisplaySimple({
  startDate,
  startTime,
  endDate,
  // endTime,
  timezone,
}: {
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  timezone: string;
}) {
  const { timezone: userTimezone } = useContext(TimezoneContext);
  if (!startDate || !endDate) {
    console.error("startDate or endDate is missing");
    return null;
  }

  if (!timezone) {
    console.error("timezone is missing");
    return null;
  }

  const startDateInfo = startTime
    ? getDateTimeInfo(startDate, startTime, timezone, userTimezone.toString())
    : getDateInfoUTC(startDate);
  // const endDateInfo = endTime
  //   ? getDateTimeInfo(endDate, endTime, timezone, userTimezone.toString())
  //   : getDateInfoUTC(endDate);
  // const showMultiDay = showMultipleDays(startDateInfo, endDateInfo);
  // const showNightIcon =
  //   endsNextDayBeforeMorning(startDateInfo, endDateInfo) && !showMultiDay;

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className="text-lg font-semibold uppercase leading-none text-neutral-2"
        suppressHydrationWarning
      >
        {startDateInfo?.monthName.substring(0, 3)}
      </div>
      <div
        className="font-heading text-4xl font-bold leading-none tracking-tighter text-neutral-1"
        suppressHydrationWarning
      >
        {startDateInfo?.day}
      </div>
    </div>
  );
}

function EventDetailsCard({
  id,
  name,
  startDate,
  startTime,
  endDate,
  endTime,
  timezone,
  location,
  description,
}: {
  id: string;
  name: string;
  image?: string;
  startTime: string;
  startDate: string;
  endTime: string;
  endDate: string;
  timezone: string;
  description?: string;
  location?: string;
}) {
  const { timezone: userTimezone } = useContext(TimezoneContext);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!startDate || !endDate) {
    console.error("startDate or endDate is missing");
    return null;
  }

  if (!timezone) {
    console.error("timezone is missing");
    return null;
  }

  const startDateInfo = startTime
    ? getDateTimeInfo(startDate, startTime, timezone, userTimezone.toString())
    : getDateInfoUTC(startDate);
  const endDateInfo = endTime
    ? getDateTimeInfo(endDate, endTime, timezone, userTimezone.toString())
    : getDateInfoUTC(endDate);

  if (!startDateInfo || !endDateInfo) {
    console.error("startDateInfo or endDateInfo is missing");
    return null;
  }

  if (!description) {
    description = "";
  }

  return (
    <div className="flex w-full flex-col items-start justify-center gap-2">
      <DateAndTimeDisplay
        endDateInfo={endDateInfo}
        endTime={endTime}
        isClient={isClient}
        startDateInfo={startDateInfo}
        startTime={startTime}
        variant="compact"
      />
      <div className="flex w-full flex-col items-start gap-2">
        <Link
          href={`/event/${id}`}
          className={
            "line-clamp-3 pr-12 text-2xl font-bold leading-9 tracking-wide text-interactive-1"
          }
        >
          {name}
        </Link>
        <div className="flex-start flex gap-2 pr-12 text-lg font-medium leading-none">
          {location && (
            <Link
              href={`https://www.google.com/maps/search/?api=1&query=${location}`}
              className="line-clamp-1 flex shrink items-center gap-0.5 break-all text-neutral-2"
            >
              <MapPin className="size-4 flex-shrink-0" />
              <span className="line-clamp-1">{location}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function EventAccessibility({ metadata }: { metadata?: EventMetadataDisplay }) {
  return (
    <div className="col-span-2 flex flex-col gap-0.5">
      <Label className="flex items-center" htmlFor="accessibility">
        <GlobeIcon className="mr-1.5 size-4" />
        Accessibility
      </Label>
      <div
        className="flex flex-wrap gap-1 text-sm capitalize text-neutral-1"
        id="accessibility"
      >
        {(metadata?.accessibility?.length === 0 ||
          !metadata?.accessibility?.length) &&
          "Unknown"}
        {metadata?.accessibility?.map((item) => {
          // icon for each accessibility type
          switch (item) {
            case "masksRequired":
              return (
                <div className="flex items-center" key={item}>
                  <ShieldPlus className="mr-0.5 inline-block size-4"></ShieldPlus>
                  Masks Required
                </div>
              );
            case "masksSuggested":
              return (
                <div className="flex items-center" key={item}>
                  <ShieldPlus className="mr-0.5 inline-block size-4"></ShieldPlus>
                  Masks Suggested
                </div>
              );
            case "wheelchairAccessible":
              return (
                <div className="flex items-center" key={item}>
                  <Accessibility className="mr-0.5 inline-block size-4"></Accessibility>
                  Wheelchair Accessible
                </div>
              );
            case "signLanguageInterpretation":
              return (
                <div className="flex items-center" key={item}>
                  <Ear className="mr-0.5 inline-block size-4"></Ear>
                  Sign Language Interpretation
                </div>
              );
            case "closedCaptioning":
              return (
                <div className="flex items-center" key={item}>
                  <Ear className="mr-0.5 inline-block size-4"></Ear>
                  Closed Captioning
                </div>
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}

function EventMetadataDisplay({
  metadata,
}: {
  metadata?: EventMetadataDisplay;
}) {
  const hasPriceMin =
    (metadata?.priceMin && metadata.priceMin > 0) || metadata?.priceMin === 0;
  const hasPriceMax = metadata?.priceMax && metadata.priceMax > 0;
  const hasPrices = hasPriceMin && hasPriceMax;
  const isPriceRange = hasPrices && metadata.priceMin !== metadata.priceMax;
  const singlePriceText = `$${metadata?.priceMin}`;
  const priceRangeText = `$${metadata?.priceMin}-$${metadata?.priceMax}`;
  const priceText = isPriceRange ? priceRangeText : singlePriceText;
  const isPaidPriceType = metadata?.priceType === "paid";
  const isUnknownPriceType = metadata?.priceType === "unknown";
  const showPriceType = isUnknownPriceType ? !hasPrices : !isPaidPriceType;
  const showPrice = hasPrices;
  const adjustedPriceTypeText =
    metadata?.priceType === "notaflof" ? "NOTAFLOF" : metadata?.priceType;
  const priceTypeText = showPriceType ? adjustedPriceTypeText : "";
  const showSpace = showPrice && showPriceType;

  const performersCharacterLength = metadata?.performers?.join(", ").length;
  const performersSpanMultipleColumns =
    performersCharacterLength && performersCharacterLength > 15;

  return (
    <div className="relative -m-2 my-3 grid grid-cols-2 gap-x-1 gap-y-3 rounded-2xl border border-interactive-2 p-4 py-6 text-neutral-2 md:grid-cols-4">
      <SignedIn>
        <Badge
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 hover:cursor-pointer"
          variant={"secondary"}
          onClick={() => feedback("Event Metadata")}
        >
          <MessageSquareIcon size={16} className="mr-1 scale-x-[-1]" />
          Feedback
        </Badge>
      </SignedIn>
      <div className="flex flex-col gap-0.5">
        <Label className="flex items-center" htmlFor="category">
          <CalendarIcon className="mr-1.5 size-4" />
          Category
        </Label>
        <p className="text-sm capitalize text-neutral-1" id="category">
          {metadata?.category}
        </p>
      </div>
      <div className="flex flex-col gap-0.5">
        <Label className="flex items-center" htmlFor="type">
          <GlobeIcon className="mr-1.5 size-4" />
          Type
        </Label>
        <p className="text-sm capitalize text-neutral-1" id="type">
          {metadata?.type}
        </p>
      </div>
      <div className="flex flex-col gap-0.5">
        <Label className="flex items-center" htmlFor="price">
          <TagIcon className="mr-1.5 size-4" />
          Price
        </Label>
        <div className="text-sm capitalize text-neutral-1" id="price">
          {`${showPrice ? priceText : ""}${showSpace ? ", " : ""}`}
          {showPriceType && (
            <div className="inline capitalize">{priceTypeText}</div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <Label className="flex items-center" htmlFor="age-restriction">
          <PersonStanding className="mr-1.5 size-4" />
          Ages
        </Label>
        <p className="text-sm capitalize text-neutral-1" id="age-restriction">
          {metadata?.ageRestriction}
        </p>
      </div>
      <div
        className={cn("col-span-2 flex flex-col gap-0.5 hyphens-auto", {
          "col-span-1": !performersSpanMultipleColumns,
          "col-span-2": performersSpanMultipleColumns,
        })}
      >
        <Label className="flex items-center" htmlFor="performers">
          <Mic className="mr-1.5 size-4" />
          Performers
        </Label>
        <p className="text-sm text-neutral-1" id="performers">
          {metadata?.performers?.join(", ")}
        </p>
      </div>
      <EventAccessibility metadata={metadata} />
      {/* <div className="flex flex-col gap-0.5">
      <Label className="flex items-center" htmlFor="source">
        <GlobeIcon className="mr-1.5 size-4" />
        Source
      </Label>
      <p className="text-sm capitalize text-neutral-1" id="source">
        {metadata?.source}
      </p>
    </div>
    <div className="flex flex-col gap-0.5">
      <Label className="flex items-center" htmlFor="mentions">
        <TextIcon className="mr-1.5 size-4" />
        Mentions
      </Label>
      <p className="text-sm text-neutral-1" id="mentions">
        {metadata?.mentions}
      </p>
    </div> */}
    </div>
  );
}

function EventDetails({
  id,
  name,
  startDate,
  startTime,
  endDate,
  endTime,
  timezone,
  location,
  description,
  preview,
  EventActionButtons,
  metadata,
  happeningNow,
  visibility, // Add this prop
}: {
  id: string;
  name: string;
  startTime: string;
  startDate: string;
  endTime: string;
  endDate: string;
  timezone: string;
  description?: string;
  location?: string;
  EventActionButtons?: React.ReactNode;
  preview?: boolean;
  metadata?: EventMetadataDisplay;
  variant?: "minimal";
  happeningNow?: boolean;
  visibility: "public" | "private"; // Add this to the props type
}) {
  const { timezone: userTimezone } = useContext(TimezoneContext);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!startDate || !endDate) {
    console.error("startDate or endDate is missing");
    return null;
  }

  if (!timezone) {
    console.error("timezone is missing");
    return null;
  }

  const startDateInfo = startTime
    ? getDateTimeInfo(startDate, startTime, timezone, userTimezone.toString())
    : getDateInfoUTC(startDate);
  const endDateInfo = endTime
    ? getDateTimeInfo(endDate, endTime, timezone, userTimezone.toString())
    : getDateInfoUTC(endDate);

  if (!startDateInfo || !endDateInfo) {
    console.error("startDateInfo or endDateInfo is missing");
    return null;
  }

  if (!description) {
    description = "";
  }

  return (
    <div className="relative">
      <div className="mb-2 flex items-center">
        {visibility === "private" ? (
          <EyeOff className="mr-2 size-4 text-neutral-2" />
        ) : (
          <Earth className="mr-2 size-4 text-neutral-2" />
        )}
        <DateAndTimeDisplay
          endDateInfo={endDateInfo}
          endTime={endTime}
          isClient={isClient}
          startDateInfo={startDateInfo}
          startTime={startTime}
          happeningNow={happeningNow}
          variant="compact"
        />
      </div>
      <div className="">
        <Link
          href={preview ? "" : `/event/${id}`}
          className={
            "line-clamp-2 pb-1 text-lg font-bold leading-tight text-neutral-1"
          }
        >
          {name}
        </Link>
        <div className="text-xs">
          {location && (
            <Link
              href={`https://www.google.com/maps/search/?api=1&query=${location}`}
              className="line-clamp-1 break-all text-neutral-2"
            >
              <MapPin className="mr-0.5 inline size-4" />
              <span className="inline">{location}</span>
            </Link>
          )}
        </div>

        {/* TODO: 
        <div className="pt-2">
          <EventDescription description={description} truncate />
        </div>
        */}
        {preview && (
          <div className="w-full">
            <EventMetadataDisplay metadata={metadata} />
          </div>
        )}
        <div className="absolute bottom-2 right-2 z-10">
          {EventActionButtons}
        </div>
      </div>
    </div>
  );
}

function HappeningSoonBadge({ startDateInfo }: { startDateInfo: DateInfo }) {
  const relativeTimeString = formatRelativeTime(startDateInfo);
  if (!relativeTimeString) {
    return null;
  }

  const now = new Date();
  const startDateObj = new Date(
    startDateInfo.year,
    startDateInfo.month - 1,
    startDateInfo.day,
    startDateInfo.hour,
    startDateInfo.minute,
  );
  const difference = startDateObj.getTime() - now.getTime();

  if (difference < 0) {
    return null;
  }

  return (
    <span className="ml-1 whitespace-nowrap rounded-full bg-accent-yellow px-1 text-interactive-1">{`${relativeTimeString}`}</span>
  );
}

// TODO: Remove this
// function EventDescription({
//   description,
//   truncate,
// }: {
//   description: string;
//   singleEvent?: boolean;
//   truncate?: boolean;
// }) {
//   return (
//     <div
//       className={cn("text-lg leading-7 text-neutral-1", {
//         "line-clamp-3": truncate,
//       })}
//     >
//       <span
//         dangerouslySetInnerHTML={{
//           __html: translateToHtml(description),
//         }}
//       ></span>
//     </div>
//   );
// }

function EventActionButtons({
  user,
  event,
  id,
  isOwner,
  isFollowing,
  visibility,
  variant,
  size,
}: {
  user?: User;
  event: AddToCalendarButtonPropsRestricted;
  id: string;
  isOwner: boolean;
  isFollowing?: boolean;
  visibility: "public" | "private";
  variant?: "none" | "minimal";
  size?: "sm";
}) {
  if (!user) {
    return null;
  }
  if (variant === "none") {
    return <></>;
  }

  if (variant === "minimal") {
    const scale =
      size === "sm" ? "transform scale-[0.55] origin-bottom-right" : "";
    return (
      <div className={cn("flex w-full flex-wrap items-center gap-3", scale)}>
        <ShareButton type="icon" event={event} id={id} />
        <CalendarButton
          type="icon"
          event={event as ATCBActionEventConfig}
          id={id}
          username={user.username}
        />
        {!isOwner && (
          <FollowEventButton eventId={id} following={isFollowing} type="icon" />
        )}
        {/* <FollowEventDropdownButton eventId={id} following={isFollowing} /> */}
        {isOwner && (
          <>
            <EditButton type="icon" userId={user.id} id={id} />
            <DeleteButton type="icon" userId={user.id} id={id} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      <div className="flex grow items-center justify-between">
        {visibility !== "private" && (
          <Link
            className="text-lg font-medium leading-none text-neutral-2"
            href={`/${user.username}/upcoming`}
          >
            added by @{user.username}
          </Link>
        )}
        {visibility === "private" && (
          <div className="text-lg font-medium leading-none text-neutral-1">
            <EyeOff className="mr-2 inline size-4" /> Not discoverable
          </div>
        )}
        <Link
          href={`/${user.username}/upcoming`}
          className="box-content block size-[2.625rem] shrink-0 rounded-full border-4 border-accent-yellow"
        >
          <Image
            className="rounded-full"
            src={user.userImage}
            alt=""
            width={375}
            height={375}
          />
        </Link>
      </div>
      <ShareButton type="icon" event={event} id={id} />
      <CalendarButton
        type="icon"
        event={event as ATCBActionEventConfig}
        id={id}
        username={user.username}
      />
      {!isOwner && (
        <FollowEventButton eventId={id} following={isFollowing} type="icon" />
      )}
      {isOwner && (
        <>
          <EditButton type="icon" userId={user.id} id={id} />
          <DeleteButton type="icon" userId={user.id} id={id} />
        </>
      )}
    </div>
  );
}

// Removed duplicated mini user info in favor of `UserAvatarMini`

export function EventListItem(props: EventListItemProps) {
  const { user: clerkUser } = useUser();
  const { user, eventFollows, id, event, filePath, visibility } = props;
  const { timezone: userTimezone } = useContext(TimezoneContext);
  const roles = clerkUser?.unsafeMetadata.roles as string[] | undefined;
  const isSelf = clerkUser?.id === user?.id;
  const isOwner = isSelf || roles?.includes("admin");
  const isFollowing = !!eventFollows.find(
    (item) => item.userId === clerkUser?.id,
  );
  const image =
    event.images?.[3] ||
    (filePath ? buildDefaultUrl(props.filePath || "") : undefined);

  if (!props.variant || props.variant === "minimal") {
    // Derive date/time info and status badges similar to the Expo card
    const startDateInfo = event.startTime
      ? getDateTimeInfo(
          event.startDate || "",
          event.startTime || "",
          event.timeZone || DEFAULT_TIMEZONE,
          userTimezone,
        )
      : getDateInfoUTC(event.startDate || "");
    const endDateInfo = event.endTime
      ? getDateTimeInfo(
          event.endDate || event.startDate || "",
          event.endTime || event.startTime || "",
          event.timeZone || DEFAULT_TIMEZONE,
          userTimezone,
        )
      : getDateInfoUTC(event.endDate || event.startDate || "");

    const relativeTime = startDateInfo ? formatRelativeTime(startDateInfo) : "";
    const isHappeningNow = relativeTime === "Happening now";

    const isRecent = (() => {
      if (!props.createdAt) return false;
      const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
      const createdAtTs = new Date(props.createdAt).getTime();
      if (Number.isNaN(createdAtTs)) return false;
      return createdAtTs > threeHoursAgo;
    })();

    // Visual constants to mimic Expo design
    const thumbWidth = 110; // px
    const thumbHeight = Math.round((thumbWidth * 16) / 9);
    const imageRotation =
      props.index !== undefined
        ? props.index % 2 === 0
          ? "10deg"
          : "-10deg"
        : Number(id?.charCodeAt(0) || 0) % 2 === 0
          ? "10deg"
          : "-10deg";

    const baseBorderColor = "#E9E3FF";
    const happeningBorderColor = "#FEEA9F"; // accent-yellow
    const recentGlowColor = "#E0D9FF"; // light purple
    const cardBorderColor = isRecent
      ? recentGlowColor
      : isHappeningNow
        ? happeningBorderColor
        : baseBorderColor;

    const cardShadowRadius = isRecent ? 8 : 2.5;

    function formatFullTimeRange(start: DateInfo, end: DateInfo): string {
      const toHour = (h: number) => (h % 12 === 0 ? 12 : h % 12);
      const toMinute = (m: number) => m.toString().padStart(2, "0");
      const startHour = toHour(start.hour);
      const endHour = toHour(end.hour);
      const startMin = toMinute(start.minute);
      const endMin = toMinute(end.minute);
      const startPeriod = start.hour < 12 ? "AM" : "PM";
      const endPeriod = end.hour < 12 ? "AM" : "PM";
      return `${startHour}:${startMin}${startPeriod} - ${endHour}:${endMin}${endPeriod}`;
    }

    const dateText = (() => {
      if (!startDateInfo || !endDateInfo) return "";
      const dateStr = `${startDateInfo.dayOfWeek.substring(0, 3)}, ${startDateInfo.monthName} ${startDateInfo.day}`;
      const timeStr = formatFullTimeRange(startDateInfo, endDateInfo);
      return `${dateStr} • ${timeStr}`;
    })();

    const relativeLabel = (() => {
      if (isHappeningNow) return "Happening now";
      if (!relativeTime) return "";
      return `Starts in ${relativeTime
        .replaceAll("hrs", "hours")
        .replaceAll("hr", "hour")
        .replaceAll("mins", "minutes")
        .replaceAll("min", "minute")}`;
    })();

    const handleShareClick = async () => {
      const e = event as AddToCalendarButtonPropsRestricted;
      const isAllDay = e.startTime && e.endTime ? false : true;
      const shareText = isAllDay
        ? `(${e.startDate || ""}, ${e.location || ""}) ${e.description || ""}`
        : `(${e.startDate || ""} ${e.startTime || ""}-${e.endTime || ""}, ${e.location || ""}) ${e.description || ""}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: `${e.name || "Event"} | Soonlist`,
            text: shareText,
            url: `https://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/event/${id}`,
          });
        } catch {
          // ignored
        }
      } else {
        await navigator.clipboard.writeText(
          `https://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/event/${id}`,
        );
        toast("Event URL copied to clipboard!");
      }
    };

    const atcbEvent: ATCBActionEventConfig = {
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      startTime: event.startTime,
      endDate: event.endDate,
      endTime: event.endTime,
      timeZone: event.timeZone,
      location: event.location,
    };

    return (
      <li className="relative">
        {/* Angled thumbnail on the right */}
        <div
          className="absolute -right-6 top-1/2 z-10"
          style={{
            transform: `translateY(-50%) rotate(${imageRotation})`,
          }}
        >
          <div
            style={{
              width: thumbWidth,
              height: thumbHeight,
              borderRadius: 20,
              overflow: "hidden",
              backgroundColor: "white",
              boxShadow: "0 2px 8px rgba(90,50,251,0.18)",
            }}
          >
            {image ? (
              <Image
                src={`${image}`}
                alt=""
                width={thumbWidth}
                height={thumbHeight}
                className="object-cover"
                style={{
                  width: thumbWidth,
                  height: thumbHeight,
                  borderRadius: 20,
                  borderWidth: 3,
                  borderColor: "white",
                  objectPosition: "top",
                }}
              />
            ) : (
              <div
                className="border border-purple-300 bg-interactive-3"
                style={{
                  width: thumbWidth,
                  height: thumbHeight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 20,
                  borderWidth: 3,
                  borderColor: "white",
                }}
              />
            )}
          </div>
        </div>

        {/* Content card with dynamic border and right padding for image */}
        <div
          className="my-1 mt-4 rounded-[20px] bg-white p-3"
          style={{
            paddingRight: thumbWidth * 0.9,
            borderWidth: 2,
            borderColor: cardBorderColor,
            boxShadow: `0 2px ${cardShadowRadius + 2}px rgba(90,50,251,0.12)`,
          }}
        >
          <div className="mb-1 flex w-full items-center justify-between">
            <div className="flex items-center gap-1">
              <p className="text-sm font-medium text-neutral-2">{dateText}</p>
            </div>
            {isOwner &&
              props.similarEvents &&
              props.similarEvents.length > 0 && (
                <div className="flex items-center gap-1 opacity-60">
                  <div className="flex items-center gap-1 rounded-full bg-neutral-4/70 px-2 py-0.5">
                    <Copy className="size-3.5" />
                    <span className="text-xs text-neutral-2">
                      {props.similarEvents.length}
                    </span>
                  </div>
                </div>
              )}
          </div>

          <Link href={`/event/${id}`} className="block">
            <h3 className="mb-1 truncate text-lg font-bold text-neutral-1">
              {event.name}
            </h3>
          </Link>
          {event.location && (
            <div className="mb-1 flex items-center">
              <p className="truncate text-sm text-neutral-2">
                {event.location}
              </p>
            </div>
          )}

          {/* Actions row */}
          <div className="-mb-1 mt-4 flex items-center gap-3">
            {/* Share pill */}
            <button
              type="button"
              onClick={handleShareClick}
              className="inline-flex items-center gap-2 bg-interactive-2 px-4 py-2.5"
              style={{ borderRadius: 16 }}
              aria-label="Share"
            >
              <Share className="size-5 text-interactive-1" />
              <span className="text-base font-bold text-interactive-1">
                Share
              </span>
            </button>

            <CalendarButton
              type={"icon"}
              event={atcbEvent}
              id={id}
              username={user?.username}
            />

            {!isOwner && (
              <FollowEventButton
                eventId={id}
                following={isFollowing}
                type="icon"
              />
            )}

            {user && isOwner && (
              <>
                <EditButton type="icon" userId={user.id} id={id} />
                <DeleteButton type="icon" userId={user.id} id={id} />
              </>
            )}
          </div>
        </div>

        {/* Creator row */}
        {user && !isSelf && (props.showOtherCurators || !props.hideCurator) && (
          <div className="mx-1 mt-2 flex items-center justify-center gap-2">
            <UserAvatarMini
              username={user.username}
              displayName={user.displayName}
              userImage={user.userImage}
            />
          </div>
        )}

        {/* Top badges */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-center gap-2">
          {isRecent && (
            <div
              className="rounded-full px-2 py-0.5"
              style={{
                borderWidth: 2,
                borderColor: "white",
                backgroundColor: "#E0D9FF",
              }}
            >
              <span className="text-xs font-medium text-neutral-1">New</span>
            </div>
          )}
          {relativeLabel && (
            <div
              className="rounded-full px-2 py-0.5"
              style={{
                borderWidth: 2,
                borderColor: "white",
                backgroundColor: "#FEEA9F",
              }}
            >
              <span className="text-xs font-medium text-neutral-1">
                {relativeLabel}
              </span>
            </div>
          )}
        </div>
      </li>
    );
  }

  // if (props.variant === "card")
  return (
    <li
      className={cn(
        "relative h-full overflow-hidden rounded-xl bg-white shadow-sm after:pointer-events-none after:absolute after:left-0 after:top-0 after:size-full after:rounded-xl after:border after:border-neutral-3 after:shadow-sm",
      )}
    >
      {image && (
        <div className="relative h-44 w-full grow">
          <Image
            className="rounded-t-xl object-cover"
            src={image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
            priority
          />
        </div>
      )}
      {!image && (
        <div className="relative h-44 w-full grow bg-accent-yellow"></div>
      )}
      <div className="relative overflow-hidden">
        <div className="absolute -right-24 -top-20 size-44 overflow-hidden rounded-full bg-interactive-3"></div>
        <div className="absolute right-0 top-0 p-3">
          <EventDateDisplaySimple
            startDate={event.startDate}
            startTime={event.startTime}
            endDate={event.endDate}
            endTime={event.endTime}
            timezone={event.timeZone || "America/Los_Angeles"}
          />
        </div>
        <div className="flex w-full items-start gap-7 p-5">
          {props.variant === "card" && (
            <EventDetailsCard
              id={id}
              name={event.name!}
              image={image}
              startDate={event.startDate!}
              endDate={event.endDate!}
              startTime={event.startTime!}
              endTime={event.endTime!}
              timezone={event.timeZone || DEFAULT_TIMEZONE}
              location={event.location}
              description={event.description}
            />
          )}
        </div>
      </div>
      <div className="p-3"></div>
      <div className="absolute bottom-2 left-2 z-10 flex gap-2">
        {user && (
          <UserAvatarMini
            username={user.username}
            displayName={user.displayName}
            userImage={user.userImage}
          />
        )}
      </div>
      <div className="absolute bottom-2 right-2 z-20">
        <EventActionButtons
          user={user}
          event={event as AddToCalendarButtonPropsRestricted}
          id={id}
          isOwner={!!isOwner}
          isFollowing={isFollowing}
          visibility={visibility}
          variant="minimal"
          size="sm"
        />
      </div>
    </li>
  );
}

export function EventPreview(
  props: EventListItemProps & { event: AddToCalendarCardProps },
) {
  const { id, event } = props;

  return (
    <div
      className={cn(
        "relative grid max-w-xl overflow-hidden rounded-xl bg-white p-7 shadow-sm after:pointer-events-none after:absolute after:left-0 after:top-0 after:size-full after:rounded-xl after:border after:border-neutral-3 after:shadow-sm",
      )}
    >
      <div className="absolute -right-24 -top-20 size-44 overflow-hidden rounded-full bg-interactive-3"></div>
      <div className="absolute right-0 top-0 p-3">
        <EventDateDisplaySimple
          startDate={event.startDate}
          startTime={event.startTime}
          endDate={event.endDate}
          endTime={event.endTime}
          timezone={event.timeZone || "America/Los_Angeles"}
        />
      </div>
      <div className="flex w-full items-start gap-7">
        <EventDetails
          preview
          id={id}
          name={event.name!}
          startDate={event.startDate!}
          endDate={event.endDate!}
          startTime={event.startTime!}
          endTime={event.endTime!}
          timezone={event.timeZone || "America/Los_Angeles"}
          location={event.location}
          description={event.description}
          metadata={event.eventMetadata}
          visibility={"public"}
        />
      </div>
    </div>
  );
}

function DateAndTimeDisplay({
  happeningNow,
  endDateInfo,
  endTime,
  isClient,
  startDateInfo,
  startTime,
  variant = "default",
}: {
  happeningNow?: boolean;
  endDateInfo: DateInfo;
  endTime?: string;
  isClient: boolean;
  startDateInfo: DateInfo;
  startTime?: string;
  variant?: "default" | "compact";
}) {
  return (
    <div className="flex flex-col gap-2 font-medium leading-none">
      {isClient && eventTimesAreDefined(startTime, endTime) && (
        <div
          className={cn(
            " text-sm uppercase text-neutral-2",
            variant === "compact" && "text-xs text-neutral-2 sm:flex-col",
          )}
          suppressHydrationWarning
        >
          <span>
            {startDateInfo.dayOfWeek.substring(0, 3)}{" "}
            {startDateInfo.monthName.substring(0, 3)} {startDateInfo.day}
            {" • "}
            {formatCompactTimeRange(startDateInfo, endDateInfo)}
          </span>
          {happeningNow && (
            <span className="ml-1 rounded-full bg-yellow-100 px-1 text-yellow-700">
              Now!
            </span>
          )}{" "}
          {startTime && startDateInfo && (
            <HappeningSoonBadge startDateInfo={startDateInfo} />
          )}
        </div>
      )}
    </div>
  );
}

export function EventPage(props: EventPageProps) {
  const { user: clerkUser } = useUser();

  const { user, eventFollows, id, event, image } = props;
  const roles = clerkUser?.unsafeMetadata.roles as string[] | undefined;
  const isSelf = clerkUser?.id === user?.id;
  const isOwner = isSelf || roles?.includes("admin");
  const isFollowing = !!eventFollows.find(
    (item) => clerkUser?.id === item.userId,
  );

  const {
    startDate,
    startTime,
    endDate,
    endTime,
    timeZone: timezone,
    location,
    description,
  } = event;

  const { timezone: userTimezone } = useContext(TimezoneContext);
  if (!startDate || !endDate) {
    console.error("startDate or endDate is missing");
    return null;
  }

  if (!timezone) {
    console.error("timezone is missing");
    return null;
  }

  const startDateInfo = startTime
    ? getDateTimeInfo(startDate, startTime, timezone, userTimezone.toString())
    : getDateInfoUTC(startDate);
  const endDateInfo = endTime
    ? getDateTimeInfo(endDate, endTime, timezone, userTimezone.toString())
    : getDateInfoUTC(endDate);

  if (!startDateInfo || !endDateInfo) {
    console.error("startDateInfo or endDateInfo is missing");
    return null;
  }

  return (
    <EventCard
      userName={user?.displayName || user?.username || ""}
      userAvatar={user?.userImage || ""}
      userEmoji={user?.emoji || ""}
      eventName={event.name || ""}
      eventDate={
        startDateInfo.dayOfWeek.substring(0, 3) +
        " " +
        startDateInfo.monthName.substring(0, 3) +
        " " +
        startDateInfo.day
      }
      eventTime={formatCompactTimeRange(startDateInfo, endDateInfo)}
      eventLocation={location || ""}
      eventDescription={description || ""}
      eventImage={image || null}
      calendarButton={
        <CalendarButton
          event={event as ATCBActionEventConfig}
          id={id}
          username={user?.username}
          type="button"
        />
      }
      shareButton={<ShareButton type="icon" event={event} id={id} />}
      followButton={
        <div>
          {user && !isSelf && (
            <FollowEventButton eventId={id} following={isFollowing} />
          )}
        </div>
      }
      editButton={
        <div>
          {user && isOwner && (
            <EditButton type="icon" userId={user.id} id={id} />
          )}
        </div>
      }
      deleteButton={
        <div>
          {user && isOwner && (
            <DeleteButton type="icon" userId={user.id} id={id} />
          )}
        </div>
      }
    />
  );
}

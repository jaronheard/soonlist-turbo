"use client";

import { useContext, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SignedIn, useUser } from "@clerk/nextjs";
import {
  Accessibility,
  CalendarIcon,
  Ear,
  Earth,
  EyeOff,
  GlobeIcon,
  MapPin,
  MessageSquareIcon,
  Mic,
  PersonStanding,
  ShieldPlus,
  TagIcon,
} from "lucide-react";

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
  timeFormatDateInfo,
} from "@soonlist/cal";
import { Badge } from "@soonlist/ui/badge";
import { Label } from "@soonlist/ui/label";

import type { AddToCalendarCardProps } from "./AddToCalendarCard";
import type { EventWithUser } from "./EventList";
import { useCroppedImageContext } from "~/context/CroppedImageContext";
import { TimezoneContext } from "~/context/TimezoneContext";
import { feedback } from "~/lib/intercom/intercom";
import { cn, translateToHtml } from "~/lib/utils";
import { api } from "~/trpc/react";
import { CalendarButton } from "./CalendarButton";
import { DeleteButton } from "./DeleteButton";
import { EditButton } from "./EditButton";
import { FollowEventButton, FollowUserButton } from "./FollowButtons";
import { buildDefaultUrl } from "./ImageUpload";
import { ListCard } from "./ListCard";
import { PersonalNote } from "./PersonalNote";
import { ShareButton } from "./ShareButton";
import { UserAllEventsCard } from "./UserAllEventsCard";

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
}

interface EventPageProps {
  user?: User;
  eventFollows: EventFollow[];
  comments: Comment[];
  id: string;
  createdAt?: Date;
  event: AddToCalendarButtonPropsRestricted;
  image?: string;
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
  image,
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
  image?: string;
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
              className="line-clamp-1  break-all text-neutral-2"
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
    <span className="ml-1 whitespace-nowrap rounded-full bg-yellow-100 px-1 text-yellow-700">{`${relativeTimeString}`}</span>
  );
}

function EventDescription({
  description,
  truncate,
}: {
  description: string;
  singleEvent?: boolean;
  truncate?: boolean;
}) {
  return (
    <div
      className={cn("text-lg leading-7 text-neutral-1", {
        "line-clamp-3": truncate,
      })}
    >
      <span
        dangerouslySetInnerHTML={{
          __html: translateToHtml(description),
        }}
      ></span>
    </div>
  );
}

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
            href={`/${user.username}/events`}
          >
            added by @{user.username}
          </Link>
        )}
        {visibility === "private" && (
          <div className="text-lg font-medium leading-none text-neutral-1">
            <EyeOff className="mr-2 inline size-4" /> Not Discoverable
          </div>
        )}
        <Link
          href={`/${user.username}/events`}
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

interface UserInfoMiniProps {
  username: string;
  displayName: string;
  userImage: string;
  showFollowButton?: boolean;
}

export function UserInfoMini({
  username,
  userImage,
  showFollowButton = true,
}: Omit<UserInfoMiniProps, "displayName">) {
  const { user: activeUser } = useUser();

  const userQuery = api.user.getByUsername.useQuery({
    userName: username,
  });

  const followingQuery = api.user.getIfFollowing.useQuery(
    {
      followerId: activeUser?.id || "",
      followingId: userQuery.data?.id || "",
    },
    {
      enabled: !!activeUser?.id && !!userQuery.data?.id,
    },
  );

  const user = userQuery.data;

  const self = activeUser?.username === user?.username;

  const following = followingQuery.data;

  return (
    <div className="flex items-center gap-0.5">
      <Link href={`/${username}/events`} className="relative flex items-center">
        <Image
          className="inline-block size-3 rounded-full"
          src={userImage}
          alt={`${username}'s profile picture`}
          width={16}
          height={16}
        />
      </Link>
      <Link href={`/${username}/events`} className="group flex items-center">
        <p className="text-xs text-gray-500 group-hover:text-gray-700">
          @{username}
        </p>
      </Link>
      <div className="flex h-5 items-center">
        {!self && user?.id && showFollowButton && (
          <div className="origin-left scale-50 transform">
            <FollowUserButton userId={user.id} following={!!following} />
          </div>
        )}
      </div>
    </div>
  );
}

export function EventListItem(props: EventListItemProps) {
  const { user: clerkUser } = useUser();
  const { user, eventFollows, id, event, filePath, visibility, lists } = props;
  const roles = clerkUser?.unsafeMetadata.roles as string[] | undefined;
  const isSelf = clerkUser?.id === user?.id;
  const isOwner = isSelf || roles?.includes("admin");
  const isFollowing = !!eventFollows.find((item) => item.userId === user?.id);
  const image =
    event.images?.[3] ||
    (filePath ? buildDefaultUrl(props.filePath || "") : undefined);

  if (!props.variant || props.variant === "minimal") {
    return (
      <div className="relative border-b border-neutral-100 pb-1">
        {image && (
          <div className="absolute right-0 top-0 h-full w-[75px] overflow-hidden rounded-xl">
            <Link
              href={`/event/${id}`}
              className="relative block h-full w-full"
            >
              <div className="relative h-[calc(100%-8px)] w-full overflow-hidden rounded-xl">
                <Image
                  className="object-cover"
                  src={image}
                  alt=""
                  fill
                  sizes="75px"
                  style={{ objectPosition: "center" }}
                />
              </div>
            </Link>
          </div>
        )}
        <li className="relative pr-[85px]">
          <div className="flex w-full items-start">
            <EventDetails
              id={id}
              name={event.name!}
              image={image}
              startDate={event.startDate!}
              endDate={event.endDate!}
              startTime={event.startTime!}
              endTime={event.endTime!}
              timezone={event.timeZone || "America/Los_Angeles"}
              location={event.location}
              happeningNow={props.happeningNow}
              visibility={visibility} // Add this line
            />
          </div>
          <div className="p-1">
            {user &&
              lists &&
              lists.length > 0 &&
              lists.map((list) => (
                <ListCard
                  key={list.id}
                  name={list.name}
                  id={list.id}
                  username={user.username}
                  visibility={list.visibility}
                  variant="badge"
                ></ListCard>
              ))}
            {user &&
              !isSelf &&
              (props.showOtherCurators || !props.hideCurator) && (
                <UserInfoMini
                  username={user.username}
                  userImage={user.userImage}
                  showFollowButton={false}
                />
              )}
          </div>
          <div className="absolute -bottom-0.5 -right-2 z-10">
            {/* <EventActionButtons
              user={user}
              event={event as AddToCalendarButtonPropsRestricted}
              id={id}
              isOwner={!!isOwner}
              isFollowing={isFollowing}
              visibility={props.visibility}
              variant="minimal"
              size="sm"
            /> */}

            {!isOwner && (
              <FollowEventButton
                eventId={id}
                following={isFollowing}
                type="icon"
              />
            )}
          </div>
        </li>
      </div>
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
              timezone={event.timeZone || "America/Los_Angeles"}
              location={event.location}
              description={event.description}
            />
          )}
        </div>
      </div>
      <div className="p-3"></div>
      <div className="absolute bottom-2 left-2 z-10 flex gap-2">
        {user &&
          lists &&
          lists.length > 0 &&
          lists.map((list) => (
            <ListCard
              key={list.id}
              name={list.name}
              id={list.id}
              username={user.username}
              visibility={list.visibility}
              variant="badge"
            ></ListCard>
          ))}
        {user && (
          <UserInfoMini
            username={user.username}
            userImage={user.userImage}
            showFollowButton={false}
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
  const { croppedImagesUrls } = useCroppedImageContext();
  const { images } = event;
  const image = croppedImagesUrls.cropped || images?.[3];

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
          image={image}
          timezone={event.timeZone || "America/Los_Angeles"}
          location={event.location}
          description={event.description}
          metadata={event.eventMetadata}
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
    <div className="flex flex-col gap-2 leading-none">
      {isClient && eventTimesAreDefined(startTime, endTime) && (
        <div
          className={cn(
            " text-sm uppercase text-neutral-2",
            variant === "compact" && "text-xs sm:flex-col",
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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const {
    user,
    eventFollows,
    id,
    event,
    image,
    singleEvent,
    children,
    lists,
    eventMetadata,
    visibility,
  } = props;
  const roles = clerkUser?.unsafeMetadata.roles as string[] | undefined;
  const isSelf = clerkUser?.id === user?.id;
  const isOwner = isSelf || roles?.includes("admin");
  const isFollowing = !!eventFollows.find(
    (item) => clerkUser?.id === item.userId,
  );
  const comment = props.comments
    .filter((item) => user?.id === item.userId)
    .pop();
  const hasLists = user && lists && lists.length > 0;

  const {
    startDate,
    startTime,
    endDate,
    endTime,
    timeZone: timezone,
    location,
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
    <div className="">
      <div className="grid grid-cols-1 gap-1 ">
        <div>
          <div className="flex flex-col gap-2">
            <DateAndTimeDisplay
              endDateInfo={endDateInfo}
              endTime={endTime}
              isClient={isClient}
              startDateInfo={startDateInfo}
              startTime={startTime}
            />
            <h1 className="text-xl font-bold ">{event.name}</h1>
            <div className="flex-start text-m flex gap-2 pr-12 leading-none">
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
            <PersonalNote text={comment?.content} />

            {visibility === "private" && (
              <GlobeIcon className="size-4 text-neutral-2" />
            )}
            {image && (
              <Image
                src={image}
                className="mx-auto h-auto max-h-96 w-full object-contain"
                alt=""
                width={640}
                height={480}
              />
            )}
          </div>

          <div className="flex flex-col gap-8 pt-8">
            <EventDescription
              description={event.description || ""}
              singleEvent={singleEvent}
            />
            {eventMetadata && (
              <div className="w-full">
                <EventMetadataDisplay metadata={eventMetadata} />
              </div>
            )}
            {!children && (
              <div className="flex flex-wrap gap-2">
                <ShareButton type="button" event={event} id={id} />
                <CalendarButton
                  type="button"
                  event={event as ATCBActionEventConfig}
                  id={id}
                  username={user?.username}
                />

                {user && !isSelf && (
                  <FollowEventButton eventId={id} following={isFollowing} />
                )}
                {user && isOwner && (
                  <EditButton type="icon" userId={user.id} id={id} />
                )}
                {user && isOwner && (
                  <DeleteButton type="icon" userId={user.id} id={id} />
                )}
              </div>
            )}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}

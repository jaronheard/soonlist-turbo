"use client";

import { useContext, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { atcb_action } from "add-to-calendar-button-react";
import { Copy, Earth, EyeOff, MapPin } from "lucide-react";

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

import type { AddToCalendarCardProps } from "./AddToCalendarCard";
import type { EventWithUser } from "./EventList";
import { TimezoneContext } from "~/context/TimezoneContext";
import { DEFAULT_TIMEZONE } from "~/lib/constants";
import { getGoogleMapsUrl } from "~/lib/maps";
import { cn } from "~/lib/utils";
import { CalendarButton } from "./CalendarButton";
import { DeleteButton } from "./DeleteButton";
import { EditButton } from "./EditButton";
import EventCard from "./EventCard";
import { FollowEventButton } from "./FollowButtons";
import { buildDefaultUrl } from "./ImageUpload";
import { SaveButton } from "./SaveButton";
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
  noLinks = false,
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
  noLinks?: boolean;
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
        {noLinks ? (
          <h2 className="line-clamp-3 pr-12 text-2xl font-bold leading-9 tracking-wide text-interactive-1">
            {name}
          </h2>
        ) : (
          <Link
            href={`/event/${id}`}
            className={
              "line-clamp-3 pr-12 text-2xl font-bold leading-9 tracking-wide text-interactive-1"
            }
          >
            {name}
          </Link>
        )}
        <div className="flex-start flex gap-2 pr-12 text-lg font-medium leading-none">
          {location && (
            <>
              {noLinks ? (
                <div className="line-clamp-1 flex shrink items-center gap-0.5 break-all text-neutral-2">
                  <MapPin className="size-4 flex-shrink-0" />
                  <span className="line-clamp-1">{location}</span>
                </div>
              ) : (
                <Link
                  href={getGoogleMapsUrl(location)}
                  className="line-clamp-1 flex shrink items-center gap-0.5 break-all text-neutral-2"
                >
                  <MapPin className="size-4 flex-shrink-0" />
                  <span className="line-clamp-1">{location}</span>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
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
              href={getGoogleMapsUrl(location)}
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
    const isHappeningNow =
      props.happeningNow ?? relativeTime === "Happening now";

    const isRecent = (() => {
      if (!props.createdAt) return false;
      const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
      const createdAtTs = new Date(props.createdAt).getTime();
      if (Number.isNaN(createdAtTs)) return false;
      return createdAtTs > threeHoursAgo;
    })();

    // Visual constants to mimic Expo design
    const thumbWidth = 94; // px (85% of original 110px)
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
      if (!relativeTime) return "";
      // Don't show "in the past" when happeningNow prop is explicitly true
      if (props.happeningNow) return "Happening now";
      return relativeTime;
    })();

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
        {/* Angled thumbnail on the right - wrapped in Link */}
        <Link
          href={`/event/${id}`}
          className="absolute -right-2 top-1/2 z-10"
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
        </Link>

        {/* Content card with dynamic border and right padding for image */}
        <div
          className="my-1 mt-4 rounded-[20px] bg-white p-3"
          style={{
            paddingRight: thumbWidth * 0.7,
            marginRight: 16,
            borderWidth: 2,
            borderColor: cardBorderColor,
            boxShadow: `0 2px ${cardShadowRadius + 2}px rgba(90,50,251,0.12)`,
          }}
        >
          {/* Tappable content area */}
          <Link href={`/event/${id}`} className="block">
            <div className="mb-1 flex w-full items-center justify-between">
              <div className="flex items-center gap-1">
                <p className="text-xs font-medium text-neutral-2">{dateText}</p>
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

            <h3 className="mb-1 truncate text-base font-bold text-neutral-1">
              {event.name}
            </h3>

            {event.location && (
              <div className="mb-3 flex items-center">
                <p className="truncate text-xs text-neutral-2">
                  {event.location}
                </p>
              </div>
            )}
          </Link>

          {/* Actions row - NOT wrapped in Link */}
          <div className="-mb-2.5 flex items-center gap-3">
            {/* Save/Share pill */}
            <SaveButton
              eventId={id}
              event={event}
              userId={clerkUser?.id}
              eventUserId={user?.id}
              isSaved={isFollowing}
              className="-ml-2"
            />

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
              <span className="text-[10px] font-medium text-neutral-1">
                New
              </span>
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
              <span className="text-[10px] font-medium text-neutral-1">
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
      {/* Tappable main content area */}
      <Link href={`/event/${id}`} className="block">
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
                noLinks={true}
              />
            )}
          </div>
        </div>
        <div className="p-3"></div>
      </Link>

      {/* User avatar - positioned but not tappable for main link */}
      <div className="absolute bottom-2 left-2 z-10 flex gap-2">
        {user && (
          <UserAvatarMini
            username={user.username}
            displayName={user.displayName}
            userImage={user.userImage}
          />
        )}
      </div>

      {/* Action buttons - separate from main tappable area */}
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

  const handleAddToCalendar = () => {
    const eventForCalendar = { ...event } as ATCBActionEventConfig;
    const displayName =
      user?.displayName || (user?.username ? `@${user.username}` : "");
    const additionalText =
      user?.username && id
        ? `Captured by ${displayName} on Soonlist`
        : `Captured on Soonlist`;
    eventForCalendar.description = `${event.description || ""}\n\n${additionalText}`;
    eventForCalendar.options = [
      "Apple",
      "Google",
      "iCal",
      "Microsoft365",
      "MicrosoftTeams",
      "Outlook.com",
      "Yahoo",
    ];
    void atcb_action(eventForCalendar);
  };

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
      onAddToCalendar={handleAddToCalendar}
      eventMetadata={props.eventMetadata}
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

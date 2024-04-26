"use client";

import Link from "next/link";
import Image from "next/image";
import { SignedIn, useUser } from "@clerk/nextjs";
import { useContext, useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarIcon,
  EyeOff,
  GlobeIcon,
  Mic,
  PersonStanding,
  ShieldPlus,
  TagIcon,
  Ear,
  Accessibility,
  Sparkles,
  MessageSquareIcon,
} from "lucide-react";
import { DeleteButton } from "./DeleteButton";
import { EditButton } from "./EditButton";
import { CalendarButton } from "./CalendarButton";
import { ShareButton } from "./ShareButton";
import { type EventWithUser } from "./EventList";
import { buttonVariants } from "./ui/button";
import { Label } from "./ui/label";
import { type AddToCalendarCardProps } from "./AddToCalendarCard";
import { Badge } from "./ui/badge";
import { PersonalNote } from "./PersonalNote";
import { UserAllEventsCard } from "./UserAllEventsCard";
import { ListCard } from "./ListCard";
import { FollowEventButton } from "./FollowButtons";
import { buildDefaultUrl } from "./ImageUpload";
import {
  type User,
  type EventFollow,
  type Comment,
  type List,
} from "@/server/db/types";
import {
  translateToHtml,
  getDateInfoUTC,
  cn,
  // showMultipleDays,
  // endsNextDayBeforeMorning,
  eventTimesAreDefined,
  getDateTimeInfo,
  timeFormatDateInfo,
} from "@/lib/utils";
import { type AddToCalendarButtonPropsRestricted } from "@/types";
import { type SimilarityDetails } from "@/lib/similarEvents";
import { TimezoneContext } from "@/context/TimezoneContext";
import { type EventMetadata as EventMetadataDisplay } from "@/lib/prompts";
import { feedback } from "@/lib/intercom/intercom";

type EventListItemProps = {
  variant?: "card";
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
};

type EventPageProps = {
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
};

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
      <div className="text-lg font-semibold uppercase leading-none text-neutral-2">
        {startDateInfo?.monthName.substring(0, 3)}
      </div>
      <div className="font-heading text-4xl font-bold leading-none tracking-tighter text-neutral-1">
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
  EventActionButtons?: React.ReactNode;
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
      {/* duplicated with Event */}
      <div className="flex-start flex gap-2 pr-12 text-lg font-medium leading-none">
        {isClient && eventTimesAreDefined(startTime, endTime) && (
          <>
            <div className="flex-wrap text-neutral-2">
              {startDateInfo?.dayOfWeek.substring(0, 3)}
              {", "}
              {startDateInfo?.month}/{startDateInfo?.day}/
              {startDateInfo?.year.toString().substring(2, 4)}{" "}
              <span className="text-neutral-3">{"//"}</span>{" "}
              {timeFormatDateInfo(startDateInfo)}-
              {timeFormatDateInfo(endDateInfo)}
            </div>
          </>
        )}
      </div>
      {/* end duplicated with Event */}
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
              className={"line-clamp-1 shrink break-all text-neutral-2"}
            >
              {location}
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
  const isPriceRange = hasPrices && metadata?.priceMin !== metadata?.priceMax;
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
      <Badge
        className="absolute -top-3 left-1/2 -translate-x-1/2 hover:cursor-pointer"
        variant={"secondary"}
        onClick={() => feedback("Event Metadata")}
      >
        <Sparkles size={16} className="mr-1" />
        Experimental
      </Badge>
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
        <p className="text-sm capitalize text-neutral-1" id="price">
          {`${showPrice ? priceText : ""}${showSpace ? ", " : ""}`}
          {showPriceType && (
            <div className="inline capitalize">{priceTypeText}</div>
          )}
        </p>
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
      {/* duplicated with Event */}
      <div className="flex-start flex gap-2 pr-12 text-lg font-medium leading-none">
        {isClient && eventTimesAreDefined(startTime, endTime) && (
          <>
            <div className="flex-wrap text-neutral-2">
              {startDateInfo?.dayOfWeek.substring(0, 3)}
              {", "}
              {startDateInfo?.month}/{startDateInfo?.day}/
              {startDateInfo?.year.toString().substring(2, 4)}{" "}
              <span className="text-neutral-3">{"//"}</span>{" "}
              {timeFormatDateInfo(startDateInfo)}-
              {timeFormatDateInfo(endDateInfo)}
            </div>
          </>
        )}
      </div>
      {/* end duplicated with Event */}
      <div className="flex w-full flex-col items-start gap-2">
        <Link
          href={preview ? "" : `/event/${id}`}
          className={
            "line-clamp-3 pr-12 text-2.5xl font-bold leading-9 tracking-[0.56px] text-neutral-1"
          }
        >
          {name}
        </Link>
        <div className="flex-start flex gap-2 pr-12 text-lg font-medium leading-none">
          {location && (
            <Link
              href={`https://www.google.com/maps/search/?api=1&query=${location}`}
              className={"line-clamp-1 shrink break-all text-neutral-2"}
            >
              {location}
            </Link>
          )}
        </div>
        {/* full width image with a max height, fill container to width */}
        {image && (
          <div className="relative h-32 w-full grow sm:h-56 lg:hidden">
            <Image
              className="rounded-xl object-cover"
              src={image}
              alt=""
              fill
              sizes="(max-width: 1023px) 100vw"
            />
          </div>
        )}
        <div className="pt-2">
          <EventDescription description={description} truncate />
        </div>
        {!preview && (
          <Link
            href={`/event/${id}`}
            className={cn(
              buttonVariants({ variant: "link" }),
              "group h-full p-0"
            )}
          >
            Learn more{" "}
            <ArrowRight className="ml-1 size-4 text-interactive-2 " />
          </Link>
        )}
        {preview && (
          <div className="w-full">
            <EventMetadataDisplay metadata={metadata} />
          </div>
        )}
        <div className="w-full">
          {EventActionButtons && <>{EventActionButtons}</>}
        </div>
      </div>
    </div>
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
  // isFollowing,
  visibility,
}: {
  user?: User;
  event: AddToCalendarButtonPropsRestricted;
  id: string;
  isOwner: boolean;
  isFollowing?: boolean;
  visibility: "public" | "private";
}) {
  if (!user) {
    return null;
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
            <EyeOff className="mr-2 inline" /> Unlisted event
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
        event={event}
        id={id}
        username={user.username}
      />
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

export function EventListItem(props: EventListItemProps) {
  const { user: clerkUser } = useUser();
  const { user, eventFollows, id, event, filePath } = props;
  const roles = clerkUser?.unsafeMetadata.roles as string[] | undefined;
  const isSelf =
    clerkUser?.id === user?.id || clerkUser?.externalId === user?.id;
  const isOwner = isSelf || roles?.includes("admin");
  const isFollowing = !!eventFollows.find((item) => item.userId === user?.id);
  const image =
    event.images?.[3] ||
    (filePath ? buildDefaultUrl(props.filePath || "") : undefined);
  // const comment = props.comments?.filter((item) => item.userId === user?.id).pop();
  // always show curator if !isSelf
  // const showOtherCurators = !isSelf && props.showOtherCurators;
  // const showCurator = showOtherCurators || !props.hideCurator;

  if (props.variant !== "card") {
    return (
      <div className="relative">
        {image && (
          <Link href={`/event/${id}`}>
            <Image
              className="absolute left-0 top-7 z-10 hidden size-20 -translate-x-1/2 rounded-xl lg:block"
              src={image}
              alt=""
              width={375}
              height={375}
            />
          </Link>
        )}
        <li
          className={cn(
            "relative grid overflow-hidden rounded-xl bg-white p-7 shadow-sm after:pointer-events-none after:absolute after:left-0 after:top-0 after:size-full after:rounded-xl after:border after:border-neutral-3 after:shadow-sm",
            { "lg:pl-16": !!image }
          )}
        >
          {/* {visibility === "private" && (
          <>
            <Badge className="max-w-fit" variant="destructive">
              Unlisted Event
            </Badge>
            <div className="p-1"></div>
          </>
        )} */}
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
              EventActionButtons={
                <EventActionButtons
                  user={user}
                  event={event as AddToCalendarButtonPropsRestricted}
                  id={id}
                  isOwner={!!isOwner}
                  isFollowing={isFollowing}
                  visibility={props.visibility}
                />
              }
            />
          </div>
        </li>
      </div>
    );
  }

  return (
    <li
      className={cn(
        "relative h-full overflow-hidden rounded-xl bg-white shadow-sm after:pointer-events-none after:absolute after:left-0 after:top-0 after:size-full after:rounded-xl after:border after:border-neutral-3 after:shadow-sm"
      )}
    >
      {image && (
        <div className="relative h-44 w-full grow">
          <Image
            className="rounded-t-xl object-cover"
            src={image}
            alt=""
            fill
            sizes="100vw"
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
    </li>
  );
}

export function EventPreview(
  props: EventListItemProps & { event: AddToCalendarCardProps }
) {
  const { id, event } = props;

  return (
    <div
      className={cn(
        "relative grid max-w-xl overflow-hidden rounded-xl bg-white p-7 shadow-sm after:pointer-events-none after:absolute after:left-0 after:top-0 after:size-full after:rounded-xl after:border after:border-neutral-3 after:shadow-sm"
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
        />
      </div>
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
  } = props;
  console.log("eventMetadata", eventMetadata);
  console.log("event", event);
  const roles = clerkUser?.unsafeMetadata.roles as string[] | undefined;
  const isSelf =
    clerkUser?.id === user?.id || clerkUser?.externalId === user?.id;
  const isOwner = isSelf || roles?.includes("admin");
  const isFollowing = !!eventFollows.find(
    (item) =>
      clerkUser?.id === item.userId || clerkUser?.externalId === item.userId
  );
  const comment = props.comments
    ?.filter((item) => user?.id === item.userId)
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
      {/* {visibility === "private" && (
        <>
          <Badge className="max-w-fit" variant="destructive">
            Unlisted Event
          </Badge>
        </>
      )} */}
      <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-24">
        <div>
          <div className="flex flex-col gap-5">
            {/* duplicated with EventListItem */}
            <div className="flex-start flex gap-2 pr-12 text-lg font-medium leading-none">
              {isClient && eventTimesAreDefined(startTime, endTime) && (
                <>
                  <div className="shrink-0 text-neutral-2">
                    {startDateInfo?.dayOfWeek.substring(0, 3)}
                    {", "}
                    {startDateInfo?.month}/{startDateInfo?.day}/
                    {startDateInfo?.year.toString().substring(2, 4)}{" "}
                    <span className="text-neutral-3">{"//"}</span>{" "}
                    {timeFormatDateInfo(startDateInfo)}-
                    {timeFormatDateInfo(endDateInfo)}
                  </div>
                </>
              )}
            </div>
            {/* end duplicated with EventListItem */}
            <h1 className="font-heading text-5xl font-bold leading-[3.5rem]">
              {event.name}
            </h1>
            <div className="flex-start flex gap-2 pr-12 text-lg font-medium leading-none">
              {location && (
                <Link
                  href={`https://www.google.com/maps/search/?api=1&query=${location}`}
                  className={"line-clamp-1 shrink break-all text-neutral-2"}
                >
                  {location}
                </Link>
              )}
            </div>
            <PersonalNote text={comment?.content} />
            {!hasLists && user && (
              <UserAllEventsCard
                username={user.username}
                userImage={user.userImage}
              />
            )}
            {hasLists &&
              lists.map((list) => (
                <ListCard
                  key={list.id}
                  name={list.name}
                  username={user?.username}
                  id={list.id}
                />
              ))}
          </div>
          <div className="flex flex-col gap-8 pt-8">
            <EventDescription
              description={event.description!}
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
                  event={event}
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
        {image && (
          <Image
            src={image}
            className="mx-auto h-auto max-h-96 w-full object-contain"
            alt=""
            width={640}
            height={480}
          />
        )}
        {children}
      </div>
      {/* <div className="absolute right-2 top-6">
        {isOwner && (
          <SignedIn>
            <EventActionButton
              user={user}
              event={event}
              id={id}
              isOwner={!!isOwner}
              isFollowing={isFollowing}
            />
          </SignedIn>
        )}
      </div> */}
    </div>
  );
}

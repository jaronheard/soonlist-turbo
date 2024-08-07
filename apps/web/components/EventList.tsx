import { currentUser } from "@clerk/nextjs/server";
import { clsx } from "clsx";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import type {
  Comment,
  Event,
  EventFollow,
  EventToLists,
  List,
  User,
} from "@soonlist/db/types";
import { collapseSimilarEvents } from "@soonlist/cal";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/Accordian";
import { EventListItem } from "~/components/EventDisplays";
import { cn } from "~/lib/utils";

function ListContainer({
  children,
  variant,
  forceSingleColumn,
}: {
  children: React.ReactNode;
  variant?: "card";
  forceSingleColumn?: boolean;
}) {
  if (variant === "card") {
    return (
      <ul
        role="list"
        className={cn(
          "grid gap-4 sm:gap-8 ",
          forceSingleColumn
            ? "grid-cols-1"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        )}
      >
        {children}
      </ul>
    );
  }

  return (
    <ul role="list" className="flex max-w-full flex-col gap-4">
      {children}
    </ul>
  );
}

type EventToListsWithList = EventToLists & {
  list: List;
};

export type EventWithUser = Event & {
  user: User;
  eventFollows: EventFollow[];
  comments: Comment[];
  eventToLists?: EventToListsWithList[];
};

export async function EventList({
  currentEvents,
  futureEvents,
  pastEvents,
  variant,
  hideCurator,
  showOtherCurators,
  showPrivateEvents,
}: {
  currentEvents: EventWithUser[];
  futureEvents: EventWithUser[];
  pastEvents: EventWithUser[];
  // variant is either "future-minimal" or "card" or undefined
  variant?: "future-minimal" | "card";
  showOtherCurators?: boolean;
  hideCurator?: boolean;
  showPrivateEvents?: boolean;
  children?: React.ReactNode;
}) {
  const user = await currentUser();
  function getVisibleEvents(events: EventWithUser[]) {
    return events.filter(
      (item) => showPrivateEvents || item.visibility === "public",
    );
  }

  const currentEventsToUse = collapseSimilarEvents(
    getVisibleEvents(currentEvents),
    user?.externalId || user?.id,
  );
  const pastEventsToUse = collapseSimilarEvents(
    getVisibleEvents(pastEvents),
    user?.externalId || user?.id,
  );
  const futureEventsToUse = collapseSimilarEvents(
    getVisibleEvents(futureEvents),
    user?.externalId || user?.id,
  );
  const showPastEvents =
    variant !== "future-minimal" && pastEventsToUse.length > 0;
  const showCurrentEvents = true;
  const variantToUse = variant === "card" ? "card" : undefined;
  const variantForListItems =
    variant === "future-minimal" ? "minimal" : variantToUse;

  return (
    <Accordion
      type="multiple"
      className="w-full"
      defaultValue={["current-events", "future-events"]}
    >
      {showPastEvents && (
        <AccordionItem value="past-events" className={clsx("px-6 opacity-80")}>
          <AccordionTrigger>
            <div className="flex w-full items-center justify-between">
              Past events
              <span className="inline-flex items-center justify-center rounded-full bg-interactive-1 px-2 py-1 text-lg font-semibold leading-none text-white">
                {pastEventsToUse.length}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="-mx-6">
            {pastEventsToUse.length === 0 ? (
              <p className="mx-6 text-lg text-gray-500">No past events.</p>
            ) : (
              <ListContainer variant={variantToUse} forceSingleColumn>
                {pastEventsToUse.map(({ event: item, similarEvents }) => (
                  <EventListItem
                    variant={variantForListItems}
                    key={item.id}
                    user={item.user}
                    eventFollows={item.eventFollows}
                    comments={item.comments}
                    id={item.id}
                    event={item.event as AddToCalendarButtonPropsRestricted}
                    visibility={item.visibility}
                    lists={item.eventToLists?.map((list) => list.list)}
                    createdAt={item.createdAt}
                    hideCurator={hideCurator}
                    showOtherCurators={showOtherCurators}
                    similarEvents={similarEvents}
                  />
                ))}
              </ListContainer>
            )}
          </AccordionContent>
        </AccordionItem>
      )}
      {showCurrentEvents && currentEventsToUse.length > 0 && (
        <AccordionItem value="current-events" className="px-6">
          {variant !== "future-minimal" && (
            <AccordionTrigger className="-mx-6 px-6">
              <div className="flex w-full items-center justify-between">
                Happening now
                <span className="inline-flex items-center justify-center rounded-full bg-interactive-1 px-2 py-1 text-lg font-semibold leading-none text-white">
                  {currentEventsToUse.length}
                </span>
              </div>
            </AccordionTrigger>
          )}
          <AccordionContent className="-mx-6 rounded-xl">
            {currentEventsToUse.length === 0 ? (
              <p className="mx-6 text-lg text-gray-500">No future events.</p>
            ) : (
              <ListContainer variant={variantToUse} forceSingleColumn>
                {currentEventsToUse.map(({ event: item, similarEvents }) => (
                  <EventListItem
                    variant={variantForListItems}
                    key={item.id}
                    user={item.user}
                    eventFollows={item.eventFollows}
                    comments={item.comments}
                    id={item.id}
                    event={item.event as AddToCalendarButtonPropsRestricted}
                    visibility={item.visibility}
                    lists={item.eventToLists?.map((list) => list.list)}
                    createdAt={item.createdAt}
                    hideCurator={hideCurator}
                    showOtherCurators={showOtherCurators}
                    similarEvents={similarEvents}
                    happeningNow={true}
                  />
                ))}
              </ListContainer>
            )}
          </AccordionContent>
        </AccordionItem>
      )}
      <AccordionItem
        value="future-events"
        className={clsx("px-6")}
        disabled={variant === "future-minimal"}
      >
        {variant !== "future-minimal" && (
          <AccordionTrigger>
            <div className="flex w-full items-center justify-between">
              Upcoming events
              <span className="inline-flex items-center justify-center rounded-full bg-interactive-1 px-2 py-1 text-lg font-semibold leading-none text-white">
                {futureEventsToUse.length}
              </span>
            </div>
          </AccordionTrigger>
        )}
        <AccordionContent className="-mx-6 rounded-xl">
          {futureEventsToUse.length === 0 ? (
            <p className="mx-6 text-lg text-gray-500">No future events.</p>
          ) : (
            <ListContainer variant={variantToUse} forceSingleColumn>
              {futureEventsToUse.map(({ event: item, similarEvents }) => (
                <EventListItem
                  variant={variantForListItems}
                  key={item.id}
                  user={item.user}
                  eventFollows={item.eventFollows}
                  comments={item.comments}
                  id={item.id}
                  event={item.event as AddToCalendarButtonPropsRestricted}
                  visibility={item.visibility}
                  lists={item.eventToLists?.map((list) => list.list)}
                  createdAt={item.createdAt}
                  hideCurator={hideCurator}
                  showOtherCurators={showOtherCurators}
                  similarEvents={similarEvents}
                />
              ))}
            </ListContainer>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

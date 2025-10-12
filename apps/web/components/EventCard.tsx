"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarPlus, MapPinned } from "lucide-react";

import type { EventMetadata } from "@soonlist/cal";
import { Card } from "@soonlist/ui/card";

import { getGoogleMapsUrl } from "~/lib/maps";
import LightboxImage from "./LightboxImage";

export default function EventCard(props: {
  eventImage: string | null;
  eventTitle?: string;
  eventName?: string;
  eventDate: string;
  eventTime?: string;
  eventLocation: string;
  eventDescription: string;
  eventLink?: string;
  userAvatar: string;
  userName: string;
  userDisplayName?: string;
  userEmoji?: string;
  shareButton: React.ReactNode;
  calendarButton?: React.ReactNode;
  followButton?: React.ReactNode;
  editButton?: React.ReactNode;
  deleteButton?: React.ReactNode;
  onAddToCalendar?: () => void;
  eventMetadata?: EventMetadata;
}) {
  const {
    eventImage,
    eventTitle,
    eventName,
    eventDate,
    eventTime,
    eventLocation,
    eventDescription,
    eventLink,
    userAvatar,
    userName,
    userDisplayName,
    userEmoji,
    shareButton,
    calendarButton,
    followButton,
    editButton,
    deleteButton,
    onAddToCalendar,
    eventMetadata,
  } = props;

  const displayName = userDisplayName || (userName ? userName : "");

  return (
    <div className="w-full max-w-2xl">
      {/* User Curator Caption - Positioned outside the card */}
      <div className="mb-3 flex w-full items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-interactive-1">
              <Image
                src={`${userAvatar}`}
                alt="User avatar"
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
            {userEmoji && (
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#5a32fb]">
                <span className="text-sm">{userEmoji}</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-2">Captured by</p>
            <p className="text-sm font-semibold text-neutral-1">
              {displayName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {calendarButton}
          {shareButton}
        </div>
      </div>

      {/* Event Card - Self-contained with just event details */}
      <Card className="overflow-hidden border border-interactive-3 bg-white p-6 shadow-md">
        <div className="space-y-6">
          {eventImage && (
            <div className="relative aspect-square w-full overflow-hidden rounded-lg">
              <LightboxImage
                src={eventImage}
                alt="Event flyer"
                width={600}
                height={600}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-neutral-1">
              {eventTitle || eventName}
            </h2>

            {/* Enhanced Date & Location Section */}
            <div className="flex flex-col gap-4">
              {/* Date & Time */}
              {eventDate && onAddToCalendar && (
                <button
                  onClick={onAddToCalendar}
                  className="group flex items-center justify-start gap-2 text-left text-lg font-medium leading-none text-interactive-1 transition-colors hover:underline"
                  aria-label="Add to calendar"
                >
                  <CalendarPlus
                    className="size-4 flex-shrink-0 text-interactive-1"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    {eventDate}
                    {eventTime && (
                      <span className="ml-1.5 font-normal opacity-80">
                        {eventTime}
                      </span>
                    )}
                  </span>
                </button>
              )}

              {/* Location */}
              {eventLocation.trim() && getGoogleMapsUrl(eventLocation) && (
                <a
                  href={getGoogleMapsUrl(eventLocation)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-start gap-2 text-lg font-medium leading-none text-interactive-1 transition-colors hover:underline"
                  aria-label={`Open ${eventLocation} in maps`}
                >
                  <MapPinned
                    className="size-4 flex-shrink-0 text-interactive-1"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">{eventLocation}</span>
                </a>
              )}
            </div>

            <p className="text-neutral-1">{eventDescription}</p>

            {/* Metadata Section */}
            {eventMetadata && (
              <div className="mt-4 flex flex-col gap-2 border-t border-neutral-3/20 pt-4">
                {/* Platform */}
                {eventMetadata.platform &&
                  eventMetadata.platform !== "unknown" && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-2">
                        Source:
                      </span>
                      <span className="text-sm capitalize text-neutral-1">
                        {eventMetadata.platform}
                      </span>
                    </div>
                  )}

                {/* Mentions */}
                {eventMetadata.mentions &&
                  eventMetadata.mentions.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {/* Main Author (first mention) */}
                      <div className="text-sm text-neutral-2">
                        <span className="font-medium">by </span>
                        <Link
                          href={`https://instagram.com/${eventMetadata.mentions[0]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-interactive-1 hover:underline"
                        >
                          @{eventMetadata.mentions[0]}
                        </Link>
                      </div>

                      {/* Additional Mentions */}
                      {eventMetadata.mentions.length > 1 && (
                        <div className="flex flex-wrap items-center gap-1 text-sm text-neutral-2">
                          <span>with </span>
                          {eventMetadata.mentions.slice(1).map((mention, index) => (
                            <span key={mention}>
                              <Link
                                href={`https://instagram.com/${mention}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-interactive-1 hover:underline"
                              >
                                @{mention}
                              </Link>
                              {index < eventMetadata.mentions.length - 2 && ", "}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                {/* Source URLs */}
                {eventMetadata.sourceUrls &&
                  eventMetadata.sourceUrls.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {eventMetadata.sourceUrls.map((url, index) => (
                        <Link
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-sm text-interactive-1 hover:underline"
                        >
                          {url}
                        </Link>
                      ))}
                    </div>
                  )}
              </div>
            )}

            {eventLink ? (
              <a
                href={eventLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-md bg-interactive-1 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-interactive-2"
              >
                View Event
              </a>
            ) : (
              <div className="flex flex-wrap gap-2 pt-2">
                {followButton}
                {editButton}
                {deleteButton}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

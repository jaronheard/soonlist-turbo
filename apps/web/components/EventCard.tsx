"use client";

import React from "react";
import Image from "next/image";
import { CalendarPlus, MapPinned } from "lucide-react";

import type { EventMetadata } from "@soonlist/cal";
import { Card } from "@soonlist/ui/card";

import { getGoogleMapsUrl } from "~/lib/maps";
import { EventMetadataDisplay } from "./EventDisplays";
import LightboxImage from "./LightboxImage";

export default function EventCard(props: {
  eventImage: string | null;
  eventTitle?: string;
  eventName?: string;
  eventDate: string;
  eventTime?: string | React.ReactNode;
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
              <EventMetadataDisplay eventMetadata={eventMetadata} />
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

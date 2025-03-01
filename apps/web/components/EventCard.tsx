"use client";

import Image from "next/image";

import { Card } from "@soonlist/ui/card";

import LightboxImage from "./LightboxImage";

export default function EventCard(props: {
  eventImage: string;
  eventTitle?: string;
  eventName?: string;
  eventDate: string;
  eventTime?: string;
  eventLocation: string;
  eventDescription: string;
  eventLink?: string;
  userAvatar: string;
  userName: string;
  userEmoji?: string;
  shareButton: React.ReactNode;
  calendarButton?: React.ReactNode;
  followButton?: React.ReactNode;
  editButton?: React.ReactNode;
  deleteButton?: React.ReactNode;
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
    userEmoji,
    shareButton,
    calendarButton,
    followButton,
    editButton,
    deleteButton,
  } = props;

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
            <p className="text-sm font-medium text-neutral-2">Saved by</p>
            <p className="text-sm font-semibold text-neutral-1">{userName}</p>
          </div>
        </div>
        <div>{shareButton}</div>
      </div>

      {/* Event Card - Self-contained with just event details */}
      <Card className="overflow-hidden border border-interactive-3 bg-white p-6 shadow-md">
        <div className="space-y-6">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg">
            <LightboxImage
              src={`${eventImage}`}
              alt="Event flyer"
              width={600}
              height={600}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-neutral-1">
              {eventTitle || eventName}
            </h2>

            {/* Date, location, and action buttons moved directly below title */}
            <div className="flex flex-col space-y-4">
              {/* Date/time with larger, bold font */}
              <p className="text-base font-bold text-neutral-1">
                {eventDate}
                {eventTime && `, ${eventTime}`}
              </p>

              {/* Location with regular font */}
              <p className="text-sm text-neutral-2">{eventLocation}</p>

              {/* Faint horizontal divider */}
              <hr className="border-t border-neutral-3/30" />

              {/* Action buttons side by side */}
              {!eventLink && (
                <div className="flex gap-3">
                  {calendarButton}
                  {/* Only show other buttons if they exist */}
                  <div className="flex gap-2">
                    {followButton}
                    {editButton}
                    {deleteButton}
                  </div>
                </div>
              )}
            </div>

            {/* Description moved below the date, location, and action buttons */}
            <p className="text-neutral-1">{eventDescription}</p>

            {/* External link button if provided */}
            {eventLink && (
              <a
                href={eventLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-md bg-interactive-1 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-interactive-2"
              >
                View Event
              </a>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

"use client";

import Image from "next/image";

import { Card } from "@soonlist/ui/card";

export default function EventCard(props: {
  userName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventDescription: string;
  eventImage: string;
  userAvatar: string;
  userEmoji: string;
  calendarButton: React.ReactNode;
  shareButton: React.ReactNode;
  followButton: React.ReactNode;
  editButton: React.ReactNode;
  deleteButton: React.ReactNode;
}) {
  const {
    userName,
    eventName,
    eventDate,
    eventTime,
    eventLocation,
    eventDescription,
    eventImage,
    userAvatar,
    userEmoji,
    calendarButton,
    shareButton,
    followButton,
    editButton,
    deleteButton,
  } = props;

  return (
    <div className="w-full max-w-2xl">
      <Card className="overflow-hidden border-interactive-3 bg-white p-6 shadow-sm">
        {/* User Saved Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-16 w-16 overflow-hidden rounded-full border-4 border-interactive-1">
                <Image
                  src={`${userAvatar}`}
                  alt="User avatar"
                  width={64}
                  height={64}
                  className="object-cover"
                />
              </div>
              {userEmoji && (
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#5a32fb]">
                  <span className="text-lg">{userEmoji}</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-neutral-1">
                @{userName} saved this
              </p>
              <p className="text-sm text-neutral-2">with Soonlist</p>
            </div>
          </div>
          {shareButton}
        </div>

        {/* Event Encapsulation */}
        <div className="relative rounded-lg border-2 border-interactive-2 bg-interactive-3 p-4">
          <div className="absolute -top-3 left-4 rounded bg-interactive-1 px-2 py-1 text-xs text-white">
            Saved Event
          </div>

          {/* Event Image */}
          <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-md">
            <Image
              src={`${eventImage}`}
              alt="Event screenshot"
              fill
              className="object-contain"
            />
          </div>

          {/* Event Details */}
          <div className="space-y-4">
            <div>
              <h2 className="mb-1 text-2xl font-bold leading-tight text-neutral-1">
                {eventName}
              </h2>
              <p className="text-lg text-neutral-2">{eventDate}</p>
            </div>

            <div>
              <p className="text-md font-semibold text-neutral-1">
                {eventTime}
              </p>
              <p className="text-neutral-2">{eventLocation}</p>
            </div>

            <div className="prose prose-sm">
              <p className="text-neutral-2">{eventDescription}</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {calendarButton}
              {followButton}
              {editButton}
              {deleteButton}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

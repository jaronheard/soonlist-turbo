"use client";

import Image from "next/image";
import { EyeIcon } from "lucide-react";

import { Card } from "@soonlist/ui/card";

import LightboxImage from "./LightboxImage";

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
      <Card className="overflow-hidden border border-interactive-3 bg-white p-6 shadow-md">
        {/* Event Content */}
        <div className="space-y-6">
          {/* Curator Banner - Shows who discovered this event */}
          <div className="mb-2 flex w-full items-center justify-between rounded-lg bg-neutral-6 px-4 py-2">
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
                <p className="text-sm font-medium text-neutral-1">
                  <span className="inline-flex items-center">
                    <EyeIcon className="mr-1 h-3.5 w-3.5 text-interactive-1" />
                    Saved by <span className="font-semibold">{userName}</span>
                  </span>
                </p>
              </div>
            </div>
            <div>{shareButton}</div>
          </div>

          {/* Event Image - Lightbox */}
          <div className="relative aspect-square w-full overflow-hidden rounded-lg">
            <LightboxImage
              src={`${eventImage}`}
              alt="Event flyer"
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
// Trigger CI check

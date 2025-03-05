"use client";

import Image from "next/image";
import { CalendarIcon, MapPin } from "lucide-react";

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
            <p className="text-sm font-medium text-neutral-2">Captured by</p>
            <p className="text-sm font-semibold text-neutral-1">{userName}</p>
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
            <div className="flex items-center gap-3 mb-2">
              <div className="flex flex-col items-center justify-center bg-accent-yellow/10 rounded-lg p-2 min-w-16">
                <span className="text-2xl font-bold text-neutral-1">
                  {eventDate.split(" ")[2]}
                </span>
                <span className="text-xs uppercase font-medium text-neutral-2">{`${eventDate.split(" ")[0]} ${eventDate.split(" ")[1]}`}</span>
              </div>
              <div className="flex flex-col">
                {eventTime && (
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1.5 text-neutral-2" />
                    <span className="text-sm font-medium text-neutral-2">
                      {eventTime}
                    </span>
                  </div>
                )}
                {eventLocation && (
                  <div className="flex items-center mt-1">
                    <MapPin className="h-4 w-4 mr-1.5 text-neutral-2" />
                    <span className="text-sm font-medium text-neutral-2">
                      {eventLocation}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-neutral-1">{eventDescription}</p>
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

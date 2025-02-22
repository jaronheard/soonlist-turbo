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
    <div className="grid min-h-screen place-items-center bg-[#fefdf8] p-4">
      <div className="w-full max-w-2xl">
        <Card className="overflow-hidden border-[#e0d9ff] bg-white p-6 shadow-sm">
          {/* User Saved Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-16 w-16 overflow-hidden rounded-full border-4 border-[#5a32fb]">
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
                <p className="text-lg font-semibold text-[#34435f]">
                  @{userName} saved this event
                </p>
                <p className="text-sm text-[#627496]">with soonlist</p>
              </div>
            </div>
            {shareButton}
          </div>

          {/* Event Encapsulation */}
          <div className="relative rounded-lg border-2 border-[#e0d9ff] bg-[#f0ebf8] p-4">
            <div className="absolute -top-3 left-4 rounded bg-[#5a32fb] px-2 py-1 text-xs text-white">
              Saved Event
            </div>

            {/* Event Image */}
            <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-md">
              <Image
                src={`${eventImage}`}
                alt="Event screenshot"
                fill
                className="object-cover"
              />
            </div>

            {/* Event Details */}
            <div className="space-y-4">
              <div>
                <h2 className="mb-1 text-2xl font-bold leading-tight text-[#34435f]">
                  {eventName}
                </h2>
                <p className="text-lg text-[#627496]">{eventDate}</p>
              </div>

              <div>
                <p className="text-md font-semibold text-[#34435f]">
                  {eventTime}
                </p>
                <p className="text-[#627496]">{eventLocation}</p>
              </div>

              <div className="prose prose-sm">
                <p className="text-[#627496]">{eventDescription}</p>
              </div>

              <div className="flex gap-4 pt-2">
                {calendarButton}
                {followButton}
                {editButton}
                {deleteButton}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

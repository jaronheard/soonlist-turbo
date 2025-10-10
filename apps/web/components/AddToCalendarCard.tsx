"use client";

import type { AddToCalendarButtonType } from "add-to-calendar-button-react";
import React, { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { Pencil, Shapes } from "lucide-react";

import type { EventMetadata } from "@soonlist/cal";
import type { ATCBActionEventConfig } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";
import { PLATFORMS } from "@soonlist/cal";
import { cn } from "@soonlist/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@soonlist/ui/card";
import { Input, InputDescription } from "@soonlist/ui/input";
import { Label } from "@soonlist/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@soonlist/ui/select";
import { Textarea } from "@soonlist/ui/textarea";

import { useCroppedImageContext } from "~/context/CroppedImageContext";
import { useNewEventContext } from "~/context/NewEventContext";
import { DEFAULT_TIMEZONE } from "~/lib/constants";
import { CalendarButton } from "./CalendarButton";
import { PublishButton } from "./PublishButton";
import { TimezoneSelect } from "./TimezoneSelect";
import { UpdateButton } from "./UpdateButton";

export type AddToCalendarCardProps = AddToCalendarButtonType & {
  update?: boolean;
  updateId?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children?: React.ReactNode;
  firstInputRef?: React.RefObject<HTMLInputElement | null>;
  setAddToCalendarButtonProps?: (props: AddToCalendarButtonType) => void;
  eventMetadata?: EventMetadata;
  onUpdate?: (props: AddToCalendarButtonType) => void;
  hideFloatingActionButtons?: boolean;
  hideBorder?: boolean;
  hideEventMetadata?: boolean;
  hideSourceLink?: boolean;
};

export function AddToCalendarCard({
  firstInputRef,
  hideBorder,
  hideEventMetadata = false,
  hideSourceLink = false,
  ...initialProps
}: AddToCalendarCardProps) {
  const currentUser = useQuery(api.users.getCurrentUser);
  const { croppedImagesUrls } = useCroppedImageContext();
  const { organizeData } = useNewEventContext();
  const { notes, visibility, lists } = organizeData;

  // TODO: only use croppedImagesUrls if query param is set and same image
  const hasFilePath = croppedImagesUrls.filePath;
  const matchesFilePath = true;
  const hasAllAspectRatios =
    croppedImagesUrls.cropped &&
    croppedImagesUrls.square &&
    croppedImagesUrls.fourThree &&
    croppedImagesUrls.sixteenNine;
  const validImagesFromContext =
    hasFilePath && matchesFilePath && hasAllAspectRatios;

  const imagesFromContext = validImagesFromContext
    ? [
        croppedImagesUrls.square!,
        croppedImagesUrls.fourThree!,
        croppedImagesUrls.sixteenNine!,
        croppedImagesUrls.cropped!,
      ]
    : undefined;

  const removeImage = croppedImagesUrls.deleted;
  // use images from context or initial props
  const images = removeImage ? [] : imagesFromContext || initialProps.images;

  // state
  const [name, setName] = useState(initialProps.name);
  const [location, setLocation] = useState(initialProps.location);
  const [description, setDescription] = useState(initialProps.description);
  const [startDate, setStartDate] = useState(initialProps.startDate);
  const [startTime, setStartTime] = useState(initialProps.startTime);
  const [endDate, setEndDate] = useState(initialProps.endDate);
  const [endTime, setEndTime] = useState(initialProps.endTime);
  const [timeZone, setTimeZone] = useState<string>(
    initialProps.timeZone || DEFAULT_TIMEZONE,
  );
  const [link, setLink] = useState<string>("");
  const [mentions] = useState<string[]>(
    initialProps.eventMetadata?.mentions || [],
  );
  const [platform] = useState<string>(
    initialProps.eventMetadata?.platform || "unknown",
  );
  const [sourceUrls] = useState<string[]>(
    initialProps.eventMetadata?.sourceUrls || [],
  );

  const { listStyle, ...filteredProps } = initialProps;
  const acceptableListStyle = ["overlay", "modal"].includes(listStyle || "")
    ? listStyle
    : undefined;

  const updatedProps = {
    ...filteredProps,
    acceptableListStyle,
    name,
    location,
    description: link
      ? description + "[br][br]" + `[url]${link}|More Info[/url]`
      : description,
    startDate,
    startTime,
    endDate,
    endTime,
    timeZone,
    images,
    eventMetadata: {
      mentions,
      platform,
      sourceUrls,
    },
  };

  useEffect(() => {
    if (initialProps.onUpdate) {
      const updatedProps = {
        ...filteredProps,
        acceptableListStyle,
        name,
        location,
        description: link
          ? description + "[br][br]" + `[url]${link}|More Info[/url]`
          : description,
        startDate,
        startTime,
        endDate,
        endTime,
        timeZone,
        images,
        eventMetadata: {
          mentions,
          platform,
          sourceUrls,
        },
      };

      if (JSON.stringify(initialProps) !== JSON.stringify(updatedProps)) {
        initialProps.onUpdate(updatedProps);
      }
    }
  }, [
    name,
    location,
    description,
    link,
    startDate,
    startTime,
    endDate,
    endTime,
    timeZone,
    images,
    mentions,
    platform,
    sourceUrls,
    initialProps,
    filteredProps,
    acceptableListStyle,
  ]);

  return (
    <Card
      className={cn("max-w-screen sm:max-w-xl", { "border-0": hideBorder })}
    >
      <CardContent className="grid grid-cols-1 gap-6 rounded-md py-6 shadow-md sm:grid-cols-6">
        <CardTitle className="col-span-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="size-6" />
            Edit Event Details
          </div>
        </CardTitle>
        <div className="col-span-full">
          <Label htmlFor="name">Event</Label>
          <Input
            type="text"
            name="name"
            id="name"
            className="font-bold"
            value={name}
            onChange={(e) => setName(e.target.value)}
            ref={firstInputRef}
          />
        </div>
        <div className="col-span-full">
          <Label htmlFor="startDate">Start Date</Label>
          <div>
            <input
              type="date"
              name="startDate"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type="time"
              name="startTime"
              id="startTime"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
        </div>
        <div className="col-span-full">
          <Label htmlFor="endDate">End Date</Label>
          <div>
            <input
              type="date"
              name="endDate"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <input
              type="time"
              name="endTime"
              id="endTime"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
        <div className="col-span-full">
          <Label htmlFor="startDate">Time Zone</Label>
          <div>
            <TimezoneSelect
              timezone={timeZone}
              setTimezone={setTimeZone}
              fullWidth
            />
          </div>
        </div>
        <div className="col-span-full">
          <Label htmlFor="location">Location</Label>
          <Input
            type="text"
            name="location"
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <InputDescription>
            Links to a Google Maps search (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${location}`}
              className="underline"
            >
              preview
            </a>
            )
          </InputDescription>
        </div>
        <div className="col-span-full">
          <Label
            htmlFor="description"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Description
          </Label>
          <Textarea
            id="description"
            name="description"
            rows={6}
            defaultValue={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="p-0.5"></div>
          <InputDescription>
            Uses html psuedocode for formatting. [br] = line break,
            [url]link|link.com[/url] = link.{" "}
            <a
              href="https://add-to-calendar-button.com/configuration#:~:text=for%20Microsoft%20services.-,description,-String"
              target="_blank"
              rel="noreferrer"
              className="text-gray-900 underline"
            >
              More info
            </a>
          </InputDescription>
        </div>
        {!hideEventMetadata && (
          <div className="col-span-full">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Shapes className="mr-2 size-6" />
                    Event Metadata
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="platform">Social Platform</Label>
                  <Select name="platform" value={platform} disabled>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((platform) => (
                        <SelectItem key={platform} value={platform}>
                          <span className="capitalize">{platform}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mentions">Social Mentions</Label>
                  <div className="text-sm text-gray-600">
                    {mentions.length > 0 ? mentions.join(", ") : "None"}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sourceUrls">Source URLs</Label>
                  <div className="text-sm text-gray-600">
                    {sourceUrls.length > 0 ? (
                      <ul className="list-inside list-disc">
                        {sourceUrls.map((url, index) => (
                          <li key={index}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline"
                            >
                              {url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "None"
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {!hideSourceLink && (
          <div className="col-span-full">
            <Label htmlFor="location">Source Link (optional)</Label>
            <Input
              type="url"
              name="link"
              id="link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
        )}
        {!initialProps.onUpdate && !initialProps.hideFloatingActionButtons && (
          <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 transform gap-3">
            {!initialProps.update && (
              <PublishButton
                notes={notes}
                visibility={visibility}
                lists={lists}
                event={updatedProps}
                eventMetadata={updatedProps.eventMetadata}
              />
            )}
            {initialProps.update && initialProps.updateId && (
              <UpdateButton
                id={initialProps.updateId}
                notes={notes}
                visibility={visibility}
                lists={lists}
                event={updatedProps}
                eventMetadata={updatedProps.eventMetadata}
              />
            )}
            <CalendarButton
              event={updatedProps as ATCBActionEventConfig}
              id={initialProps.updateId || undefined}
              username={currentUser?.username || undefined}
              userDisplayName={currentUser?.displayName || undefined}
              type="button"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";
import React, { useState } from "react";
import { Shapes, Text } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { type AddToCalendarButtonType } from "add-to-calendar-button-react";
import { SaveButton } from "./SaveButton";
import { UpdateButton } from "./UpdateButton";
import { Label } from "./ui/label";
import { Input, InputDescription } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { TimezoneSelect } from "./TimezoneSelect";
import { CalendarButton } from "./CalendarButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { InputTags } from "./ui/input-tags";
import { MultiSelect } from "./ui/multiselect";
import { Button } from "./ui/button";
import { useCroppedImageContext } from "@/context/CroppedImageContext";
import { useNewEventContext } from "@/context/NewEventContext";

import {
  EVENT_CATEGORIES,
  EVENT_TYPES,
  type EventMetadata,
  // PLATFORMS,
  PRICE_TYPE,
  ACCESSIBILITY_TYPES_OPTIONS,
} from "@/lib/prompts";
import { feedback } from "@/lib/intercom/intercom";

export type AddToCalendarCardProps = AddToCalendarButtonType & {
  update?: boolean;
  updateId?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children?: React.ReactNode;
  firstInputRef?: React.RefObject<HTMLInputElement>;
  setAddToCalendarButtonProps?: (props: AddToCalendarButtonType) => void;
  eventMetadata?: EventMetadata;
  onUpdate?: (props: AddToCalendarButtonType) => void;
};

export function AddToCalendarCard({
  firstInputRef,
  ...initialProps
}: AddToCalendarCardProps) {
  const { user } = useUser();
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
    initialProps.timeZone || "America/Los_Angeles"
  );
  const [link, setLink] = useState<string>("");
  const [mentions] = useState<string[]>(
    initialProps?.eventMetadata?.mentions || []
  );
  const [source] = useState<string>(
    initialProps?.eventMetadata?.source || "unknown"
  );
  const [priceMin, setPriceMin] = useState<number>(
    initialProps?.eventMetadata?.priceMin || 0
  );
  const [priceMax, setPriceMax] = useState<number>(
    initialProps?.eventMetadata?.priceMax || 0
  );
  const [priceType, setPriceType] = useState<string>(
    initialProps.eventMetadata?.priceType || "unknown"
  );
  const [ageRestriction, setAgeRestriction] = useState(
    (initialProps.eventMetadata?.ageRestriction || "none") as string
  );
  const [category, setCategory] = useState(
    (initialProps?.eventMetadata?.category || "unknown") as string
  );
  const [type, setType] = useState(
    initialProps?.eventMetadata?.type || "event"
  );
  const [performers, setPerformers] = useState(
    initialProps?.eventMetadata?.performers || []
  );
  const [accessibility, setAccessibility] = useState<
    Record<"value" | "label", string>[]
  >(
    initialProps?.eventMetadata?.accessibility
      ? initialProps.eventMetadata.accessibility.map(
          (value) =>
            ACCESSIBILITY_TYPES_OPTIONS.find(
              (option) => option.value === value
            ) as Record<"value" | "label", string>
        )
      : []
  );
  const [accessibilityNotes, setAccessibilityNotes] = useState<string>("");

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
      source,
      priceMin,
      priceMax,
      priceType,
      ageRestriction,
      category,
      type,
      performers,
      accessibility: accessibility.map((a) => a.value),
      accessibilityNotes,
    },
  };

  if (initialProps.onUpdate) {
    // TODO: determine if this is a hack or not
    // do not update unless props are different
    if (JSON.stringify(initialProps) !== JSON.stringify(updatedProps)) {
      initialProps.onUpdate(updatedProps);
    }
  }

  return (
    <Card className="max-w-screen sm:max-w-xl">
      <CardContent className="grid grid-cols-1 gap-6 rounded-md py-6 shadow-md sm:grid-cols-6">
        <CardTitle className="col-span-full flex items-center justify-between">
          <div className="flex items-center">
            <Text className="mr-2 size-6" />
            Event Details
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
                <Label htmlFor="type">Event Type</Label>
                <div className="flex items-center justify-between">
                  <Select name="type" value={type} onValueChange={setType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          <span className="capitalize">{type}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="secondary"
                    size={"sm"}
                    className="ml-2 h-12"
                    onClick={() => feedback("Suggested Event Type")}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <div className="flex items-center justify-between">
                  <Select
                    defaultValue="unknown"
                    name="category"
                    value={category}
                    onValueChange={setCategory}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          <span className="capitalize">{category}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="secondary"
                    size={"sm"}
                    className="ml-2 h-12"
                    onClick={() => feedback("Suggested Event Category")}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price-type">Payment</Label>
                <Select
                  defaultValue="unknown"
                  name="price-type"
                  value={priceType}
                  onValueChange={setPriceType}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Free" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_TYPE.map((priceType) => (
                      <SelectItem key={priceType} value={priceType}>
                        <span className="capitalize">{priceType}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Price Min($)</Label>
                <Input
                  id="price"
                  placeholder="Enter lowest possible price"
                  value={priceMin}
                  // type="number"
                  onChange={(e) => setPriceMin(Number(e.target.value))}
                  className="w-[180px]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Price Max($)</Label>
                <Input
                  id="price"
                  placeholder="Enter highest possible price"
                  value={priceMax}
                  // type="number"
                  onChange={(e) => setPriceMax(Number(e.target.value))}
                  className="w-[180px]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="age-restriction">Ages</Label>
                <Select
                  defaultValue="All Ages"
                  name="age-restriction"
                  value={ageRestriction}
                  onValueChange={setAgeRestriction}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Ages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-ages">All Ages</SelectItem>
                    <SelectItem value="18+">18+</SelectItem>
                    <SelectItem value="21+">21+</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="performers">Performers</Label>
                <InputTags
                  id="performers"
                  placeholder="e.g. @sza, @tylerthecreator"
                  value={performers}
                  onChange={setPerformers}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="performers">Accessibility</Label>
                <MultiSelect
                  options={ACCESSIBILITY_TYPES_OPTIONS}
                  selected={accessibility}
                  onChange={setAccessibility}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="accessibility-notes">Accessibility Notes</Label>
                <Textarea
                  id="accessibility-notes"
                  name="accessibility-notes"
                  rows={3}
                  value={accessibilityNotes}
                  onChange={(e) => setAccessibilityNotes(e.target.value)}
                />
              </div>
              {/* <div className="grid gap-2">
                <Label htmlFor="source">Social Platform</Label>
                <Select name="source" value={source} onValueChange={setSource}>
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
                <InputTags
                  id="mentions"
                  placeholder="e.g. @shad, @vercel"
                  value={mentions}
                  onChange={setMentions}
                />
              </div> */}
            </CardContent>
          </Card>
        </div>
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
        {!initialProps.onUpdate && (
          <div className="flex gap-3">
            {!initialProps.update && (
              <SaveButton
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
              event={updatedProps}
              id={initialProps.updateId || undefined}
              username={user?.username || undefined}
              type="button"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

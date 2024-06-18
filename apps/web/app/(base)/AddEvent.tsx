"use client";

import type { AddToCalendarButtonType } from "add-to-calendar-button-react";
import { useContext, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Image, Text } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@soonlist/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@soonlist/ui/tabs";

import { TextEventForm } from "~/components/TextEventForm";
import { TimezoneContext } from "~/context/TimezoneContext";
import { UploadImageForProcessingButton } from "./UploadImageForProcessingButton";

function SampleEventLink() {
  return (
    <div className="mt-4 text-center">
      <span className="text-muted-foreground">
        Or look at a sample{" "}
        <a
          href="/event/cloqaw5z80001l8086s39cxk3"
          className="font-bold text-interactive-1"
        >
          event
        </a>{" "}
        or{" "}
        <Link
          href="/jaronheard/events"
          className="font-bold text-interactive-1"
        >
          list
        </Link>
        .
      </span>
    </div>
  );
}

export function AddEvent() {
  const router = useRouter();

  // State variables
  const [input, setInput] = useState("");

  // Context variables
  const { timezone } = useContext(TimezoneContext);

  // Helpers
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent the default form submission behavior
    router.push(`/new?rawText=${input}&timezone=${timezone}`);
  };

  return (
    <div className="min-h-[60vh] ">
      <Tabs defaultValue="image" className="w-80 sm:w-96">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="image">
            <Image className="mr-2 size-4" />
            Image
          </TabsTrigger>
          <TabsTrigger value="text">
            <Text className="mr-2 size-4" />
            Text
          </TabsTrigger>
        </TabsList>
        <TabsContent value="image">
          <Card>
            <CardHeader>
              <CardTitle>Image</CardTitle>
              <CardDescription>
                Add an event from a screenshot or poster.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadImageForProcessingButton />
              <SampleEventLink />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="text">
          <Card>
            <CardHeader>
              <CardTitle>Text</CardTitle>
              <CardDescription>
                Add an event from text. Copy/paste, or use your own words.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TextEventForm
                handleInputChange={handleInputChange}
                input={input}
                onSubmit={onSubmit}
              />
              <SampleEventLink />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import type { AddToCalendarButtonType } from "add-to-calendar-button-react";
import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@soonlist/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@soonlist/ui/tabs";

import { Output } from "~/components/Output";
import { TextEventForm } from "~/components/TextEventForm";
import { TimezoneContext } from "~/context/TimezoneContext";
import { UploadImageForProcessingButton } from "./UploadImageForProcessingButton";

export function AddEvent() {
  const router = useRouter();

  // State variables
  const [events, setEvents] = useState<AddToCalendarButtonType[] | null>([]);
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
      <Tabs defaultValue="text" className="max-w-screen sm:max-w-xl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text">
            <Sparkles className="mr-2 size-4" />
            Image/Text
          </TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>
        <TabsContent value="text">
          <Card>
            <CardHeader>
              <CardTitle>Image/Text</CardTitle>
              <CardDescription>
                Add an event from image or an text. We&apos;ll use a little AI
                to figure out the details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadImageForProcessingButton />
              <div className="p-4"></div>
              <TextEventForm
                handleInputChange={handleInputChange}
                input={input}
                onSubmit={onSubmit}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Text</CardTitle>
              <CardDescription>
                Add an event manually by filling out a form.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Output events={events} finished={true} setEvents={setEvents} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useContext, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, LinkIcon, Text } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@soonlist/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@soonlist/ui/tabs";

import { TextEventForm } from "~/components/TextEventForm";
import { UrlEventForm } from "~/components/UrlEventForm";
import {
  UploadOptionsSchema,
  useNewEventProgressContext,
} from "~/context/NewEventProgressContext";
import { TimezoneContext } from "~/context/TimezoneContext";
import { UploadImageForProcessingDropzone } from "./UploadImageForProcessingButton";

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
  const { goToNextStatus, uploadOption, setUploadOption } =
    useNewEventProgressContext();

  // Context variables
  const { timezone } = useContext(TimezoneContext);

  // Helpers
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };
  const onSubmitText = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent the default form submission behavior
    goToNextStatus();
    router.push(`/new?rawText=${input}&timezone=${timezone}`);
  };
  const onSubmitUrl = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent the default form submission behavior
    goToNextStatus();
    router.push(`/new?url=${input}&timezone=${timezone}`);
  };

  return (
    <div className="min-h-[60vh] ">
      <Tabs
        value={uploadOption}
        onValueChange={(value: string) => {
          const parsedValue = UploadOptionsSchema.parse(value);
          setUploadOption(parsedValue);
        }}
        className="w-80 sm:w-96"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="image">
            <Camera className="mr-3 size-6" />
            Image
          </TabsTrigger>
          <TabsTrigger value="text">
            <Text className="mr-3 size-6" />
            Text
          </TabsTrigger>
          <TabsTrigger value="link">
            <LinkIcon className="mr-3 size-6" />
            Link
          </TabsTrigger>
        </TabsList>
        <TabsContent value="image" className="mt-11">
          <UploadImageForProcessingDropzone />
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
                onSubmit={onSubmitText}
              />
              <SampleEventLink />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="link">
          <Card>
            <CardHeader>
              <CardTitle>Link</CardTitle>
              <CardDescription>Add an event from a link.</CardDescription>
            </CardHeader>
            <CardContent>
              <UrlEventForm
                handleInputChange={handleInputChange}
                input={input}
                onSubmit={onSubmitUrl}
              />
              <SampleEventLink />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

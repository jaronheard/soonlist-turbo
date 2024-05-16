"use client";

import type { AddToCalendarButtonType } from "add-to-calendar-button-react";
import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Share, Sparkles } from "lucide-react";

import { Button } from "@soonlist/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@soonlist/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@soonlist/ui/tabs";

import { Output } from "~/components/Output";
import { TextEventForm } from "~/components/TextEventForm";
import { TimezoneContext } from "~/context/TimezoneContext";
import { cn } from "~/lib/utils";
import { UploadImageForProcessingButton } from "./UploadImageForProcessingButton";

function Code({
  children,
  className,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <code
      className={cn(
        "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
        className,
      )}
    >
      {children}
    </code>
  );
}

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="text">
            <Sparkles className="mr-2 size-4" />
            Image/Text
          </TabsTrigger>
          <TabsTrigger value="shortcut">
            <Sparkles className="mr-2 size-4" />
            Shortcut
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
        <TabsContent value="shortcut">
          <Card>
            <CardHeader>
              <CardTitle>Shortcut</CardTitle>
              <CardDescription>
                Add an event from the share menu on iOS or Mac. We&apos;ll use a
                little AI to figure out the details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <a
                  href="https://www.icloud.com/shortcuts/a44e63d78fd44a08b22dcaaea2bfa7f6"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="mr-2 size-4" />
                  Install Soonlist shortcut
                </a>
              </Button>
              <div className="p-3"></div>
              <ol className="flex list-outside list-disc flex-col gap-2">
                <li>
                  Click button above, then click the <Code>Get Shortcut</Code>{" "}
                  button to add it to your devices.
                </li>
                <li>
                  Use{" "}
                  <Code>
                    <Share className="inline-block size-4" /> Share
                  </Code>{" "}
                  on any screenshot, photo, or text.
                </li>
                <li>
                  Scroll down to select <Code>Add to Soonlist</Code>.
                </li>
                <li>
                  Click <Code>Always Allow</Code> when prompted for permissions.
                </li>
                <li>
                  Choose <Code>Add to Soonlist</Code> from the share options.
                </li>
                <li>
                  Edit the event draft and tap <Code>Save</Code>.
                </li>
              </ol>
            </CardContent>
            <CardFooter>
              <CardDescription className="italic">
                *Requires up-to-date software (iOS 17+/macOS 14+)
              </CardDescription>
            </CardFooter>
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

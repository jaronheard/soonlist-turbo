"use client";

import {
  Globe,
  Instagram,
  Mail,
  Phone,
  CheckCircle2,
  CircleDashed,
  Pen,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { type z } from "zod";
import { TabsTrigger, TabsList, TabsContent, Tabs } from "@/components/ui/tabs";
import {
  CardTitle,
  CardDescription,
  CardHeader,
  CardContent,
  Card,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { api } from "@/trpc/react";
import { userAdditionalInfoSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function OnboardingTabs({
  additionalInfo,
}: {
  additionalInfo: z.infer<typeof userAdditionalInfoSchema>;
}) {
  const [activeTab, setActiveTab] = useState("profile");

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <Tabs
      className="w-full max-w-3xl"
      defaultValue="profile"
      value={activeTab}
      onValueChange={handleTabChange}
    >
      <TabsList className="grid grid-cols-2">
        <TabsTrigger className="relative" value="profile">
          <ProgressIcon status="complete"></ProgressIcon>
          <span className="block text-sm font-medium">Profile</span>
        </TabsTrigger>
        <TabsTrigger className="relative" value="setup">
          <ProgressIcon status="active"></ProgressIcon>
          <span className="block text-sm font-medium">Get Started</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <Card className="w-full max-w-3xl">
          <CardHeader className="space-y-1">
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Tell people about yourself and how to connect!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <UserProfileForm
              defaultValues={additionalInfo}
              onSubmitSuccess={() => {
                scrollTo(0, 0);
                handleTabChange("setup");
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="setup">
        <Card className="w-full max-w-3xl">
          <CardHeader className="space-y-1">
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Install the shortcut and start creating events!
            </CardDescription>
          </CardHeader>
          <CardContent className="prose space-y-6">
            <ol>
              <li>
                <p className="font-bold">Ensure your device is up to date</p>
                <p>
                  To use the iOS/MacOS Shortcut, you must have the latest major
                  version of{" "}
                  <a
                    href="https://support.apple.com/en-us/HT201685"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    iOS (&gt;17)
                  </a>{" "}
                  or{" "}
                  <a
                    href="https://support.apple.com/en-us/109033"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    MacOS (&gt;14)
                  </a>{" "}
                  installed.
                </p>
              </li>
              <li>
                <p className="font-bold">Install the iOS/MacOS Shortcut</p>
                <Button asChild size={"sm"} variant={"secondary"}>
                  <a
                    href="https://www.icloud.com/shortcuts/a44e63d78fd44a08b22dcaaea2bfa7f6"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline"
                  >
                    Download shortcut
                  </a>
                </Button>
              </li>
              <li>
                <p className="font-bold">Test the iOS/MacOS Shortcut</p>
                <Button size="sm" asChild>
                  <a
                    href="shortcuts://run-shortcut?name=Add%20to%20Soonlist&input=Test%20event%20that%20proves%20your%20shortcut%20is%20working%20at%20the%20School%20of%20Art%20and%20Time%203340%20SE%20Morrison%20on%20Saturday%20February%2017%20from%206pm%20to%209pm%20Text%20Jaron%20at%209719987180%20for%20access%20instructions"
                    className="no-underline"
                  >
                    Test shortcut
                  </a>
                </Button>
                <p>This will create your first Soonlist event!</p>
              </li>
            </ol>
            <p>
              If you are encountering any issues, please send us a message via
              the chat widget.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export function UserProfileForm({
  defaultValues,
  onSubmitSuccess,
}: {
  onSubmitSuccess: () => void;
  defaultValues: z.infer<typeof userAdditionalInfoSchema>;
}) {
  const router = useRouter();
  const form = useForm({
    defaultValues: defaultValues,
    resolver: zodResolver(userAdditionalInfoSchema),
  });

  const updateAdditionalInfo = api.user.updateAdditionalInfo.useMutation({
    onError: () => {
      toast.error("Bio and public contact info not saved. Please try again.");
    },
    onSuccess: () => {
      toast.success("Bio and public contact info saved.");
      router.refresh();
      onSubmitSuccess();
    },
  });

  function onSubmit(values: z.infer<typeof userAdditionalInfoSchema>) {
    updateAdditionalInfo.mutate(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter your bio (max 150 characters)"
                    className="h-[200px] min-h-[200px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Example: I love ambient music, creative community building,
                  and vegan pop-ups.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Card className="my-4">
          <CardHeader>
            <CardTitle>How to connect</CardTitle>
            <CardDescription>
              Share any contact info you&apos;d like visible publicly so others
              can connect with you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="publicEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Mail className="size-4" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="publicPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Phone className="size-4" />
                      Phone
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="publicInsta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Instagram className="size-4" />
                      Instagram
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="publicWebsite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Globe className="size-4" />
                      Website
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="www.example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
        <Button type="submit">Next</Button>
      </form>
    </Form>
  );
}
export function ProgressIcon({
  status,
  className,
}: {
  status: "complete" | "active" | "incomplete";
  className?: string;
}) {
  const commonClasses = "mr-2 size-4";

  if (status === "complete") {
    return <CheckCircle2 className={cn(commonClasses, className)} />;
  }
  if (status === "active") {
    return <Pen className={cn(commonClasses, className)} />;
  }
  if (status === "incomplete") {
    return <CircleDashed className={cn(commonClasses, className)} />;
  }
  return null;
}

"use client";

import type { z } from "zod";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarPlus,
  CheckCircle2,
  CircleDashed,
  Globe,
  Instagram,
  Mail,
  Pen,
  Phone,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@soonlist/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@soonlist/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@soonlist/ui/form";
import { Input } from "@soonlist/ui/input";
import { Textarea } from "@soonlist/ui/textarea";
import { userAdditionalInfoSchema } from "@soonlist/validators";

import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export function OnboardingTabs({
  additionalInfo,
}: {
  additionalInfo: z.infer<typeof userAdditionalInfoSchema>;
}) {
  const router = useRouter();

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader className="space-y-1">
        <CardTitle>Public Profile</CardTitle>
        <CardDescription>
          This information will be shown on events you create.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <UserProfileForm
          defaultValues={additionalInfo}
          onSubmitSuccess={() => router.push("/account/plans")}
        />
      </CardContent>
    </Card>
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
      toast.error("Public profile not saved. Please try again.");
    },
    onSuccess: () => {
      toast.success("Public profile saved.");
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
              Share any contact info you want visible publicly.
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
        <Button type="submit" size="lg">
          <CalendarPlus className="mr-2 size-4"></CalendarPlus>
          Choose your plan
        </Button>
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

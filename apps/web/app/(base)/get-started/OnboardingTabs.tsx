"use client";

import type { z } from "zod";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Globe, Instagram, Mail, Pen, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@soonlist/ui/button";
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

import { api } from "~/trpc/react";

export function OnboardingTabs({
  additionalInfo,
}: {
  additionalInfo: z.infer<typeof userAdditionalInfoSchema>;
}) {
  return <UserProfileForm defaultValues={additionalInfo} />;
}

function UserProfileForm({
  defaultValues,
}: {
  defaultValues: z.infer<typeof userAdditionalInfoSchema>;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormChanged, setIsFormChanged] = useState(false);
  const form = useForm({
    defaultValues: defaultValues,
    resolver: zodResolver(userAdditionalInfoSchema),
  });

  const updateAdditionalInfo = api.user.updateAdditionalInfo.useMutation({
    onMutate: () => {
      setIsSubmitting(true);
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast.error(`Public profile not saved: ${error.message}`);
    },
    onSuccess: () => {
      setIsSubmitting(false);
      toast.success("Public profile saved.");
      router.refresh(); // Refresh the page to reflect the changes
    },
  });

  function onSubmit(values: z.infer<typeof userAdditionalInfoSchema>) {
    updateAdditionalInfo.mutate(values);
  }

  const renderIcon = (
    value: string | undefined,
    defaultValue: string | undefined,
  ) => {
    if (value && value === defaultValue) {
      return <Check className="ml-2 h-4 w-4 text-green-500" />;
    } else if (value && value !== defaultValue) {
      return <Pen className="ml-2 h-4 w-4 text-blue-500" />;
    }
    return null;
  };

  useEffect(() => {
    const subscription = form.watch((value) => {
      const isChanged = Object.keys(value).some(
        (key) =>
          value[key as keyof typeof value] !==
          defaultValues[key as keyof typeof defaultValues],
      );
      setIsFormChanged(isChanged);
    });
    return () => subscription.unsubscribe();
  }, [form, defaultValues]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                Bio
                {renderIcon(field.value, defaultValues.bio)}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter your bio (max 150 characters)"
                  className="h-[200px] min-h-[200px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Example: I love ambient music, creative community building, and
                vegan pop-ups.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">How to connect</h3>
          <p className="text-sm text-muted-foreground">
            Share any contact info you want visible publicly.
          </p>
          <FormField
            control={form.control}
            name="publicEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  <Mail className="size-4" />
                  Email
                  {renderIcon(field.value, defaultValues.publicEmail)}
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
                  {renderIcon(field.value, defaultValues.publicPhone)}
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
                  {renderIcon(field.value, defaultValues.publicInsta)}
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
                  {renderIcon(field.value, defaultValues.publicWebsite)}
                </FormLabel>
                <FormControl>
                  <Input placeholder="www.example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isSubmitting || !isFormChanged}>
          {isSubmitting ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </Form>
  );
}

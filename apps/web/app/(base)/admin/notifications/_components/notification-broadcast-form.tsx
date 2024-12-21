"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { useToast } from "@soonlist/ui/use-toast";

import { api } from "~/trpc/react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Message body is required"),
  data: z.string().optional(),
  adminSecret: z.string().min(1, "Admin secret is required"),
});

interface ToastApi {
  toast: (props: Toast) => void;
}

export function NotificationBroadcastForm() {
  const { toast } = useToast() as ToastApi;
  const [isSending, setIsSending] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      body: "",
      data: "",
      adminSecret: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSending(true);
      const data: Record<string, unknown> = {};
      try {
        if (values.data) {
          Object.assign(data, JSON.parse(values.data));
        }
      } catch (e) {
        toast({
          title: "Invalid JSON in data field",
          description: "Please check the data field format",
          variant: "destructive",
        });
        return;
      }

      await api.notification.broadcastToAllUsers.mutate({
        title: values.title,
        body: values.body,
        data,
        adminSecret: values.adminSecret,
      });

      toast({
        title: "Notification sent successfully",
        description: "The notification has been broadcast to all users",
      });

      form.reset();
    } catch (error) {
      toast({
        title: "Error sending notification",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Notification title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notification message"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="data"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='{"url": "/some-path", "type": "feature-announcement"}'
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Additional data in JSON format (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="adminSecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Admin Secret</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSending}>
          {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSending ? "Sending..." : "Send Notification"}
        </Button>
      </form>
    </Form>
  );
}

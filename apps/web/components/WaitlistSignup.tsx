"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, TicketPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@soonlist/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@soonlist/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@soonlist/ui/drawer";
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

import { api } from "~/trpc/react";

export function useMediaQuery(query: string) {
  const [value, setValue] = useState(false);

  useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches);
    }

    const result = matchMedia(query);
    result.addEventListener("change", onChange);
    setValue(result.matches);

    return () => result.removeEventListener("change", onChange);
  }, [query]);

  return value;
}

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email.",
  }),
  zipcode: z.string().min(5, {
    message: "Zipcode must be at least 5 characters.",
  }),
});

export function WaitlistSignup({ afterSubmit }: { afterSubmit: () => void }) {
  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      zipcode: "",
      // why: "",
    },
  });

  const waitlistSignup = api.waitlist.create.useMutation({
    onError: () => {
      toast.error("❣️ You're already on the list!");
    },
    onSuccess: () => {
      form.reset();
      toast.success("🎉 You're on the list!");
    },
  });
  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof formSchema>) {
    afterSubmit();
    waitlistSignup.mutate(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="" {...field} />
              </FormControl>
              <FormDescription>Your email</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="zipcode"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Postal Code</FormLabel>
              <FormControl>
                <Input placeholder="" {...field} />
              </FormControl>
              <FormDescription>Your area</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit">
          <ClipboardList className="mr-2 size-4"></ClipboardList>
          Get on the list
        </Button>
      </form>
    </Form>
  );
}

export function WaitlistButtonWithDrawer({
  size = "default",
}: {
  size?: "sm" | "lg" | "default";
}) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size={size}>
            <TicketPlus className="mr-2 size-4"></TicketPlus>
            Join waitlist
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Join the waitlist</DialogTitle>
            <DialogDescription>
              Be one of the first to get early access.
            </DialogDescription>
          </DialogHeader>
          <WaitlistSignup afterSubmit={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size={size}>
          <TicketPlus className="mr-1.5 size-4 rotate-[-20deg]"></TicketPlus>
          Join waitlist
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Join the waitlist</DrawerTitle>
          <DrawerDescription>
            Be one of the first to get early access.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <WaitlistSignup afterSubmit={() => setOpen(false)} />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

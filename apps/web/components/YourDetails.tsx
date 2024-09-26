"use client";

import * as React from "react";
import { SignedIn } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { EyeOff, Globe2, PenSquare, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import type { List } from "@soonlist/db/types";
import { Button } from "@soonlist/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@soonlist/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@soonlist/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@soonlist/ui/form";
import { MultiSelect } from "@soonlist/ui/multiselect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@soonlist/ui/select";
import { Textarea } from "@soonlist/ui/textarea";

import { useNewEventContext } from "~/context/NewEventContext";
import { AddListCard } from "./AddListCard";

export const organizeFormSchema = z.object({
  notes: z.string().optional(),
  visibility: z.enum(["public", "private"]),
  lists: z.array(z.record(z.string().trim())),
});

export function YourDetails({
  lists,
  comment,
  visibility,
  eventLists,
}: {
  lists?: List[];
  comment?: string;
  visibility?: "public" | "private";
  eventLists?: List[];
}) {
  const listOptions = lists?.map((list) => ({
    label: list.name,
    value: list.id,
  }));
  const eventListOptions = eventLists?.map((list) => ({
    label: list.name,
    value: list.id,
  }));

  // 1. Define your form.
  const form = useForm<z.infer<typeof organizeFormSchema>>({
    resolver: zodResolver(organizeFormSchema),
    defaultValues: {
      notes: comment || "",
      visibility: visibility || "public",
      lists: eventListOptions || [],
    },
  });

  const { setOrganizeData } = useNewEventContext(); // Use the context

  // set initial form state in context
  React.useEffect(() => {
    setOrganizeData(form.getValues());
  }, [form, setOrganizeData]);

  // Watch for changes in the form
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name) {
        setOrganizeData(form.getValues());
      }
    });
    return () => subscription.unsubscribe();
  }, [form, setOrganizeData]);

  return (
    <SignedIn>
      <Card className="max-w-screen w-full sm:max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <PenSquare className="mr-2 size-6" />
            My Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="lists"
                render={({ field: { ...field } }) => (
                  <FormItem>
                    <FormLabel>Lists</FormLabel>
                    <MultiSelect
                      selected={field.value}
                      options={listOptions || []}
                      placeholder="All Events"
                      AdditionalPopoverAction={() => (
                        <Dialog>
                          <DialogTrigger className="w-full p-1">
                            <Button size="sm" className="w-full rounded-sm">
                              <Plus className="-ml-2 mr-2 size-4" />
                              New List
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add a new list</DialogTitle>
                              <DialogDescription>
                                <AddListCard
                                  name=""
                                  description=""
                                  visibility="public"
                                  afterSuccessFunction={() => null}
                                />
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      )}
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Note</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Example: My friend Sarah hosts this dance party every year and its so fun!"
                        defaultValue={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Add a personal note about this event for others to see.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Public" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="public">
                          <Globe2 className="mr-2 inline size-4" />
                          Discoverable
                        </SelectItem>
                        <SelectItem value="private">
                          <EyeOff className="mr-2 inline size-4" />
                          Not Discoverable
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>
    </SignedIn>
  );
}

"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { SignedIn } from "@clerk/nextjs";
import { PenSquare, Plus } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { AddListCard } from "./AddListCard";
import { type List } from "@/server/db/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormLabel,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNewEventContext } from "@/context/NewEventContext";
import { MultiSelect } from "@/components/ui/multiselect";

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
            <form className="space-y-4">
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
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </form>
          </Form>
        </CardContent>
      </Card>
    </SignedIn>
  );
}

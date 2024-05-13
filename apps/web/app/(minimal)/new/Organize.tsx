"use client";

import type { useForm } from "react-hook-form";
import type { z } from "zod";
import * as React from "react";
import { SignedIn } from "@clerk/nextjs";
import { ListIcon, Plus } from "lucide-react";

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

import type { organizeFormSchema } from "~/components/YourDetails";
import { AddListCard } from "~/components/AddListCard";

export function Organize({
  form,
  lists,
}: {
  form: ReturnType<typeof useForm<z.infer<typeof organizeFormSchema>>>;
  lists?: List[];
}) {
  const listOptions = lists
    ?.map((list) => ({
      label: list.name,
      value: list.id,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <SignedIn>
      <Card className="max-w-screen w-full sm:max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ListIcon className="mr-2 size-6" />
            Save to List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Note (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Example: My friend Sarah hosts this dance party every year and its so fun!"
                        defaultValue={field.value}
                        onChange={field.onChange}
                        rows={5}
                      />
                    </FormControl>
                    <FormDescription>
                      Write something personal about this event
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lists"
                render={({ field: { ...field } }) => (
                  <FormItem>
                    <FormLabel>Choose a list</FormLabel>
                    <MultiSelect
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
                      selected={field.value}
                      options={listOptions || []}
                      placeholder="All Events"
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem className="">
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
                        <SelectItem value="private">Unlisted</SelectItem>
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

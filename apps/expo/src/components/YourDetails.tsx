import React from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useNewEventContext } from "~/context/NewEventContext";

// Assuming this is the path to your Select components

const organizeFormSchema = z.object({
  notes: z.string().optional(),
  visibility: z.enum(["public", "private"]),
  list: z.string(),
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

  const form = useForm({
    resolver: zodResolver(organizeFormSchema),
    defaultValues: {
      notes: comment || "",
      visibility: visibility || "public",
    },
  });
  const { setOrganizeData } = useNewEventContext();

  React.useEffect(() => {
    setOrganizeData(form.getValues());
  }, [form, setOrganizeData]);

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <View className="mb-4">
        <Text className="mb-2 text-lg font-bold">My Details</Text>

        {/* Visibility Select */}
        <View className="mb-4">
          <Text className="mb-2">Visibility</Text>
          <Select
            value={form.watch("visibility")}
            onValueChange={(value) => form.setValue("visibility", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem label="Public" value="public" />
              <SelectItem label="Private" value="private" />
            </SelectContent>
          </Select>
        </View>

        {/* List Select */}
        <View className="mb-4">
          <Text className="mb-2">List</Text>
          <Select
            value={form.watch("list")}
            onValueChange={(value) => form.setValue("list", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select List" />
            </SelectTrigger>
            <SelectContent>
              {listOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </SelectContent>
          </Select>
        </View>

        {/* Notes Input */}
        <View className="mb-4">
          <Text className="mb-2">Your Note</Text>
          <TextInput
            className="border border-gray-300 p-2"
            multiline
            numberOfLines={4}
            placeholder="Example: My friend Sarah hosts this dance party every year and it's so fun!"
            onChangeText={(text) => form.setValue("notes", text)}
            value={form.watch("notes")}
          />
        </View>
      </View>
    </ScrollView>
  );
}

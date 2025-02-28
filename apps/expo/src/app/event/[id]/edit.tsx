import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Clock, Image as ImageIcon } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner-native";
import { z } from "zod";

import { Button } from "~/components/Button";
import LoadingSpinner from "~/components/LoadingSpinner";
import { api } from "~/utils/api";

// Define the form schema based on the event update schema
const formSchema = z.object({
  event: z.object({
    name: z.string().min(1, "Event name is required"),
    description: z.string().optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    timeZone: z.string().optional(),
    location: z.string().optional(),
    images: z.array(z.string()).optional(),
  }),
  eventMetadata: z.object({
    eventType: z.string().optional(),
    eventCategory: z.string().optional(),
    priceType: z.string().optional(),
    price: z.string().optional(),
    ageRestriction: z.string().optional(),
    performers: z.string().optional(),
    accessibility: z.string().optional(),
  }),
  comment: z.string().optional(),
  lists: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  visibility: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  // We need the user for authorization checks in the future
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // State for date and time pickers
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Fetch the event data
  const eventQuery = api.event.get.useQuery(
    { eventId: id || "" },
    {
      enabled: Boolean(id),
    },
  );

  // Update event mutation
  const updateEventMutation = api.event.update.useMutation({
    onMutate: () => setIsSubmitting(true),
    onSettled: () => setIsSubmitting(false),
    onSuccess: () => {
      toast.success("Event updated successfully");
      router.back();
    },
    onError: (error) => {
      toast.error("Failed to update event", {
        description: error.message,
      });
    },
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
  });

  // Initialize form with event data when it's loaded
  useEffect(() => {
    if (eventQuery.data) {
      const event = eventQuery.data;
      // Define the event data with proper types
      const eventData = event.event || {
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
        timeZone: "",
        location: "",
        images: [] as string[],
      };

      // Define the event metadata with proper types
      const eventMetadata = event.eventMetadata || {
        eventType: "",
        eventCategory: "",
        priceType: "",
        price: "",
        ageRestriction: "",
        performers: "",
        accessibility: [] as string[],
      };

      // Type assertion to help TypeScript understand the structure
      const typedEventData = eventData as {
        name?: string;
        description?: string;
        startDate?: string;
        endDate?: string;
        startTime?: string;
        endTime?: string;
        timeZone?: string;
        location?: string;
        images?: string[];
      };

      const typedEventMetadata = eventMetadata as {
        eventType?: string;
        eventCategory?: string;
        priceType?: string;
        price?: string;
        ageRestriction?: string;
        performers?: string;
        accessibility?: string[];
      };

      reset({
        event: {
          name: typedEventData.name || "",
          description: typedEventData.description || "",
          startDate: typedEventData.startDate || "",
          endDate: typedEventData.endDate || "",
          startTime: typedEventData.startTime || "",
          endTime: typedEventData.endTime || "",
          timeZone: typedEventData.timeZone || "",
          location: typedEventData.location || "",
          images: typedEventData.images || [],
        },
        eventMetadata: {
          eventType: typedEventMetadata.eventType || "",
          eventCategory: typedEventMetadata.eventCategory || "",
          priceType: typedEventMetadata.priceType || "",
          price: typedEventMetadata.price || "",
          ageRestriction: typedEventMetadata.ageRestriction || "",
          performers: typedEventMetadata.performers || "",
          accessibility: Array.isArray(typedEventMetadata.accessibility)
            ? typedEventMetadata.accessibility.join(", ")
            : "",
        },
        comment: "",
        lists: [],
        visibility: event.visibility || "",
      });

      // Set the selected image if there are images
      if (
        typedEventData.images &&
        typedEventData.images.length > 0 &&
        typedEventData.images[0]
      ) {
        setSelectedImage(typedEventData.images[0]);
      }
    }
  }, [eventQuery.data, reset, setSelectedImage]);

  // Handle image picking
  const pickImage = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== ImagePicker.PermissionStatus.GRANTED) {
        toast.error("Permission to access media library is required");
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (
        !result.canceled &&
        result.assets &&
        result.assets.length > 0 &&
        result.assets[0]?.uri
      ) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      toast.error("Failed to pick image");
    }
  };

  // Handle form submission
  const onSubmit = useCallback(
    async (data: FormData) => {
      if (!id) return;

      const loadingToastId = toast.loading("Updating event...");
      try {
        // Format accessibility as an array if it's a string
        const accessibilityArray = data.eventMetadata.accessibility
          ? data.eventMetadata.accessibility
              .split(",")
              .map((item) => item.trim())
          : [];

        // Format performers as an array if it's a string
        const performersArray = data.eventMetadata.performers
          ? data.eventMetadata.performers.split(",").map((item) => item.trim())
          : [];

        // Prepare the event data in the format expected by the API
        const updatedData = {
          id,
          event: {
            ...data.event,
            images: selectedImage ? [selectedImage] : [],
          },
          eventMetadata: {
            ...data.eventMetadata,
            accessibility: accessibilityArray,
            performers: performersArray,
          },
          comment: data.comment || "",
          lists: [{}],
          visibility:
            data.visibility === "public"
              ? ("public" as const)
              : data.visibility === "private"
                ? ("private" as const)
                : ("public" as const),
        };

        await updateEventMutation.mutateAsync(updatedData);
        toast.dismiss(loadingToastId);
      } catch (error) {
        console.error("Error updating event:", error);
        toast.dismiss(loadingToastId);
      }
    },
    [id, updateEventMutation, selectedImage],
  );

  // Early return if the 'id' is missing or invalid
  if (!id || typeof id !== "string") {
    return (
      <>
        <Stack.Screen options={{ headerRight: () => null }} />
        <View className="flex-1 bg-white">
          <Text>Invalid or missing event id</Text>
        </View>
      </>
    );
  }

  // Loading state
  if (eventQuery.isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerRight: () => null }} />
        <View className="flex-1 bg-white">
          <LoadingSpinner />
        </View>
      </>
    );
  }

  // Not found or error
  if (!eventQuery.data) {
    return (
      <>
        <Stack.Screen options={{ headerRight: () => null }} />
        <View className="flex-1 bg-white">
          <Text>Event not found</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Edit Event",
          headerBackTitle: "Back",
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          className="flex-1 bg-white"
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 36,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-col gap-4 space-y-6">
            <View>
              <Text className="text-lg font-semibold">Event Details</Text>
            </View>

            {/* Event Name */}
            <Controller
              control={control}
              name="event.name"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="mb-2 text-base font-semibold">
                    Event Name
                  </Text>
                  <TextInput
                    autoComplete="off"
                    autoCorrect={false}
                    defaultValue={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter event name"
                    className="h-10 rounded-md border border-neutral-300 px-3 py-2"
                  />
                  {errors.event?.name && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.event.name.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Event Description */}
            <Controller
              control={control}
              name="event.description"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="mb-2 text-base font-semibold">
                    Description
                  </Text>
                  <TextInput
                    autoComplete="off"
                    autoCorrect={false}
                    defaultValue={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter event description"
                    multiline
                    className="h-24 rounded-md border border-neutral-300 px-3 py-2"
                  />
                  {errors.event?.description && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.event.description.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Event Location */}
            <Controller
              control={control}
              name="event.location"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="mb-2 text-base font-semibold">Location</Text>
                  <TextInput
                    autoComplete="off"
                    autoCorrect={false}
                    defaultValue={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter event location"
                    className="h-10 rounded-md border border-neutral-300 px-3 py-2"
                  />
                  {errors.event?.location && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.event.location.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Date Pickers */}
            <View>
              <Text className="mb-2 text-lg font-semibold">
                Date &amp; Time
              </Text>
            </View>

            {/* Start Date */}
            <Controller
              control={control}
              name="event.startDate"
              render={({ field: { onChange, value } }) => {
                const date = value ? new Date(value) : new Date();

                return (
                  <View>
                    <Text className="mb-2 text-base font-semibold">
                      Start Date
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowStartDatePicker(true)}
                      className="flex-row items-center justify-between rounded-md border border-neutral-300 px-3 py-2"
                    >
                      <Text>{value || "Select start date"}</Text>
                      <Calendar size={20} color="#000" />
                    </TouchableOpacity>
                    {errors.event?.startDate && (
                      <Text className="mt-1 text-xs text-red-500">
                        {errors.event.startDate.message}
                      </Text>
                    )}
                    {showStartDatePicker && (
                      <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={(
                          event: DateTimePickerEvent,
                          selectedDate?: Date,
                        ) => {
                          setShowStartDatePicker(false);
                          if (selectedDate) {
                            const formattedDate = selectedDate
                              .toISOString()
                              .split("T")[0];
                            onChange(formattedDate);
                          }
                        }}
                      />
                    )}
                  </View>
                );
              }}
            />

            {/* End Date */}
            <Controller
              control={control}
              name="event.endDate"
              render={({ field: { onChange, value } }) => {
                const date = value ? new Date(value) : new Date();

                return (
                  <View>
                    <Text className="mb-2 text-base font-semibold">
                      End Date
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowEndDatePicker(true)}
                      className="flex-row items-center justify-between rounded-md border border-neutral-300 px-3 py-2"
                    >
                      <Text>{value || "Select end date"}</Text>
                      <Calendar size={20} color="#000" />
                    </TouchableOpacity>
                    {errors.event?.endDate && (
                      <Text className="mt-1 text-xs text-red-500">
                        {errors.event.endDate.message}
                      </Text>
                    )}
                    {showEndDatePicker && (
                      <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={(
                          event: DateTimePickerEvent,
                          selectedDate?: Date,
                        ) => {
                          setShowEndDatePicker(false);
                          if (selectedDate) {
                            const formattedDate = selectedDate
                              .toISOString()
                              .split("T")[0];
                            onChange(formattedDate);
                          }
                        }}
                      />
                    )}
                  </View>
                );
              }}
            />

            {/* Start Time */}
            <Controller
              control={control}
              name="event.startTime"
              render={({ field: { onChange, value } }) => {
                const time = value
                  ? new Date(`2000-01-01T${value}:00`)
                  : new Date();

                return (
                  <View>
                    <Text className="mb-2 text-base font-semibold">
                      Start Time
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowStartTimePicker(true)}
                      className="flex-row items-center justify-between rounded-md border border-neutral-300 px-3 py-2"
                    >
                      <Text>{value || "Select start time"}</Text>
                      <Clock size={20} color="#000" />
                    </TouchableOpacity>
                    {errors.event?.startTime && (
                      <Text className="mt-1 text-xs text-red-500">
                        {errors.event.startTime.message}
                      </Text>
                    )}
                    {showStartTimePicker && (
                      <DateTimePicker
                        value={time}
                        mode="time"
                        display="default"
                        onChange={(
                          event: DateTimePickerEvent,
                          selectedTime?: Date,
                        ) => {
                          setShowStartTimePicker(false);
                          if (selectedTime) {
                            const hours = selectedTime
                              .getHours()
                              .toString()
                              .padStart(2, "0");
                            const minutes = selectedTime
                              .getMinutes()
                              .toString()
                              .padStart(2, "0");
                            onChange(`${hours}:${minutes}`);
                          }
                        }}
                      />
                    )}
                  </View>
                );
              }}
            />

            {/* End Time */}
            <Controller
              control={control}
              name="event.endTime"
              render={({ field: { onChange, value } }) => {
                const time = value
                  ? new Date(`2000-01-01T${value}:00`)
                  : new Date();

                return (
                  <View>
                    <Text className="mb-2 text-base font-semibold">
                      End Time
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowEndTimePicker(true)}
                      className="flex-row items-center justify-between rounded-md border border-neutral-300 px-3 py-2"
                    >
                      <Text>{value || "Select end time"}</Text>
                      <Clock size={20} color="#000" />
                    </TouchableOpacity>
                    {errors.event?.endTime && (
                      <Text className="mt-1 text-xs text-red-500">
                        {errors.event.endTime.message}
                      </Text>
                    )}
                    {showEndTimePicker && (
                      <DateTimePicker
                        value={time}
                        mode="time"
                        display="default"
                        onChange={(
                          event: DateTimePickerEvent,
                          selectedTime?: Date,
                        ) => {
                          setShowEndTimePicker(false);
                          if (selectedTime) {
                            const hours = selectedTime
                              .getHours()
                              .toString()
                              .padStart(2, "0");
                            const minutes = selectedTime
                              .getMinutes()
                              .toString()
                              .padStart(2, "0");
                            onChange(`${hours}:${minutes}`);
                          }
                        }}
                      />
                    )}
                  </View>
                );
              }}
            />

            {/* Time Zone */}
            <Controller
              control={control}
              name="event.timeZone"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="mb-2 text-base font-semibold">
                    Time Zone
                  </Text>
                  <TextInput
                    autoComplete="off"
                    autoCorrect={false}
                    defaultValue={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. America/Los_Angeles"
                    className="h-10 rounded-md border border-neutral-300 px-3 py-2"
                  />
                  {errors.event?.timeZone && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.event.timeZone.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Image Upload */}
            <View>
              <Text className="mb-2 text-lg font-semibold">Event Image</Text>
              <View className="mt-2">
                {selectedImage ? (
                  <View className="rounded-md border border-neutral-300 p-2">
                    <ExpoImage
                      source={{ uri: selectedImage }}
                      style={{ width: "100%", height: 200 }}
                      contentFit="cover"
                      className="rounded-md"
                    />
                    <View className="mt-2 flex-row justify-between">
                      <Button
                        onPress={pickImage}
                        variant="secondary"
                        className="flex-1 mr-2"
                      >
                        Replace
                      </Button>
                      <Button
                        onPress={() => setSelectedImage(null)}
                        variant="destructive"
                        className="flex-1"
                      >
                        Remove
                      </Button>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={pickImage}
                    className="flex-row items-center justify-center rounded-md border border-dashed border-neutral-300 p-6"
                  >
                    <View className="items-center">
                      <ImageIcon size={32} color="#666" />
                      <Text className="mt-2 text-center text-neutral-600">
                        Tap to add an image
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Event Metadata */}
            <View>
              <Text className="mb-2 text-lg font-semibold">Event Details</Text>
            </View>

            {/* Event Type */}
            <Controller
              control={control}
              name="eventMetadata.eventType"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="mb-2 text-base font-semibold">
                    Event Type
                  </Text>
                  <TextInput
                    autoComplete="off"
                    autoCorrect={false}
                    defaultValue={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. Concert, Workshop, Conference"
                    className="h-10 rounded-md border border-neutral-300 px-3 py-2"
                  />
                  {errors.eventMetadata?.eventType && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.eventMetadata.eventType.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Event Category */}
            <Controller
              control={control}
              name="eventMetadata.eventCategory"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="mb-2 text-base font-semibold">Category</Text>
                  <TextInput
                    autoComplete="off"
                    autoCorrect={false}
                    defaultValue={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. Music, Art, Technology"
                    className="h-10 rounded-md border border-neutral-300 px-3 py-2"
                  />
                  {errors.eventMetadata?.eventCategory && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.eventMetadata.eventCategory.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Price Type */}
            <Controller
              control={control}
              name="eventMetadata.priceType"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="mb-2 text-base font-semibold">
                    Price Type
                  </Text>
                  <TextInput
                    autoComplete="off"
                    autoCorrect={false}
                    defaultValue={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. Free, Paid, Donation"
                    className="h-10 rounded-md border border-neutral-300 px-3 py-2"
                  />
                  {errors.eventMetadata?.priceType && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.eventMetadata.priceType.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Price */}
            <Controller
              control={control}
              name="eventMetadata.price"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="mb-2 text-base font-semibold">Price</Text>
                  <TextInput
                    autoComplete="off"
                    autoCorrect={false}
                    defaultValue={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. $10, $5-$20"
                    className="h-10 rounded-md border border-neutral-300 px-3 py-2"
                    keyboardType="decimal-pad"
                  />
                  {errors.eventMetadata?.price && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.eventMetadata.price.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Age Restriction */}
            <Controller
              control={control}
              name="eventMetadata.ageRestriction"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="mb-2 text-base font-semibold">
                    Age Restriction
                  </Text>
                  <TextInput
                    autoComplete="off"
                    autoCorrect={false}
                    defaultValue={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. All Ages, 18+, 21+"
                    className="h-10 rounded-md border border-neutral-300 px-3 py-2"
                  />
                  {errors.eventMetadata?.ageRestriction && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.eventMetadata.ageRestriction.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Performers */}
            <Controller
              control={control}
              name="eventMetadata.performers"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="mb-2 text-base font-semibold">
                    Performers
                  </Text>
                  <TextInput
                    autoComplete="off"
                    autoCorrect={false}
                    defaultValue={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. Band names, speakers, artists"
                    className="h-10 rounded-md border border-neutral-300 px-3 py-2"
                  />
                  {errors.eventMetadata?.performers && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.eventMetadata.performers.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Accessibility */}
            <Controller
              control={control}
              name="eventMetadata.accessibility"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="mb-2 text-base font-semibold">
                    Accessibility
                  </Text>
                  <TextInput
                    autoComplete="off"
                    autoCorrect={false}
                    defaultValue={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. Wheelchair accessible, ASL interpreter"
                    className="h-10 rounded-md border border-neutral-300 px-3 py-2"
                  />
                  {errors.eventMetadata?.accessibility && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.eventMetadata.accessibility.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Comment */}
            <Controller
              control={control}
              name="comment"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="mb-2 text-base font-semibold">Comment</Text>
                  <TextInput
                    autoComplete="off"
                    autoCorrect={true}
                    defaultValue={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Add a comment about this event"
                    multiline
                    className="h-24 rounded-md border border-neutral-300 px-3 py-2"
                  />
                  {errors.comment && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.comment.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Visibility */}
            <Controller
              control={control}
              name="visibility"
              render={({ field: { onChange, value } }) => {
                const visibilityOptions = [
                  { label: "Public", value: "public" },
                  { label: "Private", value: "private" },
                  { label: "Unlisted", value: "unlisted" },
                ];

                return (
                  <View>
                    <Text className="mb-2 text-base font-semibold">
                      Visibility
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {visibilityOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => onChange(option.value)}
                          className={`rounded-full border px-4 py-2 ${
                            value === option.value
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-neutral-300"
                          }`}
                        >
                          <Text
                            className={`text-sm ${
                              value === option.value
                                ? "text-indigo-700"
                                : "text-neutral-700"
                            }`}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {errors.visibility && (
                      <Text className="mt-1 text-xs text-red-500">
                        {errors.visibility.message}
                      </Text>
                    )}
                  </View>
                );
              }}
            />
          </View>

          {/* Save Button */}
          <Button
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting || !isDirty || !isValid}
            className="mt-6"
          >
            {isSubmitting ? "Saving..." : "Save Event"}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

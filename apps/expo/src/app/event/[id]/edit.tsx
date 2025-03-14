import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
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
import * as FileSystem from "expo-file-system";
import { Image as ExpoImage } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar, Clock, Image as ImageIcon } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner-native";
import { z } from "zod";

import { Button } from "~/components/Button";
import ImageUploadSpinner from "~/components/ImageUploadSpinner";
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
  visibility: z.enum(["public", "private"]).optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  // We need the user for authorization checks in the future
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  // Track the original image to detect changes
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  // Track if an image is currently uploading
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  // Store the remote URL after an image is uploaded
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

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

  // Get the api utils for cache invalidation
  const utils = api.useUtils();

  // Update event mutation
  const updateEventMutation = api.event.update.useMutation({
    onMutate: () => setIsSubmitting(true),
    onSettled: () => setIsSubmitting(false),
    onSuccess: (data) => {
      // Log the returned data to check if the image was updated
      console.log("🎉 Server response after update:", data);

      // Just log the entire response - we'll check the console for image data
      console.log("Update completed successfully, refreshing data");

      toast.success("Event updated successfully");
      // Invalidate relevant queries to ensure all event data is refreshed
      void Promise.all([
        utils.event.get.invalidate({ eventId: id || "" }),
        utils.event.getEventsForUser.invalidate(),
        utils.event.getSavedIdsForUser.invalidate(),
        utils.event.getStats.invalidate(),
        // Invalidate any other event-related queries that might be active
        utils.event.invalidate(),
      ]);
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
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      event: {
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
        timeZone: "",
        location: "",
        images: [],
      },
      eventMetadata: {
        eventType: "",
        eventCategory: "",
        priceType: "",
        price: "",
        ageRestriction: "",
        performers: "",
        accessibility: "",
      },
      comment: "",
      lists: [],
      visibility: "private" as const,
    },
  });

  // Initialize form with event data when it's loaded
  useEffect(() => {
    if (eventQuery.data) {
      const event = eventQuery.data;

      // Log detailed data about images array structure
      if (event.event?.images && event.event.images.length > 0) {
        console.log("📸 ORIGINAL IMAGES STRUCTURE:", {
          imageArray: event.event.images,
          arrayLength: event.event.images.length,
          isAllSameUrl: event.event.images.every(
            (url) => url === event.event.images[0],
          ),
          sampleImageUrl: event.event.images[0],
        });
      }

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
          performers: Array.isArray(typedEventMetadata.performers)
            ? typedEventMetadata.performers.join(", ")
            : typeof typedEventMetadata.performers === "string"
              ? typedEventMetadata.performers
              : "",
          accessibility: Array.isArray(typedEventMetadata.accessibility)
            ? typedEventMetadata.accessibility.join(", ")
            : "",
        },
        comment: "",
        lists: [],
        visibility:
          event.visibility === "public" || event.visibility === "private"
            ? event.visibility
            : ("private" as const),
      });

      // Set the selected image if there are images
      if (
        typedEventData.images &&
        typedEventData.images.length > 0 &&
        typedEventData.images[0]
      ) {
        const initialImage = typedEventData.images[0];
        setSelectedImage(initialImage);
        setOriginalImage(initialImage); // Store the original image
      }
    }
  }, [eventQuery.data, reset, setSelectedImage]);

  // Function to upload an image to Bytescale server
  const uploadImage = async (localUri: string): Promise<string> => {
    setIsUploadingImage(true);
    console.log("Starting image upload for URI:", localUri);

    try {
      // Convert photo library URI to file URI if needed
      let fileUri = localUri;
      if (localUri.startsWith("ph://")) {
        const assetId = localUri.replace("ph://", "").split("/")[0];
        if (!assetId) {
          throw new Error("Invalid photo library asset ID");
        }
        const asset = await MediaLibrary.getAssetInfoAsync(assetId);
        if (!asset.localUri) {
          throw new Error("Could not get local URI for photo library asset");
        }
        fileUri = asset.localUri;
        console.log("Converted photo library URI to file URI:", fileUri);
      }

      // Validate image URI
      if (!fileUri.startsWith("file://")) {
        throw new Error("Invalid image URI format");
      }

      // 1. Manipulate image for optimal upload
      let manipulatedImage;
      try {
        manipulatedImage = await ImageManipulator.manipulateAsync(
          fileUri,
          [{ resize: { width: 1284 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
      } catch (error) {
        throw new Error(
          `Failed to manipulate image: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }

      // Validate manipulated image
      if (!manipulatedImage.uri) {
        throw new Error("Image manipulation failed - no URI returned");
      }

      // 2. Upload image to Bytescale
      let response;
      try {
        response = await FileSystem.uploadAsync(
          "https://api.bytescale.com/v2/accounts/12a1yek/uploads/binary",
          manipulatedImage.uri,
          {
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            httpMethod: "POST",
            headers: {
              "Content-Type": "image/jpeg",
              Authorization: "Bearer public_12a1yekATNiLj4VVnREZ8c7LM8V8",
            },
          },
        );
      } catch (error) {
        throw new Error(
          `Failed to upload image: ${error instanceof Error ? error.message : "Network error"}`,
        );
      }

      if (response.status !== 200) {
        throw new Error(
          `Upload failed with status ${response.status}: ${response.body}`,
        );
      }

      // 3. Parse response
      let fileUrl: string;
      try {
        if (!response.body) {
          throw new Error("Empty response from upload server");
        }
        const parsed = JSON.parse(response.body) as { fileUrl?: string };
        if (!parsed.fileUrl) {
          throw new Error("No file URL in response");
        }
        fileUrl = parsed.fileUrl;
      } catch (error) {
        throw new Error(
          `Failed to parse upload response: ${error instanceof Error ? error.message : "Invalid JSON"}`,
        );
      }

      // Log success with the returned URL
      console.log("Image uploaded successfully, remote URL:", fileUrl);
      return fileUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  };

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
        quality: 0.8,
      });

      if (
        !result.canceled &&
        result.assets &&
        result.assets.length > 0 &&
        result.assets[0]?.uri
      ) {
        // Set the selected image to show in the UI immediately
        const localUri = result.assets[0].uri;
        console.log("Selected image from picker:", localUri);
        setSelectedImage(localUri);

        try {
          // Show toast while uploading
          const loadingToastId = toast.loading("Uploading image...");

          // Upload the image to get a remote URL
          const remoteUrl = await uploadImage(localUri);

          // Update the state with the remote URL
          console.log("Setting uploaded image URL:", remoteUrl);
          setUploadedImageUrl(remoteUrl);

          // Dismiss the loading toast and show success
          toast.dismiss(loadingToastId);
          toast.success("Image uploaded successfully");
        } catch (error) {
          console.error("Error uploading image:", error);
          toast.error("Failed to upload image", {
            description:
              error instanceof Error ? error.message : "Unknown error",
          });

          // Reset selected image on upload failure if it's a new image (not the original)
          if (selectedImage !== originalImage) {
            setSelectedImage(originalImage);
          }
        }
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

      console.log("⭐ Starting form submission");
      console.log("Form isDirty:", isDirty);
      console.log("Image state:", {
        originalImage,
        selectedImage,
        uploadedImageUrl,
        different: selectedImage !== originalImage,
      });

      // Skip submission if there are no changes (both form and image)
      // Consider changes in form data or a different image (either local or remote)
      const hasImageChanges =
        uploadedImageUrl !== null ||
        (selectedImage !== originalImage && selectedImage !== null);

      console.log("Has image changes:", hasImageChanges);

      if (!isDirty && !hasImageChanges) {
        toast.error("No changes detected");
        return;
      }

      try {
        setIsSubmitting(true);
        const loadingToastId = toast.loading("Updating event...");

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

        // Determine which image URL to use
        // If a new image was uploaded, use the remote URL
        // Otherwise, use the original image from the event data if available
        let imageToUse = null;

        if (uploadedImageUrl) {
          // If we have an uploaded image URL, use that
          imageToUse = uploadedImageUrl;
          console.log("Using uploaded image URL:", uploadedImageUrl);
        } else if (selectedImage === originalImage && originalImage) {
          // If selected image is the same as original and exists, keep it
          imageToUse = originalImage;
          console.log("Keeping original image:", originalImage);
        } else if (selectedImage === null) {
          // If selected image is null, the user removed the image
          imageToUse = null;
          console.log("Image was removed, sending empty images array");
        }

        console.log("🖼️ Final image decision:", {
          originalImage,
          selectedImage,
          uploadedImageUrl,
          imageToUse,
          isRemoteURL: imageToUse?.startsWith("http"),
        });

        // CRITICAL CHECK: Never send a local file URI to the server
        if (
          imageToUse &&
          (imageToUse.startsWith("file://") || imageToUse.startsWith("ph://"))
        ) {
          console.error(
            "⚠️ CRITICAL ERROR: Attempted to send local file URI to server:",
            imageToUse,
          );
          toast.error("Image upload failed", {
            description:
              "Cannot save with a local image reference. Please try uploading the image again.",
          });
          setIsSubmitting(false);
          return;
        }

        // Prepare the event data in the format expected by the API

        // Get the original image count from the form
        const originalImagesCount = data.event.images?.length || 0;

        // If we're using a new image, check if we need to duplicate it (match original count)
        let imagesArray: string[] = [];
        if (imageToUse) {
          // If the original event had the same image repeated in the array, we'll do the same
          // This is a workaround for potential server expectations about image array structure
          if (originalImagesCount > 1) {
            console.log(
              `Original event had ${originalImagesCount} duplicate images, replicating pattern`,
            );
            imagesArray = Array(originalImagesCount).fill(imageToUse);
          } else {
            // Just use a single image in the array (default case)
            imagesArray = [imageToUse];
          }
        }

        console.log("Final images array:", imagesArray);

        const updatedData = {
          id,
          event: {
            ...data.event,
            // Use our calculated images array
            images: imagesArray,
          },
          eventMetadata: {
            ...data.eventMetadata,
            accessibility: accessibilityArray,
            performers: performersArray,
          },
          comment: data.comment || "",
          lists: (data.lists || []).map((list) => ({
            [list.value]: list.label,
          })) as Record<string, string>[],
          visibility: data.visibility,
        };

        console.log(
          "🔄 Submitting update with images:",
          updatedData.event.images,
        );

        await updateEventMutation.mutateAsync(updatedData);
        console.log("✅ Event updated successfully with image:", imageToUse);

        toast.dismiss(loadingToastId);
      } catch (error) {
        console.error("❌ Error updating event:", error);
        toast.error("Failed to update event", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        setIsSubmitting(false);
      }
    },
    [
      id,
      updateEventMutation,
      selectedImage,
      originalImage,
      uploadedImageUrl,
      isDirty,
    ],
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
                    Event Name <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    autoComplete="off"
                    autoCorrect={false}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter event name"
                    className={`h-10 rounded-md border px-3 py-2 ${
                      errors.event?.name
                        ? "border-red-500"
                        : "border-neutral-300"
                    }`}
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
                    value={value}
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
                    value={value}
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
                      Start Date <Text className="text-red-500">*</Text>
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowStartDatePicker(true)}
                      className={`flex-row items-center justify-between rounded-md border px-3 py-2 ${
                        errors.event?.startDate
                          ? "border-red-500"
                          : "border-neutral-300"
                      }`}
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
                      End Date <Text className="text-red-500">*</Text>
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowEndDatePicker(true)}
                      className={`flex-row items-center justify-between rounded-md border px-3 py-2 ${
                        errors.event?.endDate
                          ? "border-red-500"
                          : "border-neutral-300"
                      }`}
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
                    value={value}
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
                        className="mr-2 flex-1"
                        disabled={isUploadingImage}
                      >
                        {isUploadingImage ? "Uploading..." : "Replace"}
                      </Button>
                      <Button
                        onPress={() => {
                          console.log("Removing image - before:", {
                            selectedImage,
                            uploadedImageUrl,
                            originalImage,
                          });
                          setSelectedImage(null);
                          setUploadedImageUrl(null);
                          // Display a toast to confirm removal
                          toast.success("Image removed");
                          console.log("Image removed - after:", {
                            selectedImage: null,
                            uploadedImageUrl: null,
                            originalImage,
                          });
                        }}
                        variant="destructive"
                        className="flex-1"
                        disabled={isUploadingImage}
                      >
                        Remove
                      </Button>
                    </View>
                    {isUploadingImage && (
                      <View className="mt-2 items-center">
                        <ImageUploadSpinner />
                        <Text className="mt-1 text-xs text-neutral-500">
                          Uploading image...
                        </Text>
                      </View>
                    )}
                    {uploadedImageUrl && (
                      <Text className="mt-2 text-xs text-green-600">
                        Image uploaded successfully
                      </Text>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={pickImage}
                    className="flex-row items-center justify-center rounded-md border border-dashed border-neutral-300 p-6"
                    disabled={isUploadingImage}
                  >
                    <View className="items-center">
                      {isUploadingImage ? (
                        <>
                          <ImageUploadSpinner />
                          <Text className="mt-2 text-center text-neutral-600">
                            Uploading image...
                          </Text>
                        </>
                      ) : (
                        <>
                          <ImageIcon size={32} color="#666" />
                          <Text className="mt-2 text-center text-neutral-600">
                            Tap to add an image
                          </Text>
                        </>
                      )}
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
                    value={value}
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
                    value={value}
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
                    value={value}
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
                    value={value}
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
                    value={value}
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
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter comma-separated performers (e.g. 'Band Name, Speaker, Artist')"
                    className="h-10 rounded-md border border-neutral-300 px-3 py-2"
                  />
                  <Text className="mt-1 text-xs text-neutral-500">
                    Separate multiple performers with commas
                  </Text>
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
                    value={value}
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
                    value={value}
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
                ];

                return (
                  <View>
                    <Text className="mb-2 text-base font-semibold">
                      Visibility <Text className="text-red-500">*</Text>
                    </Text>
                    <View
                      className={`flex-row flex-wrap gap-2 ${errors.visibility ? "rounded-md border border-red-500 p-2" : ""}`}
                    >
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
                        {errors.visibility.message ||
                          "Please select a visibility option"}
                      </Text>
                    )}
                  </View>
                );
              }}
            />

            {/* Debug Validation Section */}
            <View className="mt-8 rounded-md bg-neutral-100 p-4">
              <Text className="text-base font-semibold">Form Status:</Text>
              <Text>Is Form Valid: {isValid ? "Yes" : "No"}</Text>
              <Text>Is Form Dirty: {isDirty ? "Yes" : "No"}</Text>

              <TouchableOpacity
                onPress={() => {
                  const values = control._formValues;
                  console.log(
                    "Current form values:",
                    JSON.stringify(values, null, 2),
                  );

                  // Log specific information about the performers field
                  if (
                    values.eventMetadata &&
                    typeof values.eventMetadata === "object"
                  ) {
                    console.log(
                      "Performers field:",
                      values.eventMetadata.performers,
                      "Type:",
                      typeof values.eventMetadata.performers,
                      "Is Array:",
                      Array.isArray(values.eventMetadata.performers),
                    );
                  }

                  // If we have data from the API, log that too for comparison
                  const apiEventMetadata = eventQuery.data?.eventMetadata;
                  if (
                    apiEventMetadata &&
                    typeof apiEventMetadata === "object" &&
                    "performers" in apiEventMetadata
                  ) {
                    console.log(
                      "API performers data:",
                      apiEventMetadata.performers,
                      "Type:",
                      typeof apiEventMetadata.performers,
                      "Is Array:",
                      Array.isArray(apiEventMetadata.performers),
                    );
                  }
                }}
                className="my-2 rounded-md bg-gray-200 px-4 py-2"
              >
                <Text>Log Current Form Values</Text>
              </TouchableOpacity>

              {Object.keys(errors).length > 0 && (
                <View className="mt-2">
                  <Text className="font-semibold text-red-500">
                    Validation Errors:
                  </Text>
                  {Object.entries(errors).map(([key, error]) => {
                    // Handle nested errors
                    if (
                      typeof error === "object" &&
                      error !== null &&
                      "message" in error
                    ) {
                      return (
                        <Text key={key} className="text-xs text-red-500">
                          - {key}: {error.message!}
                        </Text>
                      );
                    } else if (typeof error === "object" && error !== null) {
                      // For nested objects like errors.event or errors.eventMetadata
                      return (
                        <View key={key}>
                          <Text className="text-xs font-medium text-red-500">
                            {key}:
                          </Text>
                          {Object.entries(
                            error as Record<string, { message?: string }>,
                          ).map(([nestedKey, nestedError]) => (
                            <Text
                              key={`${key}-${nestedKey}`}
                              className="ml-2 text-xs text-red-500"
                            >
                              - {nestedKey}: {nestedError.message || "Invalid"}
                            </Text>
                          ))}
                        </View>
                      );
                    }
                    return null;
                  })}
                </View>
              )}

              {/* Image Debug Info */}
              <View className="mt-4">
                <Text className="font-semibold">Image Status:</Text>
                <Text className="text-xs">
                  Original Image: {originalImage ? "✓" : "✗"}
                </Text>
                <Text className="text-xs">
                  Selected Image: {selectedImage ? "✓" : "✗"}
                </Text>
                <Text className="text-xs">
                  Uploaded Image URL: {uploadedImageUrl ? "✓" : "✗"}
                </Text>
                <Text className="text-xs">
                  Is Uploading: {isUploadingImage ? "Yes" : "No"}
                </Text>
                <Text className="text-xs">
                  Has Image Changes:{" "}
                  {uploadedImageUrl !== null ||
                  (selectedImage !== originalImage && selectedImage !== null)
                    ? "Yes"
                    : "No"}
                </Text>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <Button
            onPress={() => {
              console.log("Save button clicked");
              console.log("Form is valid:", isValid);
              console.log("Form is dirty:", isDirty);
              console.log("Form errors:", JSON.stringify(errors, null, 2));
              void handleSubmit(onSubmit)();
            }}
            disabled={
              isSubmitting ||
              isUploadingImage ||
              (!isDirty &&
                !uploadedImageUrl &&
                selectedImage === originalImage) ||
              !isValid
            }
            className="mt-6"
          >
            {isSubmitting ? "Saving..." : "Save Event"}
          </Button>

          {/* Check Required Fields Button */}
          {!isValid && (
            <TouchableOpacity
              onPress={() => {
                // Trigger validation on all fields
                void handleSubmit(() => {
                  // This is just to trigger validation
                  console.log("Validating all fields");
                })();

                // Scroll to the first error
                if (Object.keys(errors).length > 0) {
                  toast.error("Please complete all required fields", {
                    description:
                      "Look for fields marked with a red asterisk (*)",
                  });
                }
              }}
              className="mt-3 items-center"
            >
              <Text className="text-indigo-600 underline">
                Check Required Fields
              </Text>
            </TouchableOpacity>
          )}

          {/* Debug status of button */}
          <View className="mt-2">
            {!isValid && (
              <Text className="text-xs text-red-500">
                Button disabled: Form is invalid
              </Text>
            )}
            {!isDirty &&
              !uploadedImageUrl &&
              selectedImage === originalImage && (
                <Text className="text-xs text-red-500">
                  Button disabled: No changes made
                </Text>
              )}
            {isSubmitting && (
              <Text className="text-xs text-neutral-500">
                Button disabled: Currently submitting
              </Text>
            )}
            {isUploadingImage && (
              <Text className="text-xs text-neutral-500">
                Button disabled: Currently uploading image
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

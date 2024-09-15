import { create } from "zustand";

interface AppState {
  filter: "upcoming" | "past";
  intentParams: { text?: string; imageUri?: string } | null;
  isCalendarModalVisible: boolean;
  showAllCalendars: boolean;
  setFilter: (filter: "upcoming" | "past") => void;
  setIntentParams: (
    params: { text?: string; imageUri?: string } | null,
  ) => void;
  setIsCalendarModalVisible: (isVisible: boolean) => void;
  setShowAllCalendars: (show: boolean) => void;
  resetIntentParams: () => void;
  input: string;
  imagePreview: string | null;
  linkPreview: string | null;
  isCreating: boolean;
  isPublic: boolean;
  isImageLoading: boolean;
  isImageUploading: boolean;
  uploadedImageUrl: string | null;
  setInput: (input: string) => void;
  setImagePreview: (preview: string | null) => void;
  setLinkPreview: (preview: string | null) => void;
  setIsCreating: (isCreating: boolean) => void;
  setIsPublic: (isPublic: boolean) => void;
  setIsImageLoading: (isLoading: boolean) => void;
  setIsImageUploading: (isUploading: boolean) => void;
  setUploadedImageUrl: (url: string | null) => void;
  resetAddEventState: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  filter: "upcoming",
  intentParams: null,
  isCalendarModalVisible: false,
  showAllCalendars: false,
  setFilter: (filter) => set({ filter }),
  setIntentParams: (params) => set({ intentParams: params }),
  setIsCalendarModalVisible: (isVisible) =>
    set({ isCalendarModalVisible: isVisible }),
  setShowAllCalendars: (show) => set({ showAllCalendars: show }),
  resetIntentParams: () => set({ intentParams: null }),
  input: "",
  imagePreview: null,
  linkPreview: null,
  isCreating: false,
  isPublic: false,
  isImageLoading: false,
  isImageUploading: false,
  uploadedImageUrl: null,
  setInput: (input) => set({ input }),
  setImagePreview: (preview) => set({ imagePreview: preview }),
  setLinkPreview: (preview) => set({ linkPreview: preview }),
  setIsCreating: (isCreating) => set({ isCreating }),
  setIsPublic: (isPublic) => set({ isPublic }),
  setIsImageLoading: (isLoading) => set({ isImageLoading: isLoading }),
  setIsImageUploading: (isUploading) => set({ isImageUploading: isUploading }),
  setUploadedImageUrl: (url) => set({ uploadedImageUrl: url }),
  resetAddEventState: () =>
    set({
      input: "",
      imagePreview: null,
      linkPreview: null,
      isCreating: false,
      isPublic: false,
      isImageLoading: false,
      isImageUploading: false,
      uploadedImageUrl: null,
    }),
}));

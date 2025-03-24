import type * as Calendar from "expo-calendar";
import React from "react";
import { FlatList, Modal, Text, TouchableOpacity, View } from "react-native";

import { useAppStore } from "~/store";
import { cn } from "~/utils/cn";

interface CalendarSelectionModalProps {
  onSelect: (calendarId: string) => void;
  onDismiss: () => void;
  initialLimit: number;
}

export const CalendarSelectionModal: React.FC<CalendarSelectionModalProps> = ({
  onSelect,
  onDismiss,
  initialLimit,
}) => {
  const {
    isCalendarModalVisible,
    availableCalendars,
    showAllCalendars,
    setShowAllCalendars,
  } = useAppStore();

  const renderCalendarItem = ({
    item,
    index,
  }: {
    item: Calendar.Calendar;
    index: number;
  }) => (
    <TouchableOpacity
      className={cn(
        "flex-row items-center border-b border-gray-200 p-3",
        index === 0 && "py-4",
      )}
      onPress={() => onSelect(item.id)}
    >
      <View
        className={cn("mr-3 rounded-full", index === 0 ? "h-4 w-4" : "h-3 w-3")}
        style={{ backgroundColor: item.color }}
      />
      <Text
        className={cn(
          "flex-1 truncate font-medium",
          index === 0 ? "text-lg" : "text-base",
        )}
      >
        {item.title}
      </Text>
      <Text
        className={cn(
          "ml-2 max-w-[40%] break-all text-gray-500",
          index === 0 ? "text-base" : "text-sm",
        )}
      >
        ({item.source.name})
      </Text>
    </TouchableOpacity>
  );

  const displayedCalendars = showAllCalendars
    ? availableCalendars
    : availableCalendars.slice(0, initialLimit);

  return (
    <Modal
      visible={isCalendarModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 items-center justify-center bg-neutral-1">
        <View className="max-h-[80%] w-4/5 rounded-lg bg-white p-5">
          <Text className="mb-3 text-lg font-bold">
            Select Calendar for Event
          </Text>
          <FlatList
            data={displayedCalendars}
            renderItem={renderCalendarItem}
            keyExtractor={(item) => item.id}
          />
          {!showAllCalendars && availableCalendars.length > initialLimit && (
            <TouchableOpacity
              className="mt-3 items-center justify-center rounded-lg bg-interactive-1 px-4 py-2"
              onPress={() => setShowAllCalendars(true)}
            >
              <Text className="text-base font-bold text-white">
                Show All Calendars
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="bg- mt-3 items-center justify-center rounded-lg bg-neutral-3 px-4 py-2"
            onPress={onDismiss}
          >
            <Text className="text-base font-medium text-neutral-1">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

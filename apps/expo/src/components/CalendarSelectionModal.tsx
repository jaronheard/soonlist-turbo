import type * as Calendar from "expo-calendar";
import React from "react";
import { FlatList, Modal, Text, TouchableOpacity, View } from "react-native";

interface CalendarSelectionModalProps {
  visible: boolean;
  calendars: Calendar.Calendar[];
  onSelect: (calendarId: string) => void;
  onDismiss: () => void;
}

export const CalendarSelectionModal: React.FC<CalendarSelectionModalProps> = ({
  visible,
  calendars,
  onSelect,
  onDismiss,
}) => {
  const renderCalendarItem = ({ item }: { item: Calendar.Calendar }) => (
    <TouchableOpacity
      className="flex-row items-center border-b border-gray-200 p-3"
      onPress={() => onSelect(item.id)}
    >
      <View
        className="mr-3 h-3 w-3 rounded-full"
        style={{ backgroundColor: item.color }}
      />
      <Text className="flex-1 truncate text-base font-medium">
        {item.title}
      </Text>
      <Text className="ml-2 truncate text-sm text-gray-500">
        ({item.source.name})
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 items-center justify-center bg-black bg-opacity-50">
        <View className="max-h-[80%] w-4/5 rounded-lg bg-white p-5">
          <Text className="mb-3 text-lg font-bold">Select Calendar</Text>
          <FlatList
            data={calendars}
            renderItem={renderCalendarItem}
            keyExtractor={(item) => item.id}
          />
          <TouchableOpacity
            className="mt-3 items-center rounded-md bg-gray-100 p-3"
            onPress={onDismiss}
          >
            <Text className="text-base text-gray-700">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

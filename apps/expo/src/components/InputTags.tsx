import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { Plus, X } from "~/components/icons";

interface InputTagsProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  id?: string;
}

export function InputTags({
  value,
  onChange,
  placeholder = "Add item",
  id,
}: InputTagsProps) {
  const [pendingDataPoint, setPendingDataPoint] = useState("");

  const addPendingDataPoint = () => {
    if (pendingDataPoint.trim()) {
      const trimmed = pendingDataPoint.trim();
      if (!value.includes(trimmed)) {
        onChange([...value, trimmed]);
      }
      setPendingDataPoint("");
    }
  };

  const removeItem = (itemToRemove: string) => {
    onChange(value.filter((item) => item !== itemToRemove));
  };

  const handleSubmitEditing = () => {
    addPendingDataPoint();
  };

  const handleKeyPress = (e: {
    nativeEvent: { key: string };
    preventDefault: () => void;
  }) => {
    if (e.nativeEvent.key === "," || e.nativeEvent.key === " ") {
      e.preventDefault();
      addPendingDataPoint();
    }
  };

  return (
    <>
      <View className="flex-row items-center">
        <TextInput
          id={id}
          value={pendingDataPoint}
          onChangeText={setPendingDataPoint}
          onSubmitEditing={handleSubmitEditing}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2"
          autoComplete="off"
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={addPendingDataPoint}
          className="ml-2 rounded-md bg-gray-100 px-3 py-2"
          disabled={!pendingDataPoint.trim()}
        >
          <Plus
            size={20}
            color={pendingDataPoint.trim() ? "#374151" : "#9CA3AF"}
          />
        </TouchableOpacity>
      </View>
      {value.length > 0 && (
        <View className="my-2 flex-row flex-wrap gap-2 rounded-md p-2">
          {value.map((item, idx) => (
            <View
              key={idx}
              className="flex-row items-center rounded-full bg-gray-100 px-2 py-1"
            >
              <Text className="text-sm text-gray-800">{item}</Text>
              <TouchableOpacity
                onPress={() => removeItem(item)}
                className="ml-2"
              >
                <X size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

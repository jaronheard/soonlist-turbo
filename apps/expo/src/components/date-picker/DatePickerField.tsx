import type {
  Control,
  FieldPath,
  FieldPathValue,
  FieldValues,
  Path,
} from "react-hook-form";
import React, { useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Controller } from "react-hook-form";

import { formatDateForStorage } from "~/utils/dates";
import { formatDateForDisplay, parseDateString } from "./date-utils";

interface DatePickerFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  error?: string;
  className?: string;
}

// Define a specific type for the onChange function we expect from the Controller
type FieldOnChange = (value: string) => void;

export function DatePickerField<T extends FieldValues>({
  control,
  name,
  label,
  error,
  className,
}: DatePickerFieldProps<T>) {
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(() => {
    return new Date();
  });

  const showPicker = (
    currentValue: FieldPathValue<T, FieldPath<T>> | undefined,
  ) => {
    const initialDate =
      currentValue && typeof currentValue === "string"
        ? parseDateString(currentValue)
        : new Date();
    setTempDate(initialDate);
    setIsPickerVisible(true);
  };

  const hidePicker = () => {
    setIsPickerVisible(false);
  };

  // Use the specific FieldOnChange type
  const handleModalHide = (onChange: FieldOnChange) => {
    if (Platform.OS === "ios") {
      const formatted = formatDateForStorage(tempDate);
      onChange(formatted);
    }
  };

  // Use the specific FieldOnChange type
  const onDateChange = (
    onChange: FieldOnChange,
    _: unknown,
    selectedDate?: Date,
  ) => {
    const currentDate = selectedDate || tempDate;
    setTempDate(currentDate);

    if (Platform.OS === "android") {
      const formatted = formatDateForStorage(currentDate);
      onChange(formatted);
      hidePicker();
    }
  };

  return (
    <View className={className}>
      {label && <Text className="mb-2 text-base font-semibold">{label}</Text>}
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange, onBlur } }) => (
          <>
            <TouchableOpacity
              onPress={() => showPicker(value)}
              className="flex-1 border-r border-neutral-100 px-3 py-3.5"
              onBlur={onBlur}
            >
              <Text className={value ? "text-black" : "text-neutral-500"}>
                {formatDateForDisplay(value as string) || "Select date"}
              </Text>
            </TouchableOpacity>

            <Modal
              isVisible={isPickerVisible}
              onBackdropPress={hidePicker}
              onModalHide={() => handleModalHide(onChange as FieldOnChange)}
              style={{ justifyContent: "flex-end", margin: 0 }}
              animationIn="slideInUp"
              animationOut="slideOutDown"
              backdropTransitionOutTiming={0}
            >
              <View className="rounded-t-lg bg-white p-4">
                <DateTimePicker
                  testID="datePickerModal"
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={(event, date) =>
                    onDateChange(onChange as FieldOnChange, event, date)
                  }
                  style={
                    Platform.OS === "ios"
                      ? { height: 300, alignSelf: "center" }
                      : {}
                  }
                />
              </View>
            </Modal>
          </>
        )}
      />
      {error && <Text className="mt-1 text-xs text-red-500">{error}</Text>}
    </View>
  );
}

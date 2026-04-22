import type {
  Control,
  FieldPath,
  FieldPathValue,
  FieldValues,
  Path,
} from "react-hook-form";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Controller } from "react-hook-form";

import { formatTimeForStorage, parseTimeString } from "~/utils/dates";
import { formatTimeForDisplay } from "./date-utils";

interface TimePickerFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  error?: string;
  className?: string;
  minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
}

type FieldOnChange = (value: string) => void;

export function TimePickerField<T extends FieldValues>({
  control,
  name,
  label,
  error,
  className,
  minuteInterval = 5,
}: TimePickerFieldProps<T>) {
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [tempTime, setTempTime] = useState<Date>(new Date());

  const showPicker = (
    currentValue: FieldPathValue<T, FieldPath<T>> | undefined,
  ) => {
    const initialTime =
      currentValue && typeof currentValue === "string"
        ? parseTimeString(currentValue)
        : new Date();
    setTempTime(
      initialTime instanceof Date && !isNaN(initialTime.getTime())
        ? initialTime
        : new Date(),
    );
    setIsPickerVisible(true);
  };

  const hidePicker = () => {
    setIsPickerVisible(false);
  };

  const commitAndHide = (onChange: FieldOnChange) => {
    if (Platform.OS === "ios") {
      onChange(formatTimeForStorage(tempTime));
    }
    hidePicker();
  };

  const onTimeChange = (
    onChange: FieldOnChange,
    _: unknown,
    selectedTime?: Date,
  ) => {
    const currentTime =
      selectedTime instanceof Date && !isNaN(selectedTime.getTime())
        ? selectedTime
        : tempTime;
    setTempTime(currentTime);

    if (Platform.OS === "android") {
      onChange(formatTimeForStorage(currentTime));
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
              className="flex-1 px-3 py-3.5"
              onBlur={onBlur}
            >
              <Text className={value ? "text-black" : "text-neutral-500"}>
                {formatTimeForDisplay(value as string) || "Select time"}
              </Text>
            </TouchableOpacity>

            <Modal
              visible={isPickerVisible}
              transparent
              animationType="slide"
              onRequestClose={() => commitAndHide(onChange as FieldOnChange)}
            >
              <TouchableWithoutFeedback
                onPress={() => commitAndHide(onChange as FieldOnChange)}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: "flex-end",
                    backgroundColor: "rgba(0,0,0,0.5)",
                  }}
                >
                  <TouchableWithoutFeedback>
                    <View className="rounded-t-lg bg-white p-4">
                      <DateTimePicker
                        testID="timePickerModal"
                        value={tempTime}
                        mode="time"
                        minuteInterval={minuteInterval}
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        themeVariant="light"
                        onChange={(event, time) =>
                          onTimeChange(onChange as FieldOnChange, event, time)
                        }
                        style={
                          Platform.OS === "ios"
                            ? { height: 200, alignSelf: "center" }
                            : {}
                        }
                      />
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          </>
        )}
      />
      {error && <Text className="mt-1 text-xs text-red-500">{error}</Text>}
    </View>
  );
}

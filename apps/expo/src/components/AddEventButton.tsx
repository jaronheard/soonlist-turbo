import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { Sparkles } from "lucide-react-native";

import { useNotification } from "~/providers/NotificationProvider";
import { api } from "~/utils/api";

const AddEventButton = () => {
  const { expoPushToken } = useNotification();
  const [text, setText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  const utils = api.useUtils();
  const eventFromRawTextAndNotification =
    api.ai.eventFromRawTextThenCreateThenNotification.useMutation({
      onSettled: () => void utils.event.invalidate(),
    });
  const { user } = useUser();

  const handleAdd = () => {
    if (!text.trim()) return;
    eventFromRawTextAndNotification.mutate({
      rawText: text,
      timezone: "America/Los_Angeles",
      expoPushToken,
      lists: [],
      userId: user?.id || "",
      username: user?.username || "",
    });
    setText("");
    setModalVisible(false);
  };

  useEffect(() => {
    if (modalVisible) {
      textInputRef.current?.focus();
    }
  }, [modalVisible]);

  return (
    <View className="absolute bottom-4 right-4 z-10">
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View className="flex-1 items-center justify-center bg-black/50">
            <TouchableWithoutFeedback>
              <View className="w-4/5 items-center rounded-lg bg-white p-5 shadow-lg">
                <TextInput
                  ref={textInputRef}
                  className="mb-4 h-24 w-full rounded-md border border-neutral-3 p-2"
                  placeholder="Describe your event"
                  value={text}
                  onChangeText={setText}
                  multiline
                  numberOfLines={4}
                  onSubmitEditing={handleAdd}
                />
                <TouchableOpacity
                  className="w-full flex-row items-center justify-center rounded-full bg-interactive-1 px-3 py-2"
                  onPress={handleAdd}
                >
                  <Sparkles size={16} color="white" />
                  <Text className="ml-2 text-2xl font-bold text-white">
                    Add Event
                  </Text>
                </TouchableOpacity>
                <Text className="mt-2 text-center text-xs text-neutral-2">
                  <Text className="font-bold">Pro tip:</Text> Use our share
                  extension to instantly add images and text to Soonlist from
                  anywhere!
                </Text>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <TouchableOpacity
        className="items-center justify-center rounded-full bg-interactive-2 p-4 shadow-lg"
        onPress={() => setModalVisible(true)}
      >
        <Sparkles size={24} color="#5A32FB" />
      </TouchableOpacity>
    </View>
  );
};

export default AddEventButton;

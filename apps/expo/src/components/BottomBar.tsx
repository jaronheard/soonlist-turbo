import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Link, usePathname } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { CalendarHeart, Globe2, Sparkles } from "lucide-react-native";

import { api } from "~/utils/api";

const AddButtonView = ({ expoPushToken }: { expoPushToken: string }) => {
  const [text, setText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  const utils = api.useUtils();
  const eventFromRawTextAndNotification =
    api.ai.eventFromRawTextThenCreateThenNotification.useMutation({
      onSettled: () => void utils.event.invalidate(),
    });
  const { user } = useUser();
  const pathname = usePathname();

  const handleAdd = () => {
    if (!text.trim()) return;
    eventFromRawTextAndNotification.mutate({
      rawText: text,
      timezone: "America/Los_Angeles",
      expoPushToken: expoPushToken,
      lists: [],
      userId: user?.externalId || user?.id || "",
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
    <View className="absolute bottom-0 left-0 right-0">
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

      <View className="relative flex-row items-center justify-around bg-interactive-2 pb-6 pt-1.5">
        <Link href="/" asChild>
          <TouchableOpacity className="flex-1 items-center gap-1 py-2">
            <CalendarHeart
              size={28}
              color={pathname === "/" ? "#5A32FB" : "#627496"}
            />
            <Text
              className={`text-xs font-medium ${pathname === "/" ? "text-interactive-1" : "text-neutral-2"}`}
            >
              My Feed
            </Text>
          </TouchableOpacity>
        </Link>
        <Link href="/discover" asChild>
          <TouchableOpacity className="flex-1 items-center gap-1 py-2">
            <Globe2
              size={28}
              color={pathname === "/discover" ? "#5A32FB" : "#627496"}
            />
            <Text
              className={`text-xs font-medium ${pathname === "/discover" ? "text-interactive-1" : "text-neutral-2"}`}
            >
              Discover
            </Text>
          </TouchableOpacity>
        </Link>
        <TouchableOpacity
          className="absolute -top-16 right-4 items-center justify-center rounded-full bg-interactive-2 p-3 shadow-lg"
          onPress={() => setModalVisible(true)}
        >
          <Sparkles size={24} color="#5A32FB" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AddButtonView;
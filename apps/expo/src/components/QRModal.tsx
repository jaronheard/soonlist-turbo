import React from "react";
import {
  Dimensions,
  Modal,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { X } from "lucide-react-native";

import type { RouterOutputs } from "~/utils/api";
import Config from "~/utils/config";

interface QRModalProps {
  isVisible: boolean;
  onClose: () => void;
  event: RouterOutputs["event"]["getUpcomingForUser"][number];
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const QR_SIZE = SCREEN_WIDTH * 0.7;

export function QRModal({ isVisible, onClose, event }: QRModalProps) {
  const eventUrl = `${Config.apiBaseUrl}/event/${event.id}`;

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-2">
            <TouchableOpacity
              onPress={onClose}
              className="rounded-full p-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="flex-1 items-center justify-center">
            {/* QR Container */}
            <View className="rounded-3xl bg-white p-8">
              <QRCode
                value={eventUrl}
                size={QR_SIZE}
                backgroundColor="white"
                color="black"
              />
            </View>

            {/* Event Info */}
            <View className="mt-8 items-center px-4">
              <Text className="text-center text-xl font-semibold text-white">
                {event.event.name}
              </Text>
              <Text className="mt-2 text-center text-base text-gray-400">
                Shared by {event.user.username}
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

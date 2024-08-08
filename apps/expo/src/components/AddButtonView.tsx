import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { Sparkles } from "lucide-react-native";

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
    <View style={styles.container}>
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
              <View style={styles.modalView}>
                <TextInput
                  ref={textInputRef}
                  style={styles.input}
                  placeholder="Describe your event"
                  value={text}
                  onChangeText={setText}
                  multiline
                  numberOfLines={4}
                  onSubmitEditing={handleAdd}
                />
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleAdd}
                >
                  <Sparkles size={16} color="white" />
                  <Text style={styles.submitButtonText}>Add Event</Text>
                </TouchableOpacity>
                <Text style={styles.noteText}>
                  <Text style={{ fontWeight: "bold" }}>Pro tip:</Text> Use our
                  share extension to instantly add images and text to Soonlist
                  from anywhere!
                </Text>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    width: "100%",
    marginBottom: 15,
    height: 90,
  },
  submitButton: {
    backgroundColor: "#5A32FB",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 25,
    alignItems: "center",
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 8,
  },
  fab: {
    backgroundColor: "#E0D9FF",
    width: 64,
    height: 64,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FEEA9F",
  },
  fabText: {
    color: "#5A32FB",
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 3,
  },
  noteText: {
    marginTop: 10,
    fontSize: 12,
    color: "#627496",
    textAlign: "center",
  },
});

export default AddButtonView;

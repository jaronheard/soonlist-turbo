import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface UpdateRequiredModalProps {
  visible: boolean;
}

const APP_STORE_URL = "https://apps.apple.com/app/id6670222216";

export function UpdateRequiredModal({ visible }: UpdateRequiredModalProps) {
  const handleOpenAppStore = () => {
    void Linking.openURL(APP_STORE_URL);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        // Non-dismissible - do nothing
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Update Required</Text>
          <Text style={styles.message}>
            A new version of Soonlist is available. Please update to continue
            using the app.
          </Text>
          <Pressable onPress={handleOpenAppStore} style={styles.button}>
            <Text style={styles.buttonText}>Update Now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 16,
  },
  container: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
    color: "#111827",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    color: "#4B5563",
    lineHeight: 22,
  },
  button: {
    backgroundColor: "#5A32FB", // interactive-1 color
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

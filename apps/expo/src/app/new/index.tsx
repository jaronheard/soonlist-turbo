import { useEffect, useState } from "react";
import { Image, Pressable, SafeAreaView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { useUser } from "@clerk/clerk-expo";
import { FlashList } from "@shopify/flash-list";

import type { RouterOutputs } from "~/utils/api";
import SignInWithOAuth from "~/components/SignInWithOAuth";
import { api } from "~/utils/api";
import { _getTextFromImage, _uploadImage } from "~/utils/images";
import { getRandomPath } from "~/utils/paths";

export function List(props: {
  list: RouterOutputs["list"]["getAllForUser"][number];
  // onDelete: () => void;
}) {
  return <Text>{props.list.name}</Text>;
}

export function UsersListsList(props: {
  lists: RouterOutputs["list"]["getAllForUser"];
}) {
  return (
    <FlashList
      data={props.lists}
      estimatedItemSize={20}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={(list) => <List list={list.item} />}
    />
  );
}

export default function Page() {
  // get user from clerk
  const { isLoaded, user } = useUser();
  const { shareIntent } = useShareIntentContext();

  // In case the user signs out while on the page.
  if (!isLoaded || !user?.username) {
    return <SignInWithOAuth />;
  }

  const listsQuery = api.list.getAllForUser.useQuery({
    userName: user.username,
  });
  const utils = api.useUtils();
  const file = shareIntent.files?.[0];
  const webUrl = shareIntent.webUrl;

  return (
    <SafeAreaView className=" bg-background">
      {/* Changes page title visible on the header */}
      <Stack.Screen options={{ title: "Choose List" }} />
      <View className="h-full w-full bg-background p-4">
        {file && (
          <Image
            key={file.path}
            source={{ uri: file.path }}
            className="h-24 w-24"
          />
        )}
        {webUrl && <Image source={{ uri: webUrl }} className="h-24 w-24" />}
        <Pressable
          onPress={() => void utils.event.invalidate()}
          className="flex items-center rounded-lg bg-primary p-2"
        >
          <Text className="text-foreground"> Refresh list</Text>
        </Pressable>
        <EventFromRawText />

        {listsQuery.data && <UsersListsList lists={listsQuery.data} />}
      </View>
    </SafeAreaView>
  );
}

function EventFromRawText() {
  const { shareIntent, resetShareIntent } = useShareIntentContext();
  const [state, setState] = useState({
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    textFromImage: undefined as string | undefined,
    uploading: false,
    path: getRandomPath(),
    fileExtension: "",
  });

  const reset = () => {
    setState({
      textFromImage: undefined,
      uploading: false,
      path: getRandomPath(),
      fileExtension: "",
    });
    resetShareIntent();
  };

  // format is /uploads/YYYY/MM/DD/fileName.extension with leading 0s
  const year = new Date().getUTCFullYear();
  const month = String(new Date().getUTCMonth() + 1).padStart(2, "0");
  const day = String(new Date().getUTCDate()).padStart(2, "0");
  const folderPath = `/uploads/${year}/${month}/${day}`;

  const filePathParam = state.path.fileName
    ? `filePath=${folderPath}/${state.path.fileName}${state.fileExtension}`
    : "";

  const file = shareIntent.files?.[0];

  useEffect(() => {
    if (file?.mimeType.startsWith("image/") && !state.uploading) {
      const mimeTypeExtension = file.mimeType.split("/")[1];
      setState((prev) => ({ ...prev, fileExtension: `.${mimeTypeExtension}` }));
      _getTextFromImage(file)
        .then((text) => {
          if (typeof text === "string") {
            console.log("Text from image:", text);
            setState((prev) => ({ ...prev, textFromImage: text }));
          }
        })
        .catch((e) => {
          console.error("Failed to get text from image:", e);
        });
      setState((prev) => ({ ...prev, uploading: true }));
      _uploadImage(file.path, state.path, mimeTypeExtension || "jpg")
        .then(
          (result) =>
            result.success &&
            setState((prev) => ({ ...prev, uploading: false })),
        )
        .catch((e) => {
          console.error("Failed to upload the file:", e);
        });
    }
  }, [file, state.path, state.uploading]);

  // simple status message
  return (
    <View>
      {state.textFromImage ? (
        state.uploading ? (
          <Text>Uploading...</Text>
        ) : (
          <Text>Uploaded!</Text>
        )
      ) : (
        <Text>Getting text from image...</Text>
      )}
    </View>
  );
}

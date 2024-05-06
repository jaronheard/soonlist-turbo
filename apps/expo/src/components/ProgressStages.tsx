import type { SubmitHandler } from "react-hook-form";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, X } from "lucide-react";
import { useForm } from "react-hook-form";

import ImageCropperSmall from "./ImageCropperSmall";
import { Logo } from "./Logo";
import { useNewEventContext } from "./NewEventContext"; // Replace with your context

// Replace with your actual components and context
import { NewEventFooterButtons } from "./NewEventFooterButtons"; // Replace with your component

import { Status, useNewEventProgressContext } from "./NewEventProgressContext"; // Replace with your context
import { Organize } from "./Organize"; // Replace with your Organize component
import { organizeFormSchema } from "./organizeFormSchema"; // Replace with your schema

import { Button } from "./ui/button";

function ProgressStagesWrapper({
  filePath,
  children,
  onClickNextOrganize,
}: {
  filePath: string;
  children: React.ReactNode;
  onClickNextOrganize?: () => void;
}) {
  const { status, goToPreviousStatus } = useNewEventProgressContext();
  const [showCropActions, setShowCropActions] = useState(false);

  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      {/* Header */}
      <View
        style={{
          position: "absolute",
          top: 20,
          left: 0,
          right: 0,
          zIndex: 10,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Button
          onPress={goToPreviousStatus}
          disabled={status === Status.Organize}
        >
          <ChevronLeft />
        </Button>
        <ImageCropperSmall filePath={filePath} />
        <Button onPress={() => {}}>
          <X />
        </Button>
      </View>

      {/* Logo */}
      <View style={{ position: "absolute", top: 80, zIndex: 20 }}>
        <Logo />
      </View>

      {/* Content */}
      <View style={{ paddingTop: 140 }}>{children}</View>

      {/* Footer Buttons */}
      <NewEventFooterButtons onClickNextOrganize={onClickNextOrganize} />
    </View>
  );
}

export function ProgressStages({ filePath, lists, Preview }) {
  const { status, goToNextStatus } = useNewEventProgressContext();
  const { organizeData, setOrganizeData, eventData } = useNewEventContext();
  const { notes, visibility, lists: eventLists } = organizeData;

  const form = useForm({
    resolver: zodResolver(organizeFormSchema),
    defaultValues: {
      notes: notes || "",
      visibility: visibility || "public",
      lists: eventLists,
    },
  });

  const onSubmit: SubmitHandler = (data) => {
    setOrganizeData(data);
    goToNextStatus();
  };

  if (status === Status.Organize) {
    return (
      <ProgressStagesWrapper
        filePath={filePath}
        onClickNextOrganize={form.handleSubmit(onSubmit)}
      >
        <>
          <Organize lists={lists || []} form={form} />
          {/* This ensures that the event starts being processed by the LLM immediately */}
          <View style={{ display: "none" }}>{Preview}</View>
        </>
      </ProgressStagesWrapper>
    );
  }

  if (status === Status.Preview) {
    return (
      <ProgressStagesWrapper filePath={filePath}>
        {Preview}
      </ProgressStagesWrapper>
    );
  }

  if (status === Status.Publish) {
    return (
      <ProgressStagesWrapper filePath={filePath}>
        <>
          <Text>{JSON.stringify(eventData, null, 2)}</Text>
          <Text>{JSON.stringify(organizeData, null, 2)}</Text>
        </>
      </ProgressStagesWrapper>
    );
  }

  return null;
}

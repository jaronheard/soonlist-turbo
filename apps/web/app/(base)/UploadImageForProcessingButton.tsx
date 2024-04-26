"use client";
import { UploadDropzone } from "@bytescale/upload-widget-react";
import { useRouter } from "next/navigation";
import { useContext } from "react";
import { TimezoneContext } from "@/context/TimezoneContext";
import { bytescaleWidgetOptions } from "@/components/ImageUpload";

const widgetOptions = { ...bytescaleWidgetOptions };

export const UploadImageForProcessingButton = () => {
  const router = useRouter();
  const { timezone } = useContext(TimezoneContext);
  return (
    <UploadDropzone
      options={widgetOptions}
      onUpdate={({ uploadedFiles }) => {
        if (uploadedFiles.length > 0) {
          const filePath = uploadedFiles[0]?.filePath;
          if (filePath) {
            router.push(`/new?filePath=${filePath}&timezone=${timezone}`);
          }
        }
      }}
    ></UploadDropzone>
  );
};

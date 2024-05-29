"use client";

import { useContext } from "react";
import { useRouter } from "next/navigation";
import { UploadDropzone } from "@bytescale/upload-widget-react";

import { bytescaleWidgetOptions } from "~/components/ImageUpload";
import { TimezoneContext } from "~/context/TimezoneContext";

const widgetOptions = {
  ...bytescaleWidgetOptions,
  editor: {
    images: {
      crop: false,
      preview: false,
    },
  },
};

export const UploadImageForProcessingButton = () => {
  const router = useRouter();
  const { timezone } = useContext(TimezoneContext);
  return (
    <UploadDropzone
      className="max-h-48 [&>div>div>div>div>label]:!inline-flex [&>div>div>div>div>label]:!h-11 [&>div>div>div>div>label]:!items-center [&>div>div>div>div>label]:!justify-center [&>div>div>div>div>label]:!whitespace-nowrap [&>div>div>div>div>label]:!rounded-lg [&>div>div>div>div>label]:!bg-primary [&>div>div>div>div>label]:!px-8 [&>div>div>div>div>label]:!text-lg [&>div>div>div>div>label]:!font-medium [&>div>div>div>div>label]:!leading-none [&>div>div>div>div>label]:!text-primary-foreground [&>div>div>div>div>label]:!ring-offset-background [&>div>div>div>div>label]:!transition-colors [&>div>div>div>div>label]:hover:!bg-primary/90 [&>div>div>div>div>label]:focus-visible:!outline-none [&>div>div>div>div>label]:focus-visible:!ring-2 [&>div>div>div>div>label]:focus-visible:!ring-ring [&>div>div>div>div>label]:focus-visible:!ring-offset-2 [&>div>div>div>div>label]:disabled:!pointer-events-none [&>div>div>div>div>label]:disabled:!opacity-50 [&>div>div>div]:!inset-0 [&>div>div>div]:rounded-sm"
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

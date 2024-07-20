/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useRef, useState } from "react";
import * as Bytescale from "@bytescale/sdk";

import "react-image-crop/dist/ReactCrop.css";

import type { Crop } from "react-image-crop";
import { UploadButton } from "@bytescale/upload-widget-react";
import { Scissors, SwitchCamera, Trash, Upload } from "lucide-react";
import { centerCrop, makeAspectCrop, ReactCrop } from "react-image-crop";

import { Button } from "@soonlist/ui/button";
import { CardTitle } from "@soonlist/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@soonlist/ui/dialog";

import { useCroppedImageContext } from "~/context/CroppedImageContext";
import { cn, extractFilePath } from "~/lib/utils";

export function buildDefaultUrl(filePath: string) {
  return Bytescale.UrlBuilder.url({
    accountId: "12a1yek",
    filePath: filePath,
    options: {},
  });
}

export const bytescaleWidgetOptions = {
  apiKey: "public_12a1yekATNiLj4VVnREZ8c7LM8V8",
  editor: {
    images: {
      crop: true,
      preview: true,
    },
  },
  mimeTypes: [
    "image/avif",
    "image/bmp",
    "image/gif",
    "image/heic",
    "image/heif",
    "image/jpeg",
    "image/jp2",
    "image/jpeg",
    "image/jpx",
    "image/png",
    "application/octet-stream",
    "image/svg+xml",
    "image/tiff",
    "image/webp",
  ],
  styles: {
    colors: {
      active: "#E0D9FF",
      error: "#ba2727",
      primary: "#5A32FB",
      shade100: "#162135",
      shade200: "#28344d",
      shade300: "#28344d",
      shade400: "#28344d",
      shade500: "#627496",
      shade600: "#627496",
      shade700: "#DCE0E8",
      shade800: "#DCE0E8",
      shade900: "#F7F7F7",
    },
    fontFamilies: {
      base: "var(--font-plex-sans)",
    },
  },
  locale: {
    uploadFileBtn: "Upload an image",
    orDragDropFile: "...or drag and drop an image here",
  },
};

const buildCroppedUrl = (
  filePath: string,
  opts: {
    naturalWidth: number;
    naturalHeight: number;
    crop: Crop;
    targetAspect: number;
  },
): string => {
  const { naturalWidth, naturalHeight, crop, targetAspect } = opts;
  const validOptions =
    naturalHeight > 0 && naturalWidth > 0 && targetAspect > 0;
  if (!validOptions) {
    console.error("buildAllCropUrls was called with invalid options:", opts);
    return "";
  }
  // Convert crop percentages to pixels
  const pxCrop = {
    x: Math.round(naturalWidth * (crop.x / 100)),
    y: Math.round(naturalHeight * (crop.y / 100)),
    width: Math.round(naturalWidth * (crop.width / 100)),
    height: Math.round(naturalHeight * (crop.height / 100)),
  };

  // Calculate current aspect ratio
  const currentAspect = pxCrop.width / pxCrop.height;

  // Adjust dimensions to match the target aspect ratio
  if (currentAspect < targetAspect) {
    // If the crop is too tall for the width, adjust height down
    const newHeight = pxCrop.width / targetAspect;
    pxCrop.y += (pxCrop.height - newHeight) / 2; // Keep it centered vertically
    pxCrop.height = newHeight;
  } else if (currentAspect > targetAspect) {
    // If the crop is too wide for the height, adjust width down
    const newWidth = pxCrop.height * targetAspect;
    pxCrop.x += (pxCrop.width - newWidth) / 2; // Keep it centered horizontally
    pxCrop.width = newWidth;
  }

  // Make sure to round the values after adjustments
  pxCrop.x = Math.round(pxCrop.x);
  pxCrop.y = Math.round(pxCrop.y);
  pxCrop.width = Math.round(pxCrop.width);
  pxCrop.height = Math.round(pxCrop.height);

  // Construct the URL for the Image Cropping API
  const croppedImageUrl = Bytescale.UrlBuilder.url({
    accountId: "12a1yek",
    filePath: filePath, // Ensure filePath is defined and contains the path to the image
    options: {
      transformation: "image",
      transformationParams: {
        "crop-x": pxCrop.x,
        "crop-y": pxCrop.y,
        "crop-w": pxCrop.width,
        "crop-h": pxCrop.height,
      },
    },
  });

  return croppedImageUrl;
};

const buildAllCropUrls = (
  filePath: string,
  opts: { naturalWidth: number; naturalHeight: number; crop: Crop },
) => {
  const { naturalWidth, naturalHeight, crop } = opts;
  const newCroppedImagesUrls = {} as Record<string, string>;

  const validOptions = naturalHeight > 0 && naturalWidth > 0;
  if (!validOptions) {
    console.error("buildAllCropUrls was called with invalid options:", opts);
    return newCroppedImagesUrls;
  }

  if (validOptions) {
    const aspectRatios = {
      square: 1,
      fourThree: 4 / 3,
      sixteenNine: 16 / 9,
    };
    const cropAspectRatio = crop.width / crop.height;
    const imageAspectRatio = naturalWidth / naturalHeight;
    const croppedImageAspectRatio = cropAspectRatio * imageAspectRatio;
    const aspectRatioWithOriginalAndCropped = {
      ...aspectRatios,
      cropped: croppedImageAspectRatio,
      original: naturalWidth / naturalHeight,
    };

    // Get the cropped image URL for the API
    for (const [key, aspect] of Object.entries(
      aspectRatioWithOriginalAndCropped,
    )) {
      const croppedImageUrl = buildCroppedUrl(filePath, {
        naturalWidth: naturalWidth,
        naturalHeight: naturalHeight,
        crop,
        targetAspect: aspect,
      });
      newCroppedImagesUrls[key] = croppedImageUrl;
    }

    newCroppedImagesUrls.filePath = filePath;
  }
  return newCroppedImagesUrls;
};

const defaultCrop = (opts: { naturalWidth: number; naturalHeight: number }) => {
  const { naturalWidth, naturalHeight } = opts;

  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 100,
        height: 100,
      },
      naturalWidth / naturalHeight,
      naturalWidth,
      naturalHeight,
    ),
    naturalWidth,
    naturalHeight,
  );
};

export function ImageUpload({
  images,
  filePath: filePathFromSearchParam,
}: {
  images?: string[];
  filePath?: string;
}) {
  const croppedImageUrlFromProps = images?.[3];
  const filePathFromImages = croppedImageUrlFromProps
    ? extractFilePath(croppedImageUrlFromProps)
    : undefined;
  const [filePath, setFilePath] = useState(
    filePathFromSearchParam || filePathFromImages || "",
  );
  const initialImageUrl =
    croppedImageUrlFromProps || (filePath && buildDefaultUrl(filePath)) || "";
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const { croppedImagesUrls, setCroppedImagesUrls } = useCroppedImageContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const fullImageRef = useRef<HTMLImageElement>(null);
  const { naturalHeight, naturalWidth } = fullImageRef.current || {};
  const hasNaturalDimensions =
    naturalHeight && naturalWidth && naturalHeight > 0 && naturalWidth > 0;
  const [imageLoaded, setImageLoaded] = useState(false);

  // if initialImageUrl changes from "" to something else, set imageUrl to initialImageUrl
  useEffect(() => {
    if (initialImageUrl && initialImageUrl !== "") {
      setImageUrl(initialImageUrl);
    }
  }, [initialImageUrl, setImageUrl]);

  // if filePath isn't set, updated it when filePathFromSearchParam changes
  useEffect(() => {
    if (!filePath && filePathFromSearchParam) {
      setFilePath(filePathFromSearchParam);
    }
  }, [filePathFromSearchParam, filePath, setFilePath]);

  useEffect(() => {
    // Reset the imageLoaded state whenever imageUrl changes
    setImageLoaded(false);

    const imageElement = fullImageRef.current;

    if (imageElement && imageUrl) {
      const handleLoad = () => {
        // Set imageLoaded to true when the image is loaded
        setImageLoaded(true);
      };

      // Add event listener to the image element
      imageElement.addEventListener("load", handleLoad);

      // Check if image is already loaded (cached images)
      if (imageElement.complete && imageElement.naturalWidth) {
        setImageLoaded(true);
      }

      // Clean up
      return () => {
        imageElement.removeEventListener("load", handleLoad);
      };
    }
  }, [imageUrl]);

  useEffect(() => {
    if (imageLoaded && hasNaturalDimensions) {
      if (imageUrl === croppedImageUrlFromProps) {
        return;
      }
      const crop = defaultCrop({
        naturalWidth: naturalWidth,
        naturalHeight: naturalHeight,
      });
      setCrop(crop);
      const cropUrls = buildAllCropUrls(filePath, {
        naturalWidth: naturalWidth,
        naturalHeight: naturalHeight,
        crop: crop as Crop,
      });
      setCroppedImagesUrls(cropUrls);
    }
  }, [imageLoaded]);

  const onCropComplete = (crop: Crop, percentageCrop: Crop) => {
    if (!hasNaturalDimensions) {
      console.error(
        "onCropComplete was called before natural dimensions were set.",
      );
      return;
    }
    const cropUrls = buildAllCropUrls(filePath, {
      naturalWidth: naturalWidth || 0,
      naturalHeight: naturalHeight || 0,
      crop: percentageCrop,
    });
    setCroppedImagesUrls(cropUrls);
  };

  const onCropChange = (newCrop: Crop, newPercentageCrop: Crop) => {
    setCrop(newPercentageCrop);
  };

  const croppedImagesMatchFilePath = Object.values(croppedImagesUrls).some(
    (url) => url.includes(filePath),
  );
  const showCroppedImage =
    croppedImagesMatchFilePath && croppedImagesUrls.cropped;

  return (
    <div>
      <>
        {imageUrl && (
          <>
            <div className="p-1"></div>
            <img
              src={imageUrl}
              alt="Full Image Preview"
              className={cn(
                "mx-auto block h-auto max-h-96 w-full object-contain",
                {
                  hidden: showCroppedImage,
                },
              )}
              ref={fullImageRef}
            />
            <img
              src={croppedImagesUrls.cropped}
              alt="Cropped Preview"
              className={cn(
                "mx-auto block w-80 overflow-hidden object-cover sm:w-96",
                {
                  hidden: !showCroppedImage || isModalOpen,
                },
              )}
            />
            <div className="p-1"></div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogContent className="max-h-[80dvh] overflow-y-auto">
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="size-6" />
                  Crop
                </CardTitle>
                <ReactCrop
                  crop={crop}
                  onComplete={onCropComplete}
                  onChange={onCropChange}
                  className="max-h-[80dvh] max-w-[80dvw]"
                >
                  <img src={imageUrl} alt="Cropper img" />
                </ReactCrop>
                <DialogFooter className="border-t border-neutral-3">
                  <Button onClick={() => setIsModalOpen(false)} size="sm">
                    Done
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </>
      <div className="p-3"></div>
      <div className="mx-auto flex flex-wrap justify-center gap-4">
        {imageUrl && (
          <Button
            onClick={() => setIsModalOpen(true)}
            size="sm"
            variant="outline"
            type="button"
          >
            <Scissors className="mr-2 size-4" />
            Crop
          </Button>
        )}
        <UploadButton
          options={bytescaleWidgetOptions}
          onComplete={(files) => {
            if (files.length > 0) {
              // push the file path to the search params
              const filePath = files[0]!.filePath;
              const fileUrl = files[0]!.fileUrl;
              setFilePath(filePath);
              setImageUrl(fileUrl);
            }
          }}
        >
          {({ onClick }) => (
            <Button onClick={onClick} variant="secondary" size="sm">
              {imageUrl ? (
                <SwitchCamera className="mr-2 size-4" />
              ) : (
                <Upload className="mr-2 size-4" />
              )}
              {imageUrl ? "Replace" : "Upload"}
            </Button>
          )}
        </UploadButton>
        {imageUrl && (
          <Button
            variant="destructive"
            onClick={() => {
              setFilePath("");
              setImageUrl("");
              setCroppedImagesUrls({ deleted: "true" });
            }}
            size="sm"
          >
            <Trash className="mr-2 size-4" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

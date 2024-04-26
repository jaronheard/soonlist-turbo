/* eslint-disable @next/next/no-img-element */
"use client";

import * as Bytescale from "@bytescale/sdk";
import React, { useState, useRef, useEffect } from "react";
import "react-image-crop/dist/ReactCrop.css";
import { SwitchCamera, Upload, Scissors, PencilIcon } from "lucide-react";
import { UploadButton } from "@bytescale/upload-widget-react";
import { Dialog } from "@headlessui/react";
import {
  ReactCrop,
  type Crop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCroppedImageContext } from "@/context/CroppedImageContext";
import { cn, extractFilePath } from "@/lib/utils";
import {
  buildDefaultUrl,
  bytescaleWidgetOptions,
} from "@/components/ImageUpload";

const buildCroppedUrl = (
  filePath: string,
  opts: {
    naturalWidth: number;
    naturalHeight: number;
    crop: Crop;
    targetAspect: number;
  }
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
  opts: { naturalWidth: number; naturalHeight: number; crop: Crop }
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
      aspectRatioWithOriginalAndCropped
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
      naturalHeight
    ),
    naturalWidth,
    naturalHeight
  );
};

export function ImageCropperSmall({
  images,
  filePath: filePathFromSearchParam,
  showActions,
  setShowActions,
}: {
  images?: string[];
  filePath?: string;
  showActions?: boolean;
  setShowActions?: (show: boolean) => void;
}) {
  const croppedImageUrlFromProps = images?.[3];
  const filePathFromImages = croppedImageUrlFromProps
    ? extractFilePath(croppedImageUrlFromProps)
    : undefined;
  const [filePath, setFilePath] = useState(
    filePathFromSearchParam || filePathFromImages || ""
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
  const [imageCheckInterval, setImageCheckInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const prevImageUrlRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const imageElement = fullImageRef.current;

    if (imageElement && imageUrl) {
      const handleLoad = () => {
        setIsImageLoading(false);
        if (imageCheckInterval) {
          clearInterval(imageCheckInterval);
          setImageCheckInterval(null);
        }
      };

      setIsImageLoading(true);
      imageElement.addEventListener("load", handleLoad);

      // Start an interval to check for the image availability if not loaded yet
      if (!imageElement.complete || !imageElement.naturalWidth) {
        const interval = setInterval(() => {
          imageElement.src += ""; // Trigger a re-check by reassigning the src
        }, 1000);
        setImageCheckInterval(interval);
      }

      // Check if image is already loaded (cached images)
      if (imageElement.complete && imageElement.naturalWidth) {
        setIsImageLoading(false);
      }

      // Clean up
      return () => {
        imageElement.removeEventListener("load", handleLoad);
        if (imageCheckInterval) {
          clearInterval(imageCheckInterval);
        }
      };
    }
  }, [imageCheckInterval, imageUrl]);

  useEffect(() => {
    prevImageUrlRef.current = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (!isImageLoading && hasNaturalDimensions) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImageLoading, hasNaturalDimensions]);

  const onCropComplete = (crop: Crop, percentageCrop: Crop) => {
    if (!hasNaturalDimensions) {
      console.error(
        "onCropComplete was called before natural dimensions were set."
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
    (url) => url.includes(filePath)
  );
  const showCroppedImage =
    croppedImagesMatchFilePath && croppedImagesUrls?.cropped;

  return (
    <div className="flex items-center justify-center gap-4">
      <div className="">
        {imageUrl && (
          <>
            <div className="relative h-40">
              <div
                className={cn(
                  "mx-auto block size-40 animate-pulse rounded-2xl border-2 bg-gray-50",
                  {
                    hidden: showCroppedImage || isModalOpen || !isImageLoading,
                  }
                )}
              />

              <img
                src={imageUrl}
                alt="Full Image Preview"
                className={cn(
                  "mx-auto block h-40 overflow-hidden object-cover",
                  {
                    hidden: showCroppedImage || isImageLoading,
                  }
                )}
                ref={fullImageRef}
              />

              <img
                src={croppedImagesUrls?.cropped}
                alt="Cropped Preview"
                className={cn(
                  "mx-auto block h-40 overflow-hidden object-cover",
                  {
                    hidden: !showCroppedImage || isModalOpen || isImageLoading,
                  }
                )}
              />
              {!showActions && (
                <div
                  className={cn(
                    buttonVariants({ size: "icon", variant: "secondary" }),
                    "absolute -bottom-2 left-1/2 -translate-x-1/2 scale-150 hover:bg-secondary"
                  )}
                >
                  <PencilIcon className="size-6" />
                </div>
              )}
            </div>

            <Dialog
              open={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              className="fixed inset-0 z-10 mx-auto overflow-y-hidden"
            >
              <div className="flex min-h-screen justify-center">
                <Dialog.Overlay className="fixed inset-0 bg-black opacity-70" />

                <div className="relative flex size-full flex-col items-center rounded bg-white p-4 sm:max-w-sm">
                  <Dialog.Title className="text-lg font-medium leading-6 text-gray-900">
                    Crop Image
                  </Dialog.Title>
                  <div className="p-2"></div>
                  <div className="p-4">
                    <ReactCrop
                      crop={crop}
                      onComplete={onCropComplete}
                      onChange={onCropChange}
                      className="max-h-[80svh]"
                    >
                      <img src={imageUrl} alt="Cropper img" />
                    </ReactCrop>
                  </div>

                  <div className="p-2"></div>
                  <Button
                    onClick={() => {
                      setIsModalOpen(false);
                      setShowActions && setShowActions(false);
                    }}
                    className="absolute right-2 top-2"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </Dialog>
          </>
        )}
      </div>
      {showActions && !isModalOpen && (
        <div className="mx-auto flex flex-col flex-wrap justify-center gap-4">
          {imageUrl && (
            <Button
              onClick={() => setIsModalOpen(true)}
              size="sm"
              variant="outline"
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
                {imageUrl ? "Swap" : "Add"}
              </Button>
            )}
          </UploadButton>
          <Button
            onClick={() => {
              setShowActions && setShowActions(false);
            }}
          >
            Done
          </Button>
          {/* {imageUrl && (
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
          )} */}
        </div>
      )}
    </div>
  );
}

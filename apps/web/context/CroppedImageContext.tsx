"use client";

import type { ReactNode } from "react";
import React, { createContext, useContext, useState } from "react";

interface CroppedImagesUrls {
  original?: string;
  square?: string;
  fourThree?: string;
  sixteenNine?: string;
  cropped?: string;
  filePath?: string;
  deleted?: string;
}
interface CroppedImageContextType {
  croppedImagesUrls: CroppedImagesUrls;
  setCroppedImagesUrls: (urls: CroppedImagesUrls) => void;
}

// Create context with a default value
const defaultValue: CroppedImageContextType = {
  croppedImagesUrls: {},
  setCroppedImagesUrls: () => {
    return null;
  },
};

const CroppedImageContext =
  createContext<CroppedImageContextType>(defaultValue);

// Create a provider component
export const CroppedImageProvider = ({ children }: { children: ReactNode }) => {
  const [croppedImagesUrls, setCroppedImagesUrls] = useState<CroppedImagesUrls>(
    {},
  );

  return (
    <CroppedImageContext.Provider
      value={{ croppedImagesUrls, setCroppedImagesUrls }}
    >
      {children}
    </CroppedImageContext.Provider>
  );
};

// Hook to use the context
export const useCroppedImageContext = () => useContext(CroppedImageContext);

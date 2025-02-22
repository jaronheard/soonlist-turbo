"use client";

import * as React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "../../../packages/ui/src/dialog";

interface ImageDialogProps {
  src: string;
  alt: string;
}

export function ImageDialog({ src, alt }: ImageDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-md">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-contain transition-transform hover:scale-105"
          />
        </div>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-[90vw] p-0 sm:max-w-[85vw]">
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-contain"
            priority
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

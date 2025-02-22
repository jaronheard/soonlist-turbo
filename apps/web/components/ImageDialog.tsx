"use client";

import * as React from "react";
import Image from "next/image";
import { X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogPrimitive,
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
      <DialogContent className="fixed inset-0 flex items-center justify-center bg-black/90 p-0">
        <div className="relative max-h-[95vh] max-w-[95vw]">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-contain"
            priority
            sizes="95vw"
          />
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70">
            <X className="size-6" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </div>
      </DialogContent>
    </Dialog>
  );
}

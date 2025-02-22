"use client";

import * as React from "react";
import Image from "next/image";
import { X } from "lucide-react";

import {
  Dialog,
  DialogClose,
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
      <DialogContent className="fixed inset-0 z-50 bg-black/90 p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
        <div className="relative flex h-full w-full items-center justify-center">
          <div className="relative aspect-[4/3] max-h-[85vh] w-auto">
            <Image
              src={src}
              alt={alt}
              fill
              className="rounded-lg object-contain"
              priority
              sizes="(max-width: 768px) 100vw, 85vw"
              quality={95}
            />
          </div>
          <DialogClose className="absolute right-6 top-6 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70">
            <X className="size-6" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

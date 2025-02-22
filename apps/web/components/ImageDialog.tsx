"use client";

import * as React from "react";
import Image from "next/image";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@soonlist/ui/dialog";
import { X } from "lucide-react";

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
      <DialogContent className="fixed inset-0 z-[100] bg-black/95 p-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:p-0">
        <div className="relative flex h-screen w-screen items-center justify-center">
          <div className="relative h-[90vh] max-h-screen w-[90vw] max-w-screen">
            <Image
              src={src}
              alt={alt}
              fill
              className="rounded-lg object-contain"
              priority
              sizes="90vw"
              quality={100}
            />
          </div>
          <DialogClose className="absolute right-4 top-4 rounded-full bg-white/20 p-2.5 text-white/90 transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/20">
            <X className="size-6" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

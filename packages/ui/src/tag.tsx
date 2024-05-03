import { cva } from "class-variance-authority";
import { X } from "lucide-react";

import type { TagInputProps, Tag as TagType } from "./tag-input";
import { cn } from ".";
import { Button } from "./button";

export const tagVariants = cva(
  "inline-flex items-center rounded-md border pl-2 text-sm transition-all",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        primary:
          "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        sm: "h-7 text-xs",
        md: "h-8 text-sm",
        lg: "h-9 text-base",
        xl: "h-10 text-lg",
      },
      shape: {
        default: "rounded-sm",
        rounded: "rounded-lg",
        square: "rounded-none",
        pill: "rounded-full",
      },
      borderStyle: {
        default: "border-solid",
        none: "border-none",
      },
      textCase: {
        uppercase: "uppercase",
        lowercase: "lowercase",
        capitalize: "capitalize",
      },
      interaction: {
        clickable: "cursor-pointer hover:shadow-md",
        nonClickable: "cursor-default",
      },
      animation: {
        none: "",
        fadeIn: "animate-fadeIn",
        slideIn: "animate-slideIn",
        bounce: "animate-bounce",
      },
      textStyle: {
        normal: "font-normal",
        bold: "font-bold",
        italic: "italic",
        underline: "underline",
        lineThrough: "line-through",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      shape: "default",
      borderStyle: "default",
      textCase: "capitalize",
      interaction: "nonClickable",
      animation: "fadeIn",
      textStyle: "normal",
    },
  },
);

export type TagProps = {
  tagObj: TagType;
  variant: TagInputProps["variant"];
  size: TagInputProps["size"];
  shape: TagInputProps["shape"];
  borderStyle: TagInputProps["borderStyle"];
  textCase: TagInputProps["textCase"];
  interaction: TagInputProps["interaction"];
  animation: TagInputProps["animation"];
  textStyle: TagInputProps["textStyle"];
  onRemoveTag: (id: string) => void;
} & Pick<TagInputProps, "direction" | "onTagClick" | "draggable">;

export const Tag: React.FC<TagProps> = ({
  tagObj,
  direction,
  draggable,
  onTagClick,
  onRemoveTag,
  variant,
  size,
  shape,
  borderStyle,
  textCase,
  interaction,
  animation,
  textStyle,
}) => {
  return (
    <span
      key={tagObj.id}
      draggable={draggable}
      className={cn(
        tagVariants({
          variant,
          size,
          shape,
          borderStyle,
          textCase,
          interaction,
          animation,
          textStyle,
        }),
        {
          "justify-between": direction === "column",
          "cursor-pointer": draggable,
        },
      )}
      onClick={() => onTagClick?.(tagObj)}
    >
      {tagObj.text}
      <Button
        type="button"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation(); // Prevent event from bubbling up to the tag span
          onRemoveTag(tagObj.id);
        }}
        className={cn("h-full px-3 py-1 hover:bg-transparent")}
      >
        <X size={14} />
      </Button>
    </span>
  );
};

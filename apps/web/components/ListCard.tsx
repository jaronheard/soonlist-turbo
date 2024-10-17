import Link from "next/link";
import { clsx } from "clsx";
import { EyeOff, SquareStack } from "lucide-react";

import { Badge } from "@soonlist/ui/badge";

import { cn } from "~/lib/utils";

const colors = ["bg-accent-blue", "bg-accent-orange", "bg-accent-green"];

const getInitialsFromString = (str: string) => {
  // limit to 2 initials
  const initials = str.match(/\b\w/g) || [];
  return ((initials.shift() || "") + (initials.pop() || "")).toUpperCase();
};

const getRainbowColorFromString = (initials: string) => {
  return colors[initials.charCodeAt(0) % colors.length];
};

export function ListCard(props: {
  name: string;
  id?: string;
  username: string;
  className?: string;
  visibility?: "public" | "private";
  variant?: "minimal" | "badge";
}) {
  if (props.variant === "badge") {
    return (
      <Link href={props.id ? `/list/${props.id}` : `/${props.username}/events`}>
        <Badge className="max-w-fit" variant={"secondary"}>
          <SquareStack className="mr-1 size-2 text-interactive-1" />
          {props.visibility === "private" && (
            <EyeOff className="mr-1 inline size-2" />
          )}
          {props.name}
        </Badge>
      </Link>
    );
  }

  if (props.variant === "minimal") {
    return (
      <div className="inline-flex items-center overflow-hidden rounded-lg border-2 border-accent-yellow bg-interactive-2">
        <Link
          href={props.id ? `/list/${props.id}` : `/${props.username}/events`}
          className={clsx(
            getRainbowColorFromString(props.name),
            "text-white flex h-10 w-10 items-center justify-center rounded-l-md text-lg font-bold",
          )}
        >
          {getInitialsFromString(props.name)}
        </Link>
        <div className="flex min-w-0 flex-1 items-center px-3">
          <div className="truncate text-sm font-medium text-interactive-1">
            {props.visibility === "private" && (
              <EyeOff className="mr-1 inline h-3 w-3" />
            )}
            {props.name}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "item-center flex overflow-hidden rounded-xl border-[5px] border-accent-yellow bg-interactive-2",
        props.className,
      )}
    >
      <Link
        href={props.id ? `/list/${props.id}` : `/${props.username}/events`}
        className={clsx(
          getRainbowColorFromString(props.name),
          "text-white flex size-[5.375rem] flex-shrink-0 items-center justify-center rounded-l-md pt-1 font-heading text-4xl font-bold leading-none",
        )}
      >
        {getInitialsFromString(props.name)}
      </Link>
      <div className="flex min-w-0 grow flex-col gap-1 overflow-hidden p-5">
        <Link
          href={props.id ? `/list/${props.id}` : `/${props.username}/events`}
          className="flex justify-between"
        >
          <div className="truncate text-xl font-bold leading-6 tracking-wide text-interactive-1">
            {props.visibility === "private" ? (
              <EyeOff className="mr-2 inline" />
            ) : (
              ""
            )}
            {props.name}
          </div>
          <SquareStack className="ml-4 size-6 text-interactive-1" />
        </Link>
        <div className="truncate text-lg font-medium leading-none text-neutral-2">
          {props.id ? "saved by " : "saved by "}
          <Link
            className="inline font-semibold text-interactive-1"
            href={`/${props.username}/events`}
          >
            @{props.username}
          </Link>
        </div>
      </div>
    </div>
  );
}

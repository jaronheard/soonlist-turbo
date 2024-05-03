import Link from "next/link";
import { clsx } from "clsx";
import { SquareStack } from "lucide-react";

import { cn } from "~/lib/utils";

const colors = [
  // "bg-accent-blue",
  "bg-accent-red",
  "bg-accent-orange",
  "bg-accent-green",
];

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
}) {
  return (
    <div
      className={cn(
        "item-center border-accent-yellow bg-interactive-2 flex overflow-hidden rounded-xl border-[5px]",
        props.className,
      )}
    >
      <Link
        href={props.id ? `/list/${props.id}` : `/${props.username}/events`}
        className={clsx(
          getRainbowColorFromString(props.name),
          "font-heading flex size-[5.375rem] flex-shrink-0 items-center justify-center rounded-l-md pt-1 text-4xl font-bold leading-none text-white",
        )}
      >
        {getInitialsFromString(props.name)}
      </Link>
      <div className="flex min-w-0 grow flex-col gap-1 p-5">
        <Link
          href={props.id ? `/list/${props.id}` : `/${props.username}/events`}
          className="flex justify-between"
        >
          <div className="text-interactive-1 truncate text-xl font-bold leading-6 tracking-wide">
            {props.name}
          </div>
          <SquareStack className="text-interactive-1 ml-4 size-6" />
        </Link>
        <div className="text-neutral-2 truncate text-lg font-medium leading-none">
          {props.id ? "curated by " : "by "}
          <Link
            className="text-interactive-1 font-semibold"
            href={`/${props.username}/events`}
          >
            @{props.username}
          </Link>
        </div>
      </div>
    </div>
  );
}

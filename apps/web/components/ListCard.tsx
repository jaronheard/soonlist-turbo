import { clsx } from "clsx";
import { SquareStack } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
        "item-center flex overflow-hidden rounded-xl border-[5px] border-accent-yellow bg-interactive-2",
        props.className
      )}
    >
      <Link
        href={props?.id ? `/list/${props.id}` : `/${props.username}/events`}
        className={clsx(
          getRainbowColorFromString(props.name),
          "size-[5.375rem] flex-shrink-0 items-center justify-center rounded-l-md text-4xl font-bold font-heading leading-none text-white flex pt-1"
        )}
      >
        {getInitialsFromString(props.name)}
      </Link>
      <div className="flex min-w-0 grow flex-col gap-1 p-5">
        <Link
          href={props?.id ? `/list/${props.id}` : `/${props.username}/events`}
          className="flex justify-between"
        >
          <div className="truncate text-xl font-bold leading-6 tracking-wide text-interactive-1">
            {props.name}
          </div>
          <SquareStack className="ml-4 size-6 text-interactive-1" />
        </Link>
        <div className="truncate text-lg font-medium leading-none text-neutral-2">
          {props?.id ? "curated by " : "by "}
          <Link
            className="font-semibold text-interactive-1"
            href={`/${props.username}/events`}
          >
            @{props.username}
          </Link>
        </div>
      </div>
    </div>
  );
}

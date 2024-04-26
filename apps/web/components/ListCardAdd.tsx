import { PlusCircleIcon } from "@heroicons/react/20/solid";
import { clsx } from "clsx";
import Link from "next/link";

export function ListCardAdd() {
  return (
    <Link
      href={`/list/new`}
      className="item-center flex w-full overflow-hidden rounded-xl border-[5px] border-interactive-2 bg-interactive-2"
    >
      <div
        className={clsx(
          "bg-primary group-hover:bg-primary/90",
          "flex h-[5.375rem] w-[5.375rem] flex-shrink-0 items-center justify-center rounded-l-md text-sm font-medium text-white"
        )}
      >
        <PlusCircleIcon className="size-12" />
      </div>
      <div className="flex h-full flex-1 items-center truncate rounded-r-md border-y border-r border-dashed border-gray-200 bg-interactive-3">
        <div className="ml-5 truncate text-xl font-bold leading-6 tracking-wide text-interactive-1">
          New list
        </div>
      </div>
    </Link>
  );
}

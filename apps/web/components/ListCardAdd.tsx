import Link from "next/link";
import { PlusCircleIcon } from "@heroicons/react/20/solid";
import { clsx } from "clsx";

export function ListCardAdd() {
  return (
    <Link
      href={`/list/new`}
      className="item-center border-interactive-2 bg-interactive-2 flex w-full overflow-hidden rounded-xl border-[5px]"
    >
      <div
        className={clsx(
          "bg-primary group-hover:bg-primary/90",
          "flex h-[5.375rem] w-[5.375rem] flex-shrink-0 items-center justify-center rounded-l-md text-sm font-medium text-white",
        )}
      >
        <PlusCircleIcon className="size-12" />
      </div>
      <div className="bg-interactive-3 flex h-full flex-1 items-center truncate rounded-r-md border-y border-r border-dashed border-gray-200">
        <div className="text-interactive-1 ml-5 truncate text-xl font-bold leading-6 tracking-wide">
          New list
        </div>
      </div>
    </Link>
  );
}

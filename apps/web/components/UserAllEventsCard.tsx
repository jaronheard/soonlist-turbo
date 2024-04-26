import Link from "next/link";
import Image from "next/image";

export function UserAllEventsCard(props: {
  username: string;
  userImage: string;
}) {
  const { username, userImage } = props;

  return (
    <Link
      href={`/${username}/events`}
      className="item-center flex overflow-hidden rounded-xl border-[5px] border-accent-yellow bg-interactive-2"
    >
      <Image
        src={userImage}
        width={375}
        height={375}
        alt=""
        className="size-[5.375rem]"
      />
      <div className="flex flex-col gap-1 p-5">
        <div className="text-xl font-bold leading-6 tracking-wide text-interactive-1">
          All Events
        </div>
        <div className="text-lg font-medium leading-none text-neutral-2">
          by{" "}
          <span className="font-semibold text-interactive-1">@{username}</span>
        </div>
      </div>
    </Link>
  );
}

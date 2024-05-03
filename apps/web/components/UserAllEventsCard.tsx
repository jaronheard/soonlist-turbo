import Image from "next/image";
import Link from "next/link";

export function UserAllEventsCard(props: {
  username: string;
  userImage: string;
}) {
  const { username, userImage } = props;

  return (
    <Link
      href={`/${username}/events`}
      className="item-center border-accent-yellow bg-interactive-2 flex overflow-hidden rounded-xl border-[5px]"
    >
      <Image
        src={userImage}
        width={375}
        height={375}
        alt=""
        className="size-[5.375rem]"
      />
      <div className="flex flex-col gap-1 p-5">
        <div className="text-interactive-1 text-xl font-bold leading-6 tracking-wide">
          All Events
        </div>
        <div className="text-neutral-2 text-lg font-medium leading-none">
          by{" "}
          <span className="text-interactive-1 font-semibold">@{username}</span>
        </div>
      </div>
    </Link>
  );
}

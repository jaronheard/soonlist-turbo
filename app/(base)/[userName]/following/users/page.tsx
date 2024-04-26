import { UserInfo } from "@/components/UserInfo";
import { api } from "@/trpc/server";

type Props = { params: { userName: string } };

export default async function Page({ params }: Props) {
  const users = await api.user.getFollowing.query({
    userName: params.userName,
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex place-items-center gap-2">
        <p className="font-heading text-5xl font-bold leading-[3.5rem] tracking-tight text-neutral-1">
          Users followed by
        </p>
        <p className="font-heading text-5xl font-bold leading-[3.5rem] tracking-tight text-neutral-1">
          @{params.userName}
        </p>
      </div>
      <div className="p-4"></div>
      <div className="grid grid-cols-1 gap-4">
        {users.map((user) => (
          <UserInfo key={user.username} userName={user.username} />
        ))}
      </div>
      <div className="p-4"></div>
    </div>
  );
}

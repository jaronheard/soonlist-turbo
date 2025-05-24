import { auth } from "@clerk/nextjs/server";

import { AddListCard } from "~/components/AddListCard";
import { api } from "~/trpc/server";

export default async function Page(props: {
  params: Promise<{ listId: string }>;
}) {
  const params = await props.params;
  const { userId } = await auth.protect();
  const list = await api.list.get({ listId: params.listId });
  if (!list) {
    return <p className="text-lg text-gray-500">No list found.</p>;
  }
  if (userId !== list.user.id) {
    return <p className="text-lg text-gray-500">You do not have access.</p>;
  }

  return (
    <AddListCard
      name={list.name}
      description={list.description}
      update
      updateId={list.id}
      visibility={list.visibility}
    />
  );
}

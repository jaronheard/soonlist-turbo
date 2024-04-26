import { currentUser } from "@clerk/nextjs/server";
import { ListCard } from "./ListCard";
import { ListCardAdd } from "./ListCardAdd";
import { api } from "@/trpc/server";

type ListCardsForUserProps = {
  userName: string;
  limit: number;
};

export async function ListCardsForUser({
  userName,
}: // TODO: implement limit
ListCardsForUserProps) {
  const lists = await api.list.getAllForUser.query({
    userName,
  });

  const user = await currentUser();
  const self = user?.username === userName;
  const hideAll = !self && lists.length === 0;
  const listsToShow = lists.filter((list) => list.eventToLists.length > 0);
  const listsToUse = self ? lists : listsToShow;

  if (!lists || hideAll) {
    return <> </>;
  }

  return (
    <>
      <ul role="list" className="flex flex-wrap gap-5">
        {self && <ListCardAdd />}
        {listsToUse.map((list) => (
          <ListCard
            key={list.name}
            name={list.name}
            // count={list.eventToLists.length}
            id={list.id}
            username={list.user.username}
          />
        ))}
      </ul>
    </>
  );
}

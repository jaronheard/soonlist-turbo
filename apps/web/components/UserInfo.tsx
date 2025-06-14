import { currentUser } from "@clerk/nextjs/server";
import { preloadQuery } from "convex/nextjs";

import { api } from "@soonlist/backend/convex/_generated/api";

import { UserInfoClient } from "./UserInfoClient";

interface UserInfoProps {
  userId?: string;
  userName?: string;
  variant?: "default" | "description";
}


export async function UserInfo(props: UserInfoProps) {
  const activeUser = await currentUser();
  if (!props.userId && !props.userName) {
    return null;
  }

  let preloadedUser;
  if (props.userId) {
    preloadedUser = await preloadQuery(api.users.getById, { id: props.userId });
  } else if (props.userName) {
    preloadedUser = await preloadQuery(api.users.getByUsername, {
      userName: props.userName,
    });
  }

  if (!preloadedUser) {
    return null;
  }

  const self = activeUser?.username === props.userName || activeUser?.id === props.userId;

  return (
    <UserInfoClient
      variant={props.variant}
      self={self}
      preloadedUser={preloadedUser as any}
    />
  );
}

import type { User, UserPublicMetadata } from "@soonlist/db/types";

export const getPlanStatusFromUser = (user: User) => {
  const publicMetadata = user.publicMetadata as UserPublicMetadata;
  const name = publicMetadata.plan?.name || "";
  const currentPlanStatus = publicMetadata.plan?.status || "";
  const active =
    currentPlanStatus === "active" || currentPlanStatus === "trialing";
  const paid = name !== "free";
  const activePaid = active && paid;
  return {
    name,
    active,
    paid,
    activePaid,
  };
};


import type { User, UserPublicMetadata } from "@soonlist/cal/dbTypes";

export const getPlanStatusFromUser = (user: User) => {
  const publicMetadata = user.publicMetadata as UserPublicMetadata | null;
  const name = publicMetadata?.plan?.name || "";
  const currentPlanStatus = publicMetadata?.plan?.status || "";
  const active =
    currentPlanStatus === "active" || currentPlanStatus === "trialing";
  const paid = name !== "free";
  const activePaid = active && paid;
  const showDiscover = publicMetadata?.showDiscover ?? false;
  return {
    name,
    active,
    paid,
    activePaid,
    showDiscover,
  };
};

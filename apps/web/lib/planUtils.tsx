import type { MinimalUserForPlan } from "~/types/minimal";

export const getPlanStatusFromUser = (user: MinimalUserForPlan) => {
  const publicMetadata = user.publicMetadata;
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

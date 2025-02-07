import type { UserResource } from "@clerk/types";

export const getPlanStatusFromUser = (user: UserResource) => {
  const publicMetadata = user.publicMetadata as {
    stripe?: {
      customerId?: string;
    };
    plan?: {
      name?: string; //"free" | "personal" | "pro";
      productId?: string;
      status?: string;
      id?: string;
    };
    showDiscover?: boolean;
  } | null;
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

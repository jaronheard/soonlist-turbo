import { currentUser } from "@clerk/nextjs/server";
import { OnboardingTabs } from "./OnboardingTabs";
import { api } from "@/trpc/server";

export const metadata = {
  title: "Get Started | Soonlist",
  openGraph: {
    title: "Get Started | Soonlist",
  },
};

// TODO: this page needs an overhaul. Also a lot of the content is duplicated on the about page

export default async function Page() {
  const activeUser = await currentUser();
  if (!activeUser) {
    console.error("No currentUser found in get-started/page.tsx");
    return null;
  }
  const user = await api.user.getByUsername.query({
    userName: activeUser.username || "",
  });

  try {
    if (!user) {
      throw new Error("No user found in get-started/page.tsx");
    }
  } catch (e) {
    console.error(e);
  }

  return (
    <OnboardingTabs
      additionalInfo={{
        bio: user?.bio || undefined,
        publicEmail: user?.publicEmail || undefined,
        publicPhone: user?.publicPhone || undefined,
        publicInsta: user?.publicInsta || undefined,
        publicWebsite: user?.publicWebsite || undefined,
      }}
    />
  );
}

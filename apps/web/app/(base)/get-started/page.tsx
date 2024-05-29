import { auth, currentUser } from "@clerk/nextjs/server";

import { api } from "~/trpc/server";
import { OnboardingTabs } from "./OnboardingTabs";

export const metadata = {
  title: "Get Started | Soonlist",
  openGraph: {
    title: "Get Started | Soonlist",
  },
};

// TODO: this page needs an overhaul. Also a lot of the content is duplicated on the about page

export default async function Page() {
  const { userId } = auth().protect();
  const activeUser = await currentUser();
  if (!activeUser || !userId) {
    return <p className="text-lg text-gray-500">You do not have access.</p>;
  }
  const user = await api.user.getByUsername({
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
    <>
      <div className="prose mx-auto">
        <h1 className="font-heading text-4xl font-bold leading-[1.08333] tracking-tight text-gray-800 md:text-5xl">
          <span className="relative inline-block text-interactive-1">
            <svg
              width="492"
              height="96"
              viewBox="0 0 492 96"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="tranform absolute inset-0 z-[-1] h-full w-full scale-110 opacity-100"
            >
              <path
                d="M0.977745 90.0631L13.3028 15.2256C13.6677 13.01 15.557 11.3673 17.8018 11.314L487.107 0.163765C490.41 0.0852941 492.749 3.36593 491.598 6.46257L474.712 51.884C474.083 53.5754 472.537 54.7535 470.739 54.9104L5.99405 95.4768C2.9558 95.742 0.482147 93.0724 0.977745 90.0631Z"
                fill="#FEEA9F"
              />
            </svg>
            Welcome to Soonlist!
          </span>
        </h1>
        <p>
          Before adding your first event, let's complete your public profile –
          it only takes a minute.
        </p>
        <div className="p-4"></div>
      </div>
      <OnboardingTabs
        additionalInfo={{
          bio: user?.bio || undefined,
          publicEmail: user?.publicEmail || undefined,
          publicPhone: user?.publicPhone || undefined,
          publicInsta: user?.publicInsta || undefined,
          publicWebsite: user?.publicWebsite || undefined,
        }}
      />
    </>
  );
}

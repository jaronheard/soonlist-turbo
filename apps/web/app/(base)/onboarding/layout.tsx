import { ResetOnboardingButton } from "~/components/auth/ResetOnboardingButton";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      {children}
      <ResetOnboardingButton />
    </div>
  );
}

import { ResetAuthButton } from "~/components/auth/ResetAuthButton";

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      {children}
      <ResetAuthButton />
    </div>
  );
}

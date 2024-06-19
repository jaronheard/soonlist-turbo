import { WaitlistSignup } from "~/components/WaitlistSignup";

export const metadata = {
  title: "Early Access | Soonlist",
  openGraph: {
    title: "Early Access | Soonlist",
  },
};

export default function Page() {
  return (
    <div className="prose mx-auto px-8 py-12 sm:prose-lg lg:prose-xl xl:prose-2xl 2xl:prose-2xl">
      <WaitlistSignup />
    </div>
  );
}

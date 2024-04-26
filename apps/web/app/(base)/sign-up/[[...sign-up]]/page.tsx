import { SignUp } from "@clerk/nextjs";
import { ScrollToTop } from "@/components/ScrollToTop";

export default function Page() {
  return (
    <>
      <ScrollToTop />
      <div className="flex w-full justify-center bg-white">
        <SignUp afterSignUpUrl={`${process.env.NEXT_PUBLIC_URL}/get-started`} />
      </div>
    </>
  );
}

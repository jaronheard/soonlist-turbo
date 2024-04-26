import React from "react";
import { ContactUs } from "@/components/ContactUs";

export const metadata = {
  title: "Contact | Soonlist",
  openGraph: {
    title: "Contact | Soonlist",
  },
};

export default function Page() {
  return (
    <div className="prose mx-auto sm:prose-lg lg:prose-xl xl:prose-2xl 2xl:prose-2xl">
      <h1 className="font-heading">Welcome to Soonlist</h1>
      <h2 className="font-heading">Get in touch</h2>
      <h3>Support</h3>
      <p className="">
        Soonlist is new, and we hope you will reach out with questions. For
        support or questions, please <ContactUs>send us an email</ContactUs>.
      </p>
      <h3>Collaborate</h3>

      <p className="">
        To inquire about collaborating with us, please{" "}
        <ContactUs>send us an email</ContactUs>.
      </p>
      <h3>Fund</h3>
      <p className="">
        To inquire about supporting Soonlist financially in our goal to exit to
        community, please <ContactUs>send us an email</ContactUs>.
      </p>
    </div>
  );
}

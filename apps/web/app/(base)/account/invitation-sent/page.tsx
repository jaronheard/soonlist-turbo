import React from "react";
import Link from "next/link";

import { Button } from "@soonlist/ui/button";

import { IntercomHelpButton } from "~/components/IntercomHelpButton";

export const metadata = {
  title: "Invitation Sent | Soonlist",
  openGraph: {
    title: "Invitation Sent | Soonlist",
  },
};

export default function InvitationSentPage() {
  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <h1 className="mb-4 text-3xl font-bold">Invitation Sent!</h1>
      <p className="mb-6 text-lg">
        We've sent an invitation to the email address you provided. Please check
        your inbox and follow the instructions to complete your registration.
      </p>
      <p className="mb-8 text-sm text-gray-600">
        If you don't see the email in your inbox, please check your spam folder.
      </p>
      <div className="flex justify-center space-x-4">
        <IntercomHelpButton />
      </div>
    </div>
  );
}

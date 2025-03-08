"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { AlertTriangle, RefreshCw } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@soonlist/ui/dialog";
import { Button } from "@soonlist/ui/button";

export function ResetOnboardingButton() {
  const [open, setOpen] = React.useState(false);
  const { signOut } = useClerk();
  const router = useRouter();

  const handleReset = async () => {
    setOpen(false);
    await signOut();
    router.push("/sign-in");
  };

  return (
    <div className="absolute bottom-4 w-full flex justify-center">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-sm text-gray-500">
            <RefreshCw className="mr-2 h-4 w-4" />
            Stuck? Return to sign-in
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Reset Onboarding
            </DialogTitle>
            <DialogDescription>
              This will reset your onboarding progress and sign you out. You'll
              need to sign in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReset}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

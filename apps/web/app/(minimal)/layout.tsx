import { Toaster } from "@soonlist/ui/sonner";

import { DragAndDropProvider } from "~/components/DragAndDropProvider";
import { ImagePasteProvider } from "~/components/ImagePasteProvider";
import { WorkflowStatusToastContainer } from "~/components/WorkflowStatusToast";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ImagePasteProvider>
      <DragAndDropProvider>
        <div className="flex min-h-screen flex-col">
          <Toaster />
          <WorkflowStatusToastContainer />
          <main className="flex-grow overflow-auto">
            <div className="relative mx-auto w-full max-w-7xl px-6 pb-[7rem] pt-[4.5rem]">
              {children}
            </div>
          </main>
        </div>
      </DragAndDropProvider>
    </ImagePasteProvider>
  );
}

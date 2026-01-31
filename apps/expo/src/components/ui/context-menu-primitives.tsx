import type { ViewStyle } from "react-native";
import { useState } from "react";
import { Pressable } from "react-native";
import { Portal } from "@gorhom/portal";
import * as ContextMenu from "zeego/context-menu";

type ContextMenuRootProps = React.ComponentProps<typeof ContextMenu.Root>;

function ContextMenuRootWithOverlay(props: ContextMenuRootProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    props.onOpenChange?.(open);
  };

  return (
    <>
      <ContextMenu.Root {...props} onOpenChange={handleOpenChange}>
        {props.children}
      </ContextMenu.Root>
      <Portal>
        {isOpen && (
          <Pressable style={overlayStyle} onPressIn={() => setIsOpen(false)} />
        )}
      </Portal>
    </>
  );
}

const overlayStyle: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 999,
};

export const ContextMenuRoot = ContextMenuRootWithOverlay;
export const ContextMenuTrigger = ContextMenu.Trigger;
export const ContextMenuContent = ContextMenu.Content;
export const ContextMenuItem = ContextMenu.Item;
export const ContextMenuItemTitle = ContextMenu.ItemTitle;
export const ContextMenuItemIcon = ContextMenu.ItemIcon;

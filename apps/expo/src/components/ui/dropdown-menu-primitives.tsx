import type { ViewStyle } from "react-native";
import { useEffect, useState } from "react";
import { Pressable } from "react-native";
import { Portal } from "@gorhom/portal";
import * as DropdownMenu from "zeego/dropdown-menu";

type DropdownMenuRootProps = React.ComponentProps<typeof DropdownMenu.Root>;

function DropdownMenuRootWithOverlay(props: DropdownMenuRootProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Sync overlay with controlled open prop
  useEffect(() => {
    if (props.open !== undefined) {
      setIsOpen(props.open);
    }
  }, [props.open]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    props.onOpenChange?.(open);
  };

  return (
    <>
      <DropdownMenu.Root {...props} onOpenChange={handleOpenChange}>
        {props.children}
      </DropdownMenu.Root>
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

export const DropdownMenuRoot = DropdownMenuRootWithOverlay;
export const DropdownMenuTrigger = DropdownMenu.Trigger;
export const DropdownMenuContent = DropdownMenu.Content;
export const DropdownMenuItem = DropdownMenu.Item;
export const DropdownMenuItemIcon = DropdownMenu.ItemIcon;
export const DropdownMenuItemTitle = DropdownMenu.ItemTitle;
export const DropdownMenuItemIndicator = DropdownMenu.ItemIndicator;
export const DropdownMenuCheckboxItem = DropdownMenu.CheckboxItem;

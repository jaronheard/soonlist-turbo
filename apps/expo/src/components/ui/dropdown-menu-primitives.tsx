import type { ViewStyle } from "react-native";
import { useState } from "react";
import { Dimensions, Pressable } from "react-native";
import { Portal } from "@gorhom/portal";
import * as DropdownMenu from "zeego/dropdown-menu";

type DropdownMenuRootProps = React.ComponentProps<typeof DropdownMenu.Root>;

function DropdownMenuRootWithOverlay(props: DropdownMenuRootProps) {
  const [isOpen, setIsOpen] = useState(false);

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

const screenSize = Dimensions.get("screen");

const overlayStyle: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  width: screenSize.width,
  height: screenSize.height,
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

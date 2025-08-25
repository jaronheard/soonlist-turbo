/* This file is directly copied from Lucide icons - TypeScript errors are expected and suppressed on specific lines */
import type { FunctionComponent } from "react";
import { createElement, forwardRef } from "react";
import * as NativeSvg from "react-native-svg";

import type { IconNode, LucideIcon, LucideProps } from "./types";
import defaultAttributes, { childDefaultAttributes } from "./defaultAttributes";

const createLucideIcon = (iconName: string, iconNode: IconNode): LucideIcon => {
  const Component = forwardRef(
    (
      {
        color = "currentColor",
        size = 24,
        strokeWidth = 2,
        absoluteStrokeWidth,
        children,
        "data-testid": dataTestId,
        ...rest
      }: LucideProps,
      ref,
    ) => {
      const customAttrs = {
        stroke: color,
        strokeWidth: absoluteStrokeWidth
          ? (Number(strokeWidth) * 24) / Number(size)
          : strokeWidth,
        ...rest,
      } as Record<string, unknown>;

      return createElement(
        NativeSvg.Svg as unknown as string,
        {
          ref,
          ...defaultAttributes,
          width: size as number,
          height: size as number,
          "data-testid": dataTestId,
          ...customAttrs,
        },
        [
          ...(iconNode.map(([tag, attrs], index) => {
            const upperCasedTag = (tag.charAt(0).toUpperCase() +
              tag.slice(1)) as keyof typeof NativeSvg;
            // duplicating the attributes here because generating the OTA update bundles don't inherit the SVG properties from parent (codepush, expo-updates)
            return createElement(
              NativeSvg[upperCasedTag] as FunctionComponent<LucideProps>,
              {
                key: `${iconName}-${index}`,
                ...childDefaultAttributes,
                ...customAttrs,
                ...attrs,
              } as LucideProps,
            );
          }) as React.ReactNode[]),
          ...(((Array.isArray(children) ? children : [children]) ||
            []) as React.ReactNode[]),
        ],
      );
    },
  );

  Component.displayName = `${iconName}`;

  return Component;
};

export default createLucideIcon;

import type { ForwardRefExoticComponent } from "react";
import type { SvgProps } from "react-native-svg";

type SVGElementType =
  | "circle"
  | "ellipse"
  | "g"
  | "line"
  | "path"
  | "polygon"
  | "polyline"
  | "rect";

export type IconNode = [
  elementName: SVGElementType,
  attrs: Record<string, string>,
][];

export interface LucideProps extends SvgProps {
  size?: string | number;
  absoluteStrokeWidth?: boolean;
  "data-testid"?: string;
}

export type LucideIcon = ForwardRefExoticComponent<LucideProps>;

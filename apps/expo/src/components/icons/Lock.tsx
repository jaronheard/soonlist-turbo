import * as React from "react";
import Svg, { Path } from "react-native-svg";

import type { LucideIcon } from "./types";

const Lock: LucideIcon = ({ size = 24, color = "black", strokeWidth = 2 }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M5 11m0 1a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
    <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
);

export default Lock;

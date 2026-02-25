import createLucideIcon from "./createLucideIcon";

const PlusViewfinder = createLucideIcon("PlusViewfinder", [
  // Viewfinder corners
  ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2", key: "1" }],
  ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2", key: "2" }],
  ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2", key: "3" }],
  ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2", key: "4" }],
  // Plus sign in center
  ["line", { x1: "12", y1: "8", x2: "12", y2: "16", key: "5" }],
  ["line", { x1: "8", y1: "12", x2: "16", y2: "12", key: "6" }],
]);

export { PlusViewfinder as default };

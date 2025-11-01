export const colors = {
  primaryBackground: "#000000",
  foreground: "#ffffff",
  grayDark: "#1a1a1a",
  grayMedium: "#333333",
  accent: "#ff5722",
  borderOverlay: "rgba(255, 255, 255, 0.2)",
} as const;

export const cssVariables = {
  background: "--background",
  foreground: "--foreground",
  primary: "--primary",
  secondary: "--secondary",
  accent: "--accent",
  border: "--border",
} as const;

export type ColorKeys = keyof typeof colors;



// src/contexts/PublicChromeContext.tsx
import { createContext, useContext } from "react";

export type PublicChromeContextValue = {
  /** True if a layout already rendered the public top nav/header. */
  headerProvided: boolean;
  /** True if a layout already rendered the public footer. */
  footerProvided: boolean;
};

const PublicChromeContext = createContext<PublicChromeContextValue>({
  headerProvided: false,
  footerProvided: false,
});

export function PublicChromeProvider(props: {
  value: PublicChromeContextValue;
  children: React.ReactNode;
}) {
  return (
    <PublicChromeContext.Provider value={props.value}>
      {props.children}
    </PublicChromeContext.Provider>
  );
}

export function usePublicChrome() {
  return useContext(PublicChromeContext);
}
// src/contexts/PublicChromeContext.tsx
import { createContext, useContext } from "react";

export type PublicChromeContextValue = {
  /** True if a layout already rendered the public top nav/header. */
  headerProvided: boolean;
  /** True if a layout already rendered the public footer. */
  footerProvided: boolean;
};

const PublicChromeContext = createContext<PublicChromeContextValue>({
  headerProvided: false,
  footerProvided: false,
});

export function PublicChromeProvider(props: {
  value: PublicChromeContextValue;
  children: React.ReactNode;
}) {
  return (
    <PublicChromeContext.Provider value={props.value}>
      {props.children}
    </PublicChromeContext.Provider>
  );
}

export function usePublicChrome() {
  return useContext(PublicChromeContext);
}

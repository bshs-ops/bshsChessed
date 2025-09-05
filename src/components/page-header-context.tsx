// src/components/page-header-context.tsx
"use client";

import React, { createContext, useContext, useState } from "react";

type PageHeaderContextType = {
  title: string;
  setTitle: (title: string) => void;
};

const PageHeaderContext = createContext<PageHeaderContextType | undefined>(
  undefined
);

export function PageHeaderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [title, setTitle] = useState("");
  return (
    <PageHeaderContext.Provider value={{ title, setTitle }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx)
    throw new Error("usePageHeader must be used inside PageHeaderProvider");
  return ctx;
}

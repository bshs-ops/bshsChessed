// src/app/(withSidebar)/client-layout.tsx
"use client";

import React, { Suspense } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import {
  PageHeaderProvider,
  usePageHeader,
} from "@/components/page-header-context";

// This is your header component, now living inside the main client component file.
function Header() {
  const { title } = usePageHeader();
  return (
    <header className="flex h-16 shrink-0 items-center justify-between bg-white/85 backdrop-blur-md border-b border-black/5">
      <div className="flex items-center gap-3 px-4 sm:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="data-[orientation=vertical]:h-4 mx-2 h-4"
        />
        {/* The dynamic title will now render correctly */}
        <div className="text-2xl text-gray-800 font-semibold">
          {title || ""}
        </div>
      </div>
    </header>
  );
}

// This is the main client layout component that wraps everything
export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <PageHeaderProvider>
        {" "}
        {/* Context provider is here */}
        <div className="flex h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex flex-col w-full">
            <Header /> {/* Header consumes the context */}
            <div className="flex-1 overflow-y-auto bg-[#EFEFEF]">
              <Suspense fallback={<div>Loading page...</div>}>
                {/* The {children} (your server-rendered pages) are passed through */}
                <main>{children}</main>
                <Toaster richColors />
              </Suspense>
            </div>
          </SidebarInset>
        </div>
      </PageHeaderProvider>
    </SidebarProvider>
  );
}

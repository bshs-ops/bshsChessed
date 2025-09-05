import React, { Suspense } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import // Breadcrumb,
// BreadcrumbItem,
// BreadcrumbLink,
// BreadcrumbList,
"@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "Admin Panel - SQRATCH",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        {/* SidebarInset to contain breadcrumbs and main content */}
        <SidebarInset className="flex flex-col w-full">
          {/* Header with Sticky Styling */}
          <header className="flex h-16 shrink-0 items-center justify-between transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-white/85 backdrop-blur-md border-b border-black/5">
            {" "}
            {/* Added styling classes from new code. */}
            <div className="flex items-center gap-3 px-4 sm:px-6">
              {" "}
              {/* Added padding for consistent spacing. */}
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 h-4 hidden sm:block"
              />{" "}
            </div>
            <div className="pr-4 text-white"></div>
          </header>

          {/* Main Content Area */}
          <div className="flex-1 p-4 bg-[#EFEFEF]">
            <Suspense fallback={<div>Loading...</div>}>
              <main>{children}</main>
              <Toaster richColors />
            </Suspense>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

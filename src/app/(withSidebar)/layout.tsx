// src/app/(withSidebar)/layout.tsx
import React from "react";
import { ClientLayout } from "./client-layout"; // ✨ Import the new client wrapper

export const metadata = {
  title: "Admin Panel - Charity Tracker",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // ✨ The entire layout is now handled by the ClientLayout component
    <ClientLayout>{children}</ClientLayout>
  );
}

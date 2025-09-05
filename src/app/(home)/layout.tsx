import React from "react";

export const metadata = {
  title: "Home - Charity Tracker",
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bootstrap-scoped">{children}</div>;
}

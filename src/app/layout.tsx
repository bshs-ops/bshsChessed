import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Pacifico } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/context/AuthProvider";

// Use DM Sans as the primary font
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  // You can specify the weight range based on what you need
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

// Add Pacifico for decorative headings or special elements
const pacifico = Pacifico({
  variable: "--font-pacifico",
  subsets: ["latin"],
  weight: ["400"],
});

// Keep Geist Mono for monospace if needed
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Charity Tracker",
  description:
    "Signup with your email and acccess private community in Minds.com",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <AuthProvider>
        <body
          className={`${dmSans.variable} ${pacifico.variable} ${geistMono.variable} font-sans antialiased`}
        >
          {children}
        </body>
      </AuthProvider>
    </html>
  );
}

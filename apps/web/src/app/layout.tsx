import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse v2 — Mission Control",
  description: "HBx AI-Powered Pre-Sale Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

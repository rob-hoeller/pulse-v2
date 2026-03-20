import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse v2",
  description: "HBx AI-Powered Pre-Sale Platform — Mission Control",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

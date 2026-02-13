import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mental Health Check-in",
  description: "Daily mood tracking and insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#1a1816] text-stone-900">
        {children}
      </body>
    </html>
  );
}

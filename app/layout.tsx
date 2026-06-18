import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Support Reply Generator",
  description: "Internal support tooling — sample data only.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-fg font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

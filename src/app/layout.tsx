import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ShelfProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Projects",
  description: "Uygulama rafı: öncelik, not ve repo brifingi.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <ShelfProvider>{children}</ShelfProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Frame } from "@/components/Frame";
import { ShelfProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Projects",
  description: "Uygulama operasyonu: bugün, sürüm, büyüme ve ajan bağlamı.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <ShelfProvider>
          <Frame>{children}</Frame>
        </ShelfProvider>
      </body>
    </html>
  );
}

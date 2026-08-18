import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { AppDataProvider } from "@/lib/store/AppDataContext";

export const metadata: Metadata = {
  title: "Mulligan Cup",
  description: "Live scoring for the annual Mulligan Cup golf trip",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#166534",
  // Have the on-screen keyboard resize the layout viewport (rather than overlay it) on
  // browsers that support it, so score-entry fields aren't hidden behind the keyboard.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-neutral-50 text-neutral-900">
        <AppDataProvider>
          <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-white shadow-sm md:max-w-3xl lg:max-w-5xl">
            <main className="flex-1 overflow-y-auto pb-20">{children}</main>
            <BottomNav />
          </div>
        </AppDataProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/layout/shell";
import { CommandPalette } from "@/components/shared/command-palette";
import { QueryProvider } from "@/providers/query-provider";
import { WeekFilterProvider } from "@/providers/week-filter-provider";
import { ContestProvider } from "@/providers/contest-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ACM Contest Review",
  description: "Review and analyze ACM contest submissions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}>
        <QueryProvider>
          <WeekFilterProvider>
            <ContestProvider>
              <TooltipProvider>
                <Shell>{children}</Shell>
                <CommandPalette />
                <Toaster
                  theme="dark"
                  position="bottom-right"
                  toastOptions={{
                    style: {
                      background: "hsl(240 10% 10%)",
                      border: "1px solid hsl(240 6% 20%)",
                      color: "hsl(0 0% 90%)",
                    },
                  }}
                />
              </TooltipProvider>
            </ContestProvider>
          </WeekFilterProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google"; // Import IBM Plex Mono
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
});

import { ReportProvider } from "@/context/ReportContext";
import { SessionProvider } from "./SessionProvider";

export const metadata: Metadata = {
  title: "Report Terra",
  description: "Análise Inteligente de Processos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${ibmPlexMono.variable} font-sans antialiased bg-slate-50 dark:bg-slate-950`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ReportProvider>
            <SessionProvider>
              <div className="flex h-screen overflow-hidden">
                <AppSidebar />
                <main className="flex-1 overflow-y-auto">
                  {children}
                </main>
              </div>
            </SessionProvider>
          </ReportProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

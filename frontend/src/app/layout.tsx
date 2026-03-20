import type { Metadata } from "next";
import { DM_Sans, Lora, IBM_Plex_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { THEME_COOKIE_NAME } from "@/lib/theme";
import { Masthead } from "@/components/layout/Masthead";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Drift. | Strategic Accountability Research",
  description:
    "What companies commit to. What the record shows. What disappeared.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const isDark = themeCookie === "dark";

  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${lora.variable} ${ibmPlexMono.variable} ${isDark ? "dark" : ""}`}
    >
      <body className="font-sans antialiased bg-background text-foreground min-h-screen flex flex-col">
        <Masthead initialTheme={isDark ? "dark" : "light"} />
        <main className="flex-1"><PageTransition>{children}</PageTransition></main>
        <Footer />
      </body>
    </html>
  );
}

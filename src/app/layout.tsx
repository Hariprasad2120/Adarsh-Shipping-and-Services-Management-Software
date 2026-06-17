import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ScrollNavigator } from "@/components/scroll-navigator";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const kionaSans = localFont({
  src: [
    {
      path: "../../public/Kiona-Regular.ttf",
      style: "normal",
      weight: "100 900",
    },
    {
      path: "../../public/Kiona-Itallic.ttf",
      style: "italic",
      weight: "100 900",
    },
  ],
  variable: "--font-kiona-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monolith Engine",
  description: "Operations platform for Adarsh Shipping & Services.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
  lang="en"
  suppressHydrationWarning
  className={`${geistSans.variable} ${kionaSans.variable} ${geistMono.variable} h-full antialiased`}
>
      <head>
        <Script
          id="theme-initialize"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var root = document.documentElement;
                var savedTheme = localStorage.getItem('theme');
                var resolvedTheme =
                  savedTheme === 'dark' || savedTheme === 'light'
                    ? savedTheme
                    : 'light';
                root.classList.remove('dark', 'light');
                root.classList.add(resolvedTheme);
                root.style.colorScheme = resolvedTheme;
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ScrollNavigator />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: "var(--font-kiona-sans), sans-serif",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ScrollNavigator } from "@/components/scroll-navigator";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var root = document.documentElement;
                var savedTheme = localStorage.getItem('theme');
                var resolvedTheme =
                  savedTheme === 'night' || savedTheme === 'violet' || savedTheme === 'light'
                    ? savedTheme
                    : 'light';
                root.classList.remove('dark', 'light', 'night', 'violet', 'theme-light', 'theme-night', 'theme-violet');
                root.classList.add(resolvedTheme, 'theme-' + resolvedTheme);
                root.style.colorScheme = resolvedTheme === 'light' ? 'light' : 'dark';
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="monolith-app min-h-full flex flex-col">
        {children}
        <ScrollNavigator />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: "var(--font-geist-sans), sans-serif",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}

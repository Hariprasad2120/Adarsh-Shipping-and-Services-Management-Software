import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { ScrollNavigator } from "@/components/scroll-navigator";
import "./globals.css";

const geistSans = localFont({
  src: "../../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
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

const geistMono = localFont({
  src: "../../node_modules/next/dist/next-devtools/server/font/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
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
        <script
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

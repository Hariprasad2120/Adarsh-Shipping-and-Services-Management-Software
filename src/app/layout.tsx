import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { ScrollNavigator } from "@/components/navigation/scroll-navigator";
import "./globals.css";

const geistSans = localFont({
  src: "../../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
  variable: "--font-geist-sans",
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
      className={`${geistSans.variable} h-full antialiased`}
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
                    : 'night';
                root.classList.remove('dark', 'light', 'night', 'violet', 'theme-light', 'theme-night', 'theme-violet');
                root.classList.add(resolvedTheme, 'theme-' + resolvedTheme);
                root.style.colorScheme = resolvedTheme === 'light' ? 'light' : 'dark';
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="mnx-root min-h-full flex flex-col">
        {children}
        <ScrollNavigator />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: "var(--mn-font-sans)",
              fontSize: "var(--mn-type-body-size)",
            },
          }}
        />
      </body>
    </html>
  );
}

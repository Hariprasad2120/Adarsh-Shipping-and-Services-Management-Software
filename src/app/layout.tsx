import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ScrollNavigator } from "@/components/scroll-navigator";
import "./globals.css";

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
      className="h-full antialiased"
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
              fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}

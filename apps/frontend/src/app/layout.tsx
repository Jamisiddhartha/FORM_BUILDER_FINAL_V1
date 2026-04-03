// apps/frontend/src/app/layout.tsx
import Script from "next/script";
import { Providers } from "./providers";

export const metadata = {
  title: "Single Window Clerance System",
  description: "Directorate of Industries",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Global scripts that must load before hydration */}
        <Script src="/js/tweenMax.min.js" strategy="lazyOnload" />
        <Script src="/js/wow.min.js" strategy="lazyOnload" />
      </head>

      <body
        className="sticky-header-inner"
        suppressHydrationWarning
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
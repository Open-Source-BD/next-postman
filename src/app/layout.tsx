import type { Metadata } from 'next';
import { Roboto, Fira_Code } from 'next/font/google';
import './globals.css';

// Self-hosted via next/font (no external request, no layout shift, no
// no-page-custom-font warning). Exposed as CSS variables that globals.css maps
// to --font-family / --mono-font.
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-roboto',
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-fira-code',
});

export const metadata: Metadata = {
  title: 'Next.js API Client',
  description: 'Full-stack Postman Alternative',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${roboto.variable} ${firaCode.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Material Symbols is a variable icon font with custom axes that
            next/font doesn't model, so it stays a manual <link>. display=block
            keeps icons invisible until loaded (no swap-flash of fallback glyphs). */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font, @next/next/google-font-display */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

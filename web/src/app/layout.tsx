import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const masthead = Source_Serif_4({
  variable: "--font-masthead",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Lahore Air Quality Bulletin",
  description: "Air quality monitoring for Lahore, aggregated from the Punjab monitoring network and independent sensors",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="console"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${masthead.variable} h-full antialiased`}
    >
      <head>
        {/* Applies a stored theme before the browser paints. The server renders
            the default above, so markup matches; this only overrides it when a
            preference exists, and suppressHydrationWarning covers that change.
            Per next/docs: 01-app/02-guides/preventing-flash-before-hydration. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("laq-theme");if(t==="civic"||t==="console")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()',
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}

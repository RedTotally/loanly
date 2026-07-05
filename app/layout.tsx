import type { Metadata } from "next";
import { Doto, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const doto = Doto({
  subsets: ["latin"],
  variable: "--font-doto",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Loanly | Best Place to Get a Loan",
  description: "Feeling Loanly? Find Your Sugar Daddies or Mommies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${doto.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

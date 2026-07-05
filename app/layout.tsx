import type { Metadata } from "next";
import { Google_Sans_Flex } from "next/font/google";
import "./globals.css";

const googleSansFlex = Google_Sans_Flex({
  subsets: ["latin"],
  variable: "--font-google-sans-flex",
  adjustFontFallback: false,
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
    <html lang="en" className={`${googleSansFlex.variable} h-full antialiased`}>
      <body className={`${googleSansFlex.className} min-h-full flex flex-col`}>{children}</body>
    </html>
  );
}

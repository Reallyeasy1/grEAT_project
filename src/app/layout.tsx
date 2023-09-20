"use client";
import { StoreProvider } from "@/utils/Store";
import "./globals.css";
import { Inter } from "next/font/google";
import { Wallet } from "@/utils/Wallet";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Create Next App</title>
        <meta name="description" content="Description" />
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        <Wallet>
          <StoreProvider>{children}</StoreProvider>
        </Wallet>
      </body>
    </html>
  );
}

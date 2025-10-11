import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Chakra_Petch, DM_Sans, Ropa_Sans } from "next/font/google";
import{ Toaster } from "react-hot-toast";
import { Suspense } from "react";

import "./globals.css";
import { PrivyAuthProvider } from "@/context/PrivyAuthProvider";
import PrivyProviderWrapper from "@/provider/PrivyProviderWrapper";

// Fonts
const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-chakra",
});

const ropa = Ropa_Sans({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-ropa",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-dm-sans",
});

// Metadata
export const metadata: Metadata = {
  title: "Invest Like the Insiders",
  description:
    "Buy curated baskets of US stocks based on real politician holdings.",
  generator: "v0.dev",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${ropa.variable} ${chakra.variable} ${dmSans.variable}`}
      >
        <Suspense fallback={null}>
          {process.env.NEXT_PUBLIC_ENABLE_PRIVY !== "false" ? (
            <PrivyProviderWrapper>
              <PrivyAuthProvider>
                {children}
                <Toaster
                  position="top-center"
                  toastOptions={{
                    style: {
                      background: "black",
                      border: "1px solid white",
                      color: "white",
                      borderRadius: "0px",
                    },
                  }}
                />
              </PrivyAuthProvider>
            </PrivyProviderWrapper>
          ) : (
            <>
              {children}
              <Toaster
                position="top-center"
                toastOptions={{
                  style: {
                    background: "black",
                    border: "1px solid white",
                    color: "white",
                    borderRadius: "0px",
                  },
                }}
              />
            </>
          )}
        </Suspense>
      </body>
    </html>
  );
}

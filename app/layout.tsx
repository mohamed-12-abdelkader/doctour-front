import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import NavbarDynamic from "./NavbarDynamic";
import { Box } from "@chakra-ui/react";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["200", "300", "400", "500", "700", "800", "900"],
  display: "swap",
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "د/ ريم عاطف",
  description: "حجز مواعيد عيادة د/ ريم عاطف",
  icons: { icon: "/icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className={tajawal.className}>
        <Providers>
          <NavbarDynamic />
          <Box as="main" pt={["72px", "72px"]}>
            {children}
          </Box>
        </Providers>
      </body>
    </html>
  );
}

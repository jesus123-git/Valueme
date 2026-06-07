import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/lib/providers";
import { ThemeProvider } from "@/lib/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Finanzas — Gestión personal y empresarial",
  description: "Controla tus finanzas personales y empresariales en un solo lugar",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.variable} antialiased`}>
        <Providers>
          <ThemeProvider>{children}</ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}

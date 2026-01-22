import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DataProvider } from "@/core/providers/DataProvider";
import { ViewModelProvider } from "@/core/providers/ViewModelProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nivel Gym - Sistema de Reservas",
  description: "Sistema de reservas para Nivel Gym",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DataProvider>
          <ViewModelProvider>
            {children}
          </ViewModelProvider>
        </DataProvider>
      </body>
    </html>
  );
}

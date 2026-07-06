import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AuthProvider } from "@/core/providers/AuthProvider";
import { DataProvider } from "@/core/providers/DataProvider";
import { ViewModelProvider } from "@/core/providers/ViewModelProvider";
import { LocalStorageFallbackBanner } from "@/components/LocalStorageFallbackBanner";


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
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <AuthProvider>
          <DataProvider>
            <LocalStorageFallbackBanner />
            <ViewModelProvider>
              {children}
            </ViewModelProvider>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

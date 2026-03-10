import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "react-hot-toast";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KSP Wines — Admin Panel",
  description: "Manage products, orders, and categories for KSP Wines",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider>
          <AdminAuthProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                className: 'theme-toast',
                style: {
                  background: 'var(--t-card-bg-elevated)',
                  color: 'var(--foreground)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  border: '1px solid var(--t-border)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                },
              }}
            />
            {children}
          </AdminAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

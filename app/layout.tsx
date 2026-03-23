import type { Metadata } from "next";
import { Roboto, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "react-hot-toast";
import ReactQueryProvider from "./providers";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vedashi — Admin Panel",
  description: "Manage products, orders, and categories for Vedashi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${roboto.variable} ${playfair.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider>
          <AdminAuthProvider>
            <ReactQueryProvider>
              <Toaster
                position="top-right"
                containerStyle={{ zIndex: 999999 }}
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
            </ReactQueryProvider>
          </AdminAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

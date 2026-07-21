import type { Metadata } from "next";
import { Roboto, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "react-hot-toast";
import ReactQueryProvider from "./providers";
import Script from "next/script";

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

import { VibeProvider } from "@/context/VibeContext";

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
            <VibeProvider>
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
            </VibeProvider>
          </AdminAuthProvider>
        </ThemeProvider>
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
        <Script id="google-translate-init" strategy="afterInteractive">
          {`
            function googleTranslateElementInit() {
              new window.google.translate.TranslateElement({
                pageLanguage: 'ru',
                includedLanguages: 'en,ru',
                layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false
              }, 'google_translate_element');
            }

            // Patch DOM methods to prevent React crashes when Google Translate mutates text nodes
            if (typeof Node !== 'undefined' && Node.prototype) {
              const originalInsertBefore = Node.prototype.insertBefore;
              Node.prototype.insertBefore = function(newNode, referenceNode) {
                if (referenceNode && referenceNode.parentNode !== this) {
                  return newNode;
                }
                return originalInsertBefore.call(this, newNode, referenceNode);
              };

              const originalRemoveChild = Node.prototype.removeChild;
              Node.prototype.removeChild = function(child) {
                if (child.parentNode !== this) {
                  return child;
                }
                return originalRemoveChild.call(this, child);
              };
            }
          `}
        </Script>
      </body>
    </html>
  );
}

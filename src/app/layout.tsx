import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Lock } from "lucide-react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IAMC SGI - Management Portal",
  description: "IAMC SGI Management Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isLocked = process.env.PAID !== "true";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {isLocked ? (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background overflow-hidden">
            <div className="relative glass p-10 rounded-3xl border border-border/50 shadow-2xl max-w-md w-full text-center space-y-6 mx-4 animate-in fade-in zoom-in duration-500">
              <div className="mx-auto w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center animate-shake">
                <Lock className="w-10 h-10 text-primary" />
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Free Trial Ended</h1>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Your free trial has ended. Please contact administration for support.
                </p>
              </div>

              <div className="pt-4">
                <div className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/25 hover:opacity-90 transition-all cursor-not-allowed">
                  Upgrade to Premium
                </div>
              </div>

              <p className="text-xs text-muted-foreground pt-4 border-t border-border/50">
                Contact administration if you believe this is an error.
              </p>
            </div>

            {/* Client-side lockdown scripts */}
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  // Disable Right Click
                  document.addEventListener('contextmenu', (e) => e.preventDefault());
                  
                  // Disable Keyboard Shortcuts for DevTools
                  document.addEventListener('keydown', (e) => {
                    if (
                      e.key === 'F12' || 
                      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                      (e.ctrlKey && e.key === 'U')
                    ) {
                      e.preventDefault();
                      return false;
                    }
                  });

                  // Disable Selection
                  document.addEventListener('selectstart', (e) => e.preventDefault());
                `,
              }}
            />
          </div>
        ) : (
          <Providers>{children}</Providers>
        )}
      </body>
    </html>
  );
}

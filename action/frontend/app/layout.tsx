import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ConfDiary - Anonymous Encrypted Diary",
  description: "A privacy-preserving diary application powered by FHEVM",
  keywords: ["diary", "privacy", "encryption", "FHEVM", "anonymous"],
  authors: [{ name: "ConfDiary Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}



import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: {
    default: "Borrowing Books - Inter-Library Management System",
    template: "%s | Borrowing Books",
  },
  description:
    "Hệ thống quản lý mượn sách liên trường - Tìm kiếm và mượn sách từ nhiều thư viện trong mạng lưới",
  keywords: ["library", "books", "borrowing", "inter-library", "management"],
  authors: [{ name: "Borrowing Books Team" }],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Borrowing Books",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={`${inter.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

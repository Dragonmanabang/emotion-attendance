import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "감정 출석부",
  description: "학생의 오늘 감정을 기록하고 교사가 한눈에 살펴보는 감정 출석부",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

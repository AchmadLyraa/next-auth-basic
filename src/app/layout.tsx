import type { Metadata } from "next";
import "@/app/global.css";

export const metadata: Metadata = {
  title: "Next.js Authentication",
  description: "Full-stack auth dengan Next.js, Prisma & NextAuth",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

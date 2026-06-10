import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BrainOS — Аналитика',
  description: 'Дашборд аналитики BrainOS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import Providers from "@/components/Providers";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata = {
  title: "StudyBox — Organize Your Study, Simplify Your Life.",
  description:
    "StudyBox adalah perpustakaan digital pribadi untuk pelajar dan mahasiswa: catatan, PDF, mata pelajaran, dan tugas dalam satu tempat.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7c5cfc",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

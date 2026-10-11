import type { Metadata, Viewport } from "next";
import "./globals.css";

const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const metadataOrigin = process.env.SITE_URL
  ?? (productionHost ? `https://${productionHost}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(metadataOrigin),
  title: { default: "FormCheck — 내 자세를 보는 운동 코치", template: "%s · FormCheck" },
  description: "루틴을 고르고 휴대폰을 내려놓으세요. 기기에서 자세를 추적하고 지원 운동의 횟수, 세트와 휴식을 안내합니다.",
  applicationName: "FormCheck",
  keywords: ["workout coach", "pose estimation", "rep counter", "exercise form", "on-device AI"],
  authors: [{ name: "FormCheck" }],
  creator: "FormCheck",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "FormCheck",
    title: "FormCheck — 내 자세를 보는 운동 코치",
    description: "루틴을 고르세요. 휴대폰을 내려놓으세요. 운동에 집중하세요. 내 기기에서 횟수와 자세를 확인하고 운동을 안내합니다.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FormCheck — 내 자세를 보는 운동 코치",
    description: "루틴을 고르세요. 휴대폰을 내려놓으세요. 운동에 집중하세요. 자세 분석은 내 기기에서 실행됩니다.",
  },
  appleWebApp: { capable: true, title: "FormCheck", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f0e9" },
    { media: "(prefers-color-scheme: dark)", color: "#11110f" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko" data-scroll-behavior="smooth"><body>{children}</body></html>;
}

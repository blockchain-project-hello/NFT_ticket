import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NFT Ticketing Platform",
  description: "The future of event ticketing on Polygon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen flex flex-col bg-gray-950 text-gray-100`}>
        <Providers>
          <header className="sticky top-0 z-50 glass-card border-b-0 border-white/10 px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-400 flex items-center justify-center group-hover:animate-pulse-glow">
                <div className="w-3 h-3 bg-white rounded-sm rotate-45" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-violet-400 group-hover:to-cyan-400 transition-all duration-300">
                TixNFT
              </span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/#events" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Explore</Link>
              <Link href="/marketplace" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Marketplace</Link>
              <Link href="/dashboard" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Dashboard</Link>
            </nav>
            
            <div>
              <ConnectButton 
                accountStatus="avatar" 
                chainStatus="icon" 
                showBalance={false} 
              />
            </div>
          </header>
          
          <main className="flex-1 flex flex-col">
            {children}
          </main>
          
          <footer className="border-t border-white/10 bg-black/40 py-8 px-6 mt-auto">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-500">
                © 2026 TixNFT. All rights reserved.
              </div>
              <div className="flex gap-6">
                <a href="#" className="text-gray-500 hover:text-cyan-400 transition-colors">Twitter</a>
                <a href="#" className="text-gray-500 hover:text-violet-400 transition-colors">Discord</a>
                <a href="#" className="text-gray-500 hover:text-white transition-colors">Docs</a>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}

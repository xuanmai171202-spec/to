"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import SkyBackground from "@/components/SkyBackground";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <SkyBackground>
      <div className="flex h-screen overflow-hidden w-full relative">
        <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        <main className="flex-grow flex flex-col h-screen overflow-hidden w-full">
          <div className="flex-grow overflow-y-auto p-4 md:p-8 custom-scrollbar">
            {children}
          </div>
        </main>

        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </div>
    </SkyBackground>
  );
}

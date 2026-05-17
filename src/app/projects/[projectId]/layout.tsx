import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';
import SkyBackground from '@/components/SkyBackground';

export default function ProjectLayout({ children }: { children: ReactNode }) {
  return (
    <SkyBackground>
      <div className="flex flex-col h-screen overflow-hidden w-full">
        <header className="flex items-center px-4 md:px-8 py-3 border-b border-white/30 bg-white/40 backdrop-blur-md flex-shrink-0">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 overflow-hidden">
              <Image src="/windtodo.png" alt="WindTodo" width={36} height={36} className="w-full h-full object-contain" />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">WindTodo</span>
          </Link>
        </header>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </SkyBackground>
  );
}

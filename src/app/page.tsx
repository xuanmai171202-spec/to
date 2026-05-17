import Image from 'next/image';
import Link from 'next/link';
import SkyBackground from '@/components/SkyBackground';

export default function LandingPage() {
  return (
    <SkyBackground>
      <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <div className="glass max-w-2xl px-8 py-12 md:px-12 md:py-16 rounded-[2.5rem] border border-white/40 shadow-2xl flex flex-col items-center animate-bubble-pop">
          {/* Logo container */}
          <div className="w-24 h-24 bg-white/50 rounded-3xl flex items-center justify-center mb-8 border border-white/60 shadow-lg overflow-hidden hover:scale-105 transition-transform duration-300">
            <Image src="/windtodo.png" alt="WindTodo" width={96} height={96} className="w-full h-full object-contain" />
          </div>
          
          <span className="text-xs font-bold text-sky-700 uppercase tracking-widest mb-3">
            Peaceful Productivity
          </span>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-6 tracking-tight">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-800">WindTodo</span>
          </h1>
          
          <p className="text-base md:text-lg text-slate-600 max-w-lg mb-10 leading-relaxed font-medium">
            A modern, glassmorphism-inspired task manager built with Next.js and Supabase. Organize your workflow seamlessly with a beautiful and responsive interface.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <Link 
              href="/signup" 
              className="btn-primary w-full sm:w-auto px-10 py-4 text-sm shadow-xl active:scale-95"
            >
              Join Now
            </Link>
            <Link 
              href="/login" 
              className="btn-secondary w-full sm:w-auto px-10 py-4 text-sm active:scale-95"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </SkyBackground>
  );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import useSWR from "swr";
import { ChevronRight, LogOut, Settings as SettingsIcon } from "lucide-react";
import { syncUser } from "@/app/actions/userActions";
import { logout } from "@/app/actions/authActions";

export default function Sidebar({ isOpen = false, onClose = () => {} }: { isOpen?: boolean, onClose?: () => void }) {
  const pathname = usePathname();
  const { data: user } = useSWR("currentUser", syncUser);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path> },
    { name: "Tasks", href: "/dashboard/tasks", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path> },
    { name: "Statistics", href: "/dashboard/stats", icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></> },
    { name: "Users", href: "/dashboard/users", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 01-12 0v1zm0-11a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z"></path> },
  ];

  const displayName = user?.name || user?.email?.split("@")[0] || "Guest";
  const initial = (displayName || "?").charAt(0).toUpperCase();

  return (
    <aside className={`w-72 p-4 md:p-6 flex-shrink-0 flex flex-col fixed md:relative z-50 h-full transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="glass h-full rounded-[2.5rem] flex flex-col p-6 border-white/40 shadow-xl shadow-sky-dark/10">
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 overflow-hidden">
                        <Image src="/windtodo.png" alt="WindTodo" width={40} height={40} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-foreground">WindTodo</span>
                </div>
                <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={onClose}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <nav className="space-y-1 mb-8">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 px-4">Menu</p>
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group ${
                        isActive
                          ? "bg-white/60 shadow-sm text-primary font-bold"
                          : "text-muted-foreground hover:bg-white/30 hover:text-foreground"
                      }`}
                    >
                        <svg className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {item.icon}
                        </svg>
                        <span className="text-sm font-medium">{item.name}</span>
                        {isActive && <ChevronRight size={14} className="ml-auto opacity-50" />}
                    </Link>
                  );
                })}

                <Link
                  href="/dashboard/settings"
                  onClick={onClose}
                  className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group ${
                    pathname === "/dashboard/settings"
                      ? "bg-white/60 shadow-sm text-primary font-bold"
                      : "text-muted-foreground hover:bg-white/30 hover:text-foreground"
                  }`}
                >
                    <SettingsIcon size={18} className={pathname === "/dashboard/settings" ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} />
                    <span className="text-sm font-medium">Settings</span>
                    {pathname === "/dashboard/settings" && <ChevronRight size={14} className="ml-auto opacity-50" />}
                </Link>
            </nav>

            <div className="mt-auto pt-6 border-t border-white/20 space-y-3">
                <div className="glass rounded-2xl p-4 flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-white/60 overflow-hidden relative flex items-center justify-center text-primary font-bold text-sm">
                        {user?.avatarUrl ? (
                          <Image
                            src={user.avatarUrl}
                            alt={displayName}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <span>{initial}</span>
                        )}
                    </div>
                    <div className="flex-grow min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
                    </div>
                </div>

                <form action={logout}>
                    <button
                      type="submit"
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all group"
                    >
                        <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
                        <span className="text-sm font-bold">Sign Out</span>
                    </button>
                </form>
            </div>
        </div>
    </aside>
  );
}

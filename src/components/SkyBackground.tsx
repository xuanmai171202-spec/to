"use client";

import React from "react";

const Cloud = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={`absolute opacity-60 pointer-events-none ${className}`}
    viewBox="0 0 200 60"
    fill="white"
    style={style}
  >
    <path d="M10,40 Q10,20 30,20 Q40,10 60,20 Q80,5 110,20 Q130,10 150,20 Q170,10 180,30 Q195,40 180,50 L20,50 Q5,50 10,40 Z" />
  </svg>
);

export default function SkyBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full sky-gradient overflow-hidden flex flex-col">
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-white/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-accent-lavender/30 blur-[100px] rounded-full pointer-events-none" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Cloud
          className="cloud-anim w-[300px] top-[15%]"
          style={{ animationDuration: "100s", animationDelay: "0s" }}
        />
        <Cloud
          className="cloud-anim w-[450px] top-[40%]"
          style={{ animationDuration: "150s", animationDelay: "-20s" }}
        />
        <Cloud
          className="cloud-anim w-[250px] top-[65%]"
          style={{ animationDuration: "120s", animationDelay: "-50s" }}
        />
        <Cloud
          className="cloud-anim w-[400px] top-[5%]"
          style={{ animationDuration: "180s", animationDelay: "-80s" }}
        />
      </div>

      <div className="relative z-10 flex flex-col flex-grow">
        {children}
      </div>
    </div>
  );
}

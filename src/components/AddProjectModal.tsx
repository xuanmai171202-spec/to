'use client';

import { FormEvent, useEffect, useState } from 'react';

const COLORS = [
  { name: 'Default', value: 'rgba(255, 255, 255, 0.03)' },
  { name: 'Purple', value: 'rgba(139, 92, 246, 0.18)' },
  { name: 'Blue', value: 'rgba(59, 130, 246, 0.18)' },
  { name: 'Teal', value: 'rgba(20, 184, 166, 0.18)' },
  { name: 'Green', value: 'rgba(34, 197, 94, 0.18)' },
  { name: 'Yellow', value: 'rgba(234, 179, 8, 0.18)' },
  { name: 'Orange', value: 'rgba(249, 115, 22, 0.18)' },
  { name: 'Red', value: 'rgba(239, 68, 68, 0.18)' },
  { name: 'Pink', value: 'rgba(236, 72, 153, 0.18)' },
  { name: 'Slate', value: 'rgba(100, 116, 139, 0.18)' },
];

export default function AddProjectModal({
  open,
  onClose,
  onCreate,
  title = 'New Project',
  nameLabel = 'Project name',
  namePlaceholder = 'e.g. Marketing launch',
  ctaLabel = 'Create project',
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
  title?: string;
  nameLabel?: string;
  namePlaceholder?: string;
  ctaLabel?: string;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[1].value);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, color);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-bubble-fade"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-2xl w-full max-w-md p-6 animate-bubble-pop"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {nameLabel}
        </label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={namePlaceholder}
          className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/20 mb-6"
        />

        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Tasklist background
        </label>
        <div className="grid grid-cols-5 gap-2 mb-6">
          {COLORS.map((c) => {
            const selected = color === c.value;
            return (
              <button
                type="button"
                key={c.value}
                onClick={() => setColor(c.value)}
                title={c.name}
                aria-label={c.name}
                aria-pressed={selected}
                style={{ background: c.value }}
                className={`h-10 rounded-lg border transition-all ${
                  selected
                    ? 'border-white ring-2 ring-white/40'
                    : 'border-white/10 hover:border-white/30'
                }`}
              />
            );
          })}
        </div>

        <div className="rounded-xl p-4 mb-6 border border-white/10" style={{ background: color }}>
          <div className="text-[10px] text-gray-300 uppercase tracking-wider mb-1">Preview</div>
          <div className="text-sm text-white truncate">{name || 'Your project name'}</div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-4 py-2 text-sm bg-white text-black rounded-lg font-medium hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {ctaLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

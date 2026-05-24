// src/components/reports/PhotoGallery.tsx
'use client';

import { useState }      from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, ZoomIn } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function toAbsolute(url: string) {
  return url.startsWith('/uploads/') ? `${API_URL}${url}` : url;
}

interface Props {
  photos: string[];
}

export function PhotoGallery({ photos }: Props) {
  const [current,  setCurrent]  = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (!photos || photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-ink-faint gap-2 bg-surface-overlay rounded-xl border border-surface-border">
        <ImageIcon size={28} />
        <p className="text-xs">No photos</p>
      </div>
    );
  }

  const prev = () => setCurrent((c) => (c - 1 + photos.length) % photos.length);
  const next = () => setCurrent((c) => (c + 1) % photos.length);

  return (
    <>
      {/* Main photo */}
      <div className="relative group rounded-xl overflow-hidden border border-surface-border bg-surface-overlay">
        <img
          src={toAbsolute(photos[current])}
          alt={`Report photo ${current + 1}`}
          className="w-full h-56 object-cover"
        />

        {/* Zoom button */}
        <button
          onClick={() => setLightbox(true)}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ZoomIn size={14} />
        </button>

        {/* Navigation arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* Counter */}
        {photos.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px]">
            {current + 1} / {photos.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="flex gap-2 mt-2">
          {photos.map((p, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                i === current
                  ? 'border-brand'
                  : 'border-surface-border opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={toAbsolute(p)}
                alt={`Thumb ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <img
            src={toAbsolute(photos[current])}
            alt="Full size"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/60 text-white hover:bg-black/80"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/60 text-white hover:bg-black/80"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 text-white text-sm px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80"
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}
import React from 'react';

/**
 * An authentic, elegant Islamic Misbaha (سبحة الأذكار والتسبيح) icon
 * matching Lucide 24x24 line grid for seamless integration.
 */
export const MisbahaIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Ring of prayer beads (خرزات السبحة) */}
    <circle cx="12" cy="4" r="1.4" />
    <circle cx="16.2" cy="5.4" r="1.4" />
    <circle cx="19" cy="9" r="1.4" />
    <circle cx="19.2" cy="13.2" r="1.4" />
    <circle cx="16.8" cy="16.8" r="1.4" />
    <circle cx="13.5" cy="18.2" r="1.4" />
    <circle cx="10.5" cy="18.2" r="1.4" />
    <circle cx="7.2" cy="16.8" r="1.4" />
    <circle cx="4.8" cy="13.2" r="1.4" />
    <circle cx="5" cy="9" r="1.4" />
    <circle cx="7.8" cy="5.4" r="1.4" />
    {/* Imam / Head Bead & Decorative Tassel (شاهد وشرابة السبحة) */}
    <path d="M12 18.5v2" />
    <path d="M10.5 20.5h3" />
    <path d="M10.2 23.5l1.8-1.5 1.8 1.5" />
  </svg>
);

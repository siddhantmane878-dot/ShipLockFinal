import React from 'react';

export default function ShiplockLogo({ style, className, vertical = true }: { style?: React.CSSProperties, className?: string, vertical?: boolean }) {
  if (vertical) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', ...style }} className={className}>
        {/* Pixel Art Ship from Landing Mockup */}
        <svg viewBox="0 0 100 80" width="100" height="80" fill="currentColor">
          {/* Main Mast */}
          <rect x="48" y="5" width="4" height="45" />
          {/* Main Sail (Large) */}
          <path d="M52 10 Q85 25 52 40 Z" />
          <path d="M48 10 Q15 25 48 40 Z" />
          {/* Top Sail (Small) */}
          <path d="M52 5 Q65 12 52 20 Z" />
          {/* Flag */}
          <path d="M48 5 L40 0 L48 -5 Z" transform="translate(0, 5)" />
          {/* Hull */}
          <path d="M15 50 L85 50 L80 70 C75 80, 25 80, 20 70 Z" />
          {/* Portholes */}
          <circle cx="35" cy="62" r="3" fill="#fff" />
          <circle cx="50" cy="62" r="3" fill="#fff" />
          <circle cx="65" cy="62" r="3" fill="#fff" />
        </svg>
        
        {/* Shiplock Wordmark */}
        <svg viewBox="0 0 220 34" width="180" fill="currentColor">
          <path d="M4 29V25H16V21H8V17H4V13H8V9H24V13H12V17H20V21H24V25H20V29H4ZM34 29V9H42V17H46V9H54V29H46V21H42V29H34ZM64 29V9H72V29H64ZM82 29V9H98V13H102V17H98V21H90V29H82ZM90 17H93.84V13H90V17ZM112 29V9H120V25H128V29H112ZM142 29V25H138V13H142V9H154V13H158V25H154V29H142ZM146 24.84H150V13.16H146V24.84ZM172 29V25H168V13H172V9H184V13H188V17H180V13H176V25H180V21H188V25H184V29H172ZM198 29V9H206V13H210V9H218V13H214V17H210V21H214V25H218V29H210V25H206V29H198Z" />
        </svg>
      </div>
    );
  }

  return (
    <svg
      viewBox="0 0 340 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      className={className}
    >
      <path d="M4 29V25H16V21H8V17H4V13H8V9H24V13H12V17H20V21H24V25H20V29H4ZM34 29V9H42V17H46V9H54V29H46V21H42V29H34ZM64 29V9H72V29H64ZM82 29V9H98V13H102V17H98V21H90V29H82ZM90 17H93.84V13H90V17ZM112 29V9H120V25H128V29H112ZM142 29V25H138V13H142V9H154V13H158V25H154V29H142ZM146 24.84H150V13.16H146V24.84ZM172 29V25H168V13H172V9H184V13H188V17H180V13H176V25H180V21H188V25H184V29H172ZM198 29V9H206V13H210V9H218V13H214V17H210V21H214V25H218V29H210V25H206V29H198Z" fill="currentColor" />
    </svg>
  );
}

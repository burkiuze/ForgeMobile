import React from 'react';

interface ForgeLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export const ForgeLogo: React.FC<ForgeLogoProps> = ({ size = 'md', showTagline = true, className = '' }) => {
  const pixelSize = size === 'sm' ? 32 : size === 'lg' ? 72 : 48;

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <div className="relative inline-flex items-center justify-center">
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform active:scale-95 duration-200"
        >
          {/* Flame Backdrop glow */}
          <circle cx="50" cy="50" r="42" fill="#F05A22" fillOpacity="0.12" />

          {/* Stylized Forge F */}
          <path
            d="M26 18 H76 C78.2 18 80 19.8 80 22 V34 C80 36.2 78.2 38 76 38 H44 V46 H68 C70.2 46 72 47.8 72 50 V60 C72 62.2 70.2 64 68 64 H44 V80 C44 82.2 42.2 84 40 84 H26 C23.8 84 22 82.2 22 80 V22 C22 19.8 23.8 18 26 18 Z"
            fill="#F05A22"
          />

          {/* Bone Accent Cut */}
          <path
            d="M36 28 H68 V32 H36 V28 Z"
            fill="#EDE6D8"
          />
          <path
            d="M36 52 H60 V56 H36 V52 Z"
            fill="#EDE6D8"
          />

          {/* Gold Sparks */}
          <circle cx="83" cy="22" r="4.5" fill="#F2B233" className="animate-spark" />
          <circle cx="73" cy="50" r="3.2" fill="#F2B233" className="animate-spark" style={{ animationDelay: '0.4s' }} />
          <circle cx="88" cy="42" r="2.8" fill="#F2B233" className="animate-spark" style={{ animationDelay: '0.9s' }} />
          <circle cx="50" cy="12" r="3" fill="#F2B233" className="animate-spark" style={{ animationDelay: '1.2s' }} />
        </svg>
      </div>

      <div className="mt-2 text-center">
        <h1 className={`font-black tracking-widest text-forge-bone ${size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-lg'}`}>
          FORGE
        </h1>
        {showTagline && (
          <p className="text-[11px] font-medium tracking-wide text-forge-gold">
            Shaped by fire
          </p>
        )}
      </div>
    </div>
  );
};

// Sensiblee placeholder client logos — wordmark lockups drawn as inline SVG.
// All strokes/fills use currentColor so the marquee controls the tint
// (neutral-400 at rest, brand on hover). Swap these components for real
// client logo <img>s when final artwork arrives.
import type { ReactNode } from "react";

function Logo({ children, name }: { children: ReactNode; name: string }) {
  return (
    <svg
      viewBox="0 0 190 44"
      className="h-9 w-auto sm:h-11"
      role="img"
      aria-label={name}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
      <text
        x="38"
        y="28.5"
        fill="currentColor"
        fontSize="16.5"
        fontWeight="700"
        letterSpacing="-0.2"
      >
        {name}
      </text>
    </svg>
  );
}

export const BRAND_LOGOS: { name: string; svg: ReactNode }[] = [
  {
    name: "Spice Route",
    svg: (
      <Logo name="Spice Route">
        {/* bowl + steam */}
        <path d="M5 18.5h22a11 11 0 0 1-22 0Z" />
        <path d="M12.5 5c0 2.2-1.8 2.8-1.8 5" />
        <path d="M19.3 5c0 2.2-1.8 2.8-1.8 5" />
      </Logo>
    ),
  },
  {
    name: "Fern Court",
    svg: (
      <Logo name="Fern Court">
        {/* hotel building + door + windows */}
        <rect x="7" y="9" width="18" height="19" rx="1.5" />
        <path d="M13.8 28v-5.5h4.4V28" />
        <path d="M11 14h2.4M18.6 14H21M11 18.5h2.4M18.6 18.5H21" />
        <path d="M16 9V5.5" />
      </Logo>
    ),
  },
  {
    name: "Mysore Roast",
    svg: (
      <Logo name="Mysore Roast">
        {/* coffee cup + handle + steam */}
        <path d="M8 13h13v6a6.5 6.5 0 0 1-13 0Z" />
        <path d="M21 14.5h1.6a3 3 0 0 1 0 6h-2" />
        <path d="M12.5 5c0 2-1.5 2.5-1.5 4.5M17.5 5c0 2-1.5 2.5-1.5 4.5" />
      </Logo>
    ),
  },
  {
    name: "Lumière Dental",
    svg: (
      <Logo name="Lumière Dental">
        {/* tooth + sparkle */}
        <path d="M15 6c-2.4 0-3.2 1.4-5.2 1.4-2.4 0-3.8 1.9-3.8 4.7 0 4.8 2.4 12.9 4.3 12.9 1.7 0 1.3-6 4.7-6s3 6 4.7 6c1.9 0 4.3-8.1 4.3-12.9 0-2.8-1.4-4.7-3.8-4.7-2 0-2.8-1.4-5.2-1.4Z" />
        <path d="M26.5 4.5v4M24.5 6.5h4" />
      </Logo>
    ),
  },
  {
    name: "Bloom & Blade",
    svg: (
      <Logo name="Bloom & Blade">
        {/* scissors */}
        <circle cx="7.5" cy="8.5" r="3.2" />
        <circle cx="7.5" cy="24.5" r="3.2" />
        <path d="M26 6 10.6 19.4M18.8 18.8 26 27M10.6 11.4 15 15" />
      </Logo>
    ),
  },
  {
    name: "Iron & Iris",
    svg: (
      <Logo name="Iron & Iris">
        {/* dumbbell */}
        <rect x="3.5" y="12" width="4" height="8" rx="1.2" />
        <rect x="24.5" y="12" width="4" height="8" rx="1.2" />
        <rect x="9.5" y="9.5" width="4" height="13" rx="1.2" />
        <rect x="18.5" y="9.5" width="4" height="13" rx="1.2" />
        <path d="M13.5 16h5" />
      </Logo>
    ),
  },
  {
    name: "Vastra & Co.",
    svg: (
      <Logo name="Vastra & Co.">
        {/* shopping bag */}
        <path d="M8.5 11.5h15l-1.3 14.6a2 2 0 0 1-2 1.9h-8.4a2 2 0 0 1-2-1.9Z" />
        <path d="M12.8 11.5V9.4a3.2 3.2 0 0 1 6.4 0v2.1" />
        <path d="M16 17.2v.01" strokeWidth="2.8" />
      </Logo>
    ),
  },
  {
    name: "Bright Minds",
    svg: (
      <Logo name="Bright Minds">
        {/* graduation cap */}
        <path d="M16 6.5 3.8 12.6 16 18.7l12.2-6.1Z" />
        <path d="M9.8 15.6v4.8c0 1.7 2.8 3.2 6.2 3.2s6.2-1.5 6.2-3.2v-4.8" />
        <path d="M28.2 13.4v6.2" />
      </Logo>
    ),
  },
];

import { cn } from "@/lib/utils";

interface BackgroundSvgProps {
  className?: string;
}

export const BackgroundSvg = ({ className }: BackgroundSvgProps) => (
  <svg
    className={cn("absolute inset-0 w-full h-full", className)}
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid slice"
  >
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
        <stop offset="50%" stopColor="hsl(var(--background))" stopOpacity="0.05" />
        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path
          d="M 40 0 L 0 0 0 40"
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth="0.5"
          strokeOpacity="0.05"
        />
      </pattern>
      <radialGradient id="glow1" cx="30%" cy="30%" r="50%">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="glow2" cx="70%" cy="70%" r="50%">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
      </radialGradient>
    </defs>
    
    {/* Base gradient */}
    <rect width="100%" height="100%" fill="url(#bgGradient)" />
    
    {/* Grid pattern */}
    <rect width="100%" height="100%" fill="url(#grid)" />
    
    {/* Glow effects */}
    <ellipse cx="25%" cy="25%" rx="30%" ry="30%" fill="url(#glow1)" />
    <ellipse cx="75%" cy="75%" rx="35%" ry="35%" fill="url(#glow2)" />
    
    {/* Decorative circles */}
    <circle cx="10%" cy="20%" r="100" fill="hsl(var(--primary))" fillOpacity="0.05" />
    <circle cx="90%" cy="80%" r="150" fill="hsl(var(--primary))" fillOpacity="0.03" />
    <circle cx="50%" cy="10%" r="80" fill="hsl(var(--primary))" fillOpacity="0.04" />
  </svg>
);

export default BackgroundSvg;

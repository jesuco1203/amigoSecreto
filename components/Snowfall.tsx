import React, { useEffect, useState } from 'react';

interface Flake {
  id: number;
  left: string;
  animationDelay: string;
  animationDuration: string;
  size: string;
  opacity: number;
}

export const Snowfall: React.FC = () => {
  const [snowflakes, setSnowflakes] = useState<Flake[]>([]);

  useEffect(() => {
    // Generate static snowflakes on mount to avoid hydration mismatches
    const flakes = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 5}s`,
      animationDuration: `${Math.random() * 10 + 10}s`, // Between 10s and 20s
      size: `${Math.random() * 0.4 + 0.2}rem`, // Random size between 0.2rem and 0.6rem
      opacity: Math.random() * 0.5 + 0.3
    }));
    setSnowflakes(flakes);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute top-[-20px] bg-white rounded-full animate-snow"
          style={{
            left: flake.left,
            width: flake.size,
            height: flake.size,
            opacity: flake.opacity,
            animationDelay: flake.animationDelay,
            animationDuration: flake.animationDuration,
          }}
        />
      ))}
    </div>
  );
};
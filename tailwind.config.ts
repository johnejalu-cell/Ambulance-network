import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#101828',
        signal: '#E23744',
        amber: '#F2B705',
        paper: '#FBFAF8',
        slate: {
          DEFAULT: '#5B6472',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      keyframes: {
        pulseRing: {
          '0%': { transform: 'scale(0.8)', opacity: '0.7' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        dotGlow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        pulseRing: 'pulseRing 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        dotGlow: 'dotGlow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;

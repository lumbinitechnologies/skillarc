/** @type {import('tailwindcss').Config} */
module.exports = {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',
      
      /* Editorial Design System - SkillArc Academic OS */
      editorial: {
        'navy': '#14234B',       /* Deep Navy / Background */
        'blue': '#3A6DAF',       /* Medium Blue / Accent Border */
        'sky': '#94BAC4',        /* Muted Sky Blue / Meta Text */
        'orange': '#E57D37',     /* Vibrant Orange / Primary CTA */
        'amber': '#EAAD62',      /* Warm Amber / Accents */
        'cream': '#ECDFCB',      /* Cream Off-White / Primary Text */
      },

      border: 'hsl(var(--border))',
      input: 'hsl(var(--input))',
      ring: 'hsl(var(--ring))',
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      primary: {
        DEFAULT: 'var(--primary)',
        foreground: 'var(--primary-foreground)',
      },
      secondary: {
        DEFAULT: 'var(--secondary)',
        foreground: 'var(--secondary-foreground)',
      },
      muted: {
        DEFAULT: 'var(--muted)',
        foreground: 'var(--muted-foreground)',
      },
      accent: 'var(--accent)',
      chart1: 'var(--chart-1)',
      chart2: 'var(--chart-2)',
      chart3: 'var(--chart-3)',
      chart4: 'var(--chart-4)',
      chart5: 'var(--chart-5)',
    },
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        grotesk: ["Space Grotesk", "sans-serif"],
        mono: ["Space Mono", "SFMono-Regular", "Consolas", "monospace"],
      },
      container: {
        center: true,
        padding: '1rem'
      }
    },
    screens: {
      'xs': '420px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px'
    }
  },
  plugins: [require('@tailwindcss/forms')],
}

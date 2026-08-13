/** @type {import('tailwindcss').Config} */
module.exports = {
    colors: {
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
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"]
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

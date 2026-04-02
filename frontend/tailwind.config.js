/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        almarai: ['Almarai', 'sans-serif'],
        chivo: ['Chivo', 'sans-serif'],
      },
      // RTL Support - Logical Properties
      spacing: {
        'start': 'var(--spacing-start)',
        'end': 'var(--spacing-end)',
      },
      margin: {
        'start': 'var(--margin-start)',
        'end': 'var(--margin-end)',
      },
      padding: {
        'start': 'var(--padding-start)',
        'end': 'var(--padding-end)',
      },
      textAlign: {
        'start': 'start',
        'end': 'end',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [
    require('tailwindcss-animate'),
    // RTL Plugin
    function({ addUtilities, addVariant }) {
      // Add RTL variant
      addVariant('rtl', '[dir="rtl"] &');
      addVariant('ltr', '[dir="ltr"] &');
      
      // Add RTL utilities
      addUtilities({
        '.text-start': {
          'text-align': 'start',
        },
        '.text-end': {
          'text-align': 'end',
        },
        '.ms-auto': {
          'margin-inline-start': 'auto',
        },
        '.me-auto': {
          'margin-inline-end': 'auto',
        },
        '.ps-0': {
          'padding-inline-start': '0',
        },
        '.pe-0': {
          'padding-inline-end': '0',
        },
        '.ps-1': {
          'padding-inline-start': '0.25rem',
        },
        '.pe-1': {
          'padding-inline-end': '0.25rem',
        },
        '.ps-2': {
          'padding-inline-start': '0.5rem',
        },
        '.pe-2': {
          'padding-inline-end': '0.5rem',
        },
        '.ps-3': {
          'padding-inline-start': '0.75rem',
        },
        '.pe-3': {
          'padding-inline-end': '0.75rem',
        },
        '.ps-4': {
          'padding-inline-start': '1rem',
        },
        '.pe-4': {
          'padding-inline-end': '1rem',
        },
        '.ms-0': {
          'margin-inline-start': '0',
        },
        '.me-0': {
          'margin-inline-end': '0',
        },
        '.ms-1': {
          'margin-inline-start': '0.25rem',
        },
        '.me-1': {
          'margin-inline-end': '0.25rem',
        },
        '.ms-2': {
          'margin-inline-start': '0.5rem',
        },
        '.me-2': {
          'margin-inline-end': '0.5rem',
        },
        '.ms-3': {
          'margin-inline-start': '0.75rem',
        },
        '.me-3': {
          'margin-inline-end': '0.75rem',
        },
        '.ms-4': {
          'margin-inline-start': '1rem',
        },
        '.me-4': {
          'margin-inline-end': '1rem',
        },
        '.start-0': {
          'inset-inline-start': '0',
        },
        '.end-0': {
          'inset-inline-end': '0',
        },
        '.start-4': {
          'inset-inline-start': '1rem',
        },
        '.end-4': {
          'inset-inline-end': '1rem',
        },
        '.border-s': {
          'border-inline-start-width': '1px',
        },
        '.border-e': {
          'border-inline-end-width': '1px',
        },
        '.rounded-s': {
          'border-start-start-radius': '0.25rem',
          'border-end-start-radius': '0.25rem',
        },
        '.rounded-e': {
          'border-start-end-radius': '0.25rem',
          'border-end-end-radius': '0.25rem',
        },
        '.flip-rtl': {
          '[dir="rtl"] &': {
            'transform': 'scaleX(-1)',
          },
        },
      });
    }
  ]
};
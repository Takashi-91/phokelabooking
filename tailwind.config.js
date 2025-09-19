/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./src/**/*.{js,html}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary browns from the logo
        primary: {
          50: '#fefdfb',
          100: '#fdf9f3',
          200: '#fbf3e7',
          300: '#f9eddb',
          400: '#f7e7cf',
          500: '#f5e1c3',
          600: '#f3dbb7',
          700: '#f1d5ab',
          800: '#efcf9f',
          900: '#edc993',
        },
        // Rich browns from the hat
        brown: {
          50: '#87694d',
          100: '#f5f0eb',
          200: '#ebe1d6',
          300: '#e1d2c1',
          400: '#d7c3ac',
          500: '#cdb497',
          600: '#c3a582',
          700: '#b9966d',
          800: '#af8758',
          900: '#a57843',
        },
        // Golden browns from the logo text
        gold: {
          50: '#fefcf7',
          100: '#fdf8ef',
          200: '#fbf1df',
          300: '#f9eacf',
          400: '#f7e3bf',
          500: '#f5dcaf',
          600: '#f3d59f',
          700: '#f1ce8f',
          800: '#efc77f',
          900: '#edc06f',
        },
         bage: {50:"#87694d",
          100:"#7c5f44",
          200:"#71553a",
          300:"#664b30",
          400:"#5b4126",
          500:"#50371c",
          600:"#452d12",
          700:"#3a2308",
          800:"#2f1900",
          900:"#240f00",
         },
        // Deep chocolate browns
        chocolate: {
          50: '#f7f5f3',
          100: '#efebe7',
          200: '#dfd7cf',
          300: '#cfc3b7',
          400: '#bfaf9f',
          500: '#af9b87',
          600: '#9f876f',
          700: '#8f7357',
          800: '#7f5f3f',
          900: '#6f4b27',
        },
        // Warm accent colors
        warm: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        // Neutral grays with warm undertones
        neutral: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}

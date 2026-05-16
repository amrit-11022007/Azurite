export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#fdf3f4',
          100: '#fae3e6',
          200: '#f4cdd2',
          300: '#ebab15',
          400: '#e18392',
          500: '#d05e71',
          600: '#ba4154',
          700: '#9d3142',
          800: '#800000', // Our primary blue
          900: '#6f2632',
          950: '#3d1017',
        },
      },
    },
  },
  plugins: [],
}

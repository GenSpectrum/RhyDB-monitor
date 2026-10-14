import { addIconSelectors } from '@iconify/tailwind';
import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{html,js,jsx,ts,tsx}'],
    theme: {
        extend: {},
    },
    plugins: [daisyui, addIconSelectors(['mdi', 'mdi-light'])],
    daisyui: {
        themes: ['light'],
    },
};

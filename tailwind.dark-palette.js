/**
 * Paleta consciente del tema.
 *
 * El CRM tiene cientos de clases de color hardcodeadas (bg-white, text-gray-700,
 * bg-blue-50, border-gray-200...). En vez de agregar `dark:` a cada una, cada
 * utilidad de color apunta a una variable CSS *por propiedad* (fondo, texto,
 * borde). En `:root` las variables valen el color original de Tailwind; en
 * `.dark` se remapean:
 *   - fondos claros (white, *-50..300) → superficies oscuras / tintes oscuros
 *   - textos oscuros (*-500..950, black) → tonos claros legibles
 *   - bordes claros (*-50..300) → bordes oscuros sutiles
 * Los tonos "sólidos" (botones bg-blue-600 + text-white) se mantienen.
 */
const plugin = require('tailwindcss/plugin');
const twColors = require('tailwindcss/colors');

const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const GRAYS = ['slate', 'gray', 'zinc', 'neutral', 'stone'];
const HUES = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan',
  'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];

// Superficie base del modo oscuro (equivale a bg-white)
const SURFACE = '#121417';

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const triplet = (hex) => hexToRgb(hex).join(' ');
// Mezcla `amount` de `a` sobre `b`
const mix = (a, b, amount) => {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const m = (x, y) => Math.round(x * amount + y * (1 - amount));
  return `${m(ar, br)} ${m(ag, bg)} ${m(ab, bb)}`;
};

// Escala neutra compartida por todas las familias de grises en dark
const DARK_GRAY = {
  bg: {
    50: '#181b1f', 100: '#1f2227', 200: '#282c32', 300: '#363b42', 400: '#4a5059',
    600: '#4b525c', 700: '#3f454e', 800: '#30353c', 900: '#262a30', 950: '#1c1f23',
  },
  text: {
    200: '#4a5059', 300: '#5f656e', 400: '#7f858f', 500: '#979ea8', 600: '#b3b9c2',
    700: '#cfd3d9', 800: '#e2e5e9', 900: '#f1f3f5', 950: '#f8f9fa',
  },
  border: { 50: '#1c1f23', 100: '#22262b', 200: '#2b2f35', 300: '#383d44', 400: '#4a5059' },
};

// Devuelve, para una propiedad y un color, el valor dark (triplet) o null si no cambia
const darkValue = (kind, family, shade) => {
  if (GRAYS.includes(family)) {
    const hex = DARK_GRAY[kind][shade];
    return hex ? triplet(hex) : null;
  }
  const c = twColors[family];
  if (kind === 'bg') {
    if (shade === '50') return mix(c['900'], SURFACE, 0.28);
    if (shade === '100') return mix(c['900'], SURFACE, 0.45);
    if (shade === '200') return mix(c['800'], SURFACE, 0.55);
    if (shade === '300') return mix(c['700'], SURFACE, 0.7);
    return null;
  }
  if (kind === 'text') {
    const map = { 500: '400', 600: '400', 700: '300', 800: '200', 900: '200', 950: '100' };
    return map[shade] ? triplet(c[map[shade]]) : null;
  }
  // border
  if (shade === '50') return mix(c['900'], SURFACE, 0.35);
  if (shade === '100') return mix(c['900'], SURFACE, 0.5);
  if (shade === '200') return mix(c['800'], SURFACE, 0.6);
  if (shade === '300') return mix(c['700'], SURFACE, 0.75);
  return null;
};

const SPECIAL = {
  bg: { white: SURFACE },
  text: { black: '#f1f3f5' },
  border: { white: SURFACE },
};
const SPECIAL_LIGHT = { white: '#ffffff', black: '#000000' };

const lightVars = {};
const darkVars = {};

const buildPalette = (kind) => {
  const palette = {
    inherit: 'inherit',
    current: 'currentColor',
    transparent: 'transparent',
    black: twColors.black,
    white: twColors.white,
  };
  Object.entries(SPECIAL[kind]).forEach(([name, dark]) => {
    const v = `--${kind}-${name}`;
    lightVars[v] = triplet(SPECIAL_LIGHT[name]);
    darkVars[v] = triplet(dark);
    palette[name] = `rgb(var(${v}) / <alpha-value>)`;
  });
  [...GRAYS, ...HUES].forEach((family) => {
    palette[family] = {};
    SHADES.forEach((shade) => {
      const original = twColors[family][shade];
      const dark = darkValue(kind, family, shade);
      if (!dark) {
        palette[family][shade] = original;
        return;
      }
      const v = `--${kind}-${family}-${shade}`;
      lightVars[v] = triplet(original);
      darkVars[v] = dark;
      palette[family][shade] = `rgb(var(${v}) / <alpha-value>)`;
    });
  });
  return palette;
};

const bgPalette = buildPalette('bg');
const textPalette = buildPalette('text');
const borderPalette = buildPalette('border');

const darkPalettePlugin = plugin(({ addBase }) => {
  addBase({
    ':root': lightVars,
    '.dark': { ...darkVars, colorScheme: 'dark' },
  });
});

module.exports = { bgPalette, textPalette, borderPalette, darkPalettePlugin };

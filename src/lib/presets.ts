export interface FilmPreset {
  id: string;
  name: string;
  brand: string;
  description: string;
  cssFilter: string;
  grain: number;
  vignette: number;
  contrast: number;
  saturation: number;
  brightness: number;
  temperature: number;
  tint: number;
}

export const FILM_PRESETS: FilmPreset[] = [
  {
    id: 'funsaver',
    name: 'FunSaver',
    brand: 'Kodak',
    description: 'Kamera sekali pakai klasik, warna cerah agak overexposed',
    cssFilter: 'contrast(1.1) saturate(1.25) brightness(1.05) sepia(0.08)',
    grain: 0.35,
    vignette: 0.4,
    contrast: 1.15,
    saturation: 1.3,
    brightness: 1.08,
    temperature: 15,
    tint: -5,
  },
  {
    id: 'quicksnap',
    name: 'QuickSnap',
    brand: 'Fujifilm',
    description: 'Warna natural dengan sedikit kehangatan',
    cssFilter: 'contrast(1.05) saturate(1.1) brightness(1.02) sepia(0.05)',
    grain: 0.28,
    vignette: 0.35,
    contrast: 1.1,
    saturation: 1.15,
    brightness: 1.03,
    temperature: 8,
    tint: 0,
  },
  {
    id: 'portra',
    name: 'Portra 400',
    brand: 'Kodak',
    description: 'Kulit natural, warna lembut dan elegan',
    cssFilter: 'contrast(0.95) saturate(0.95) brightness(1.05) sepia(0.12)',
    grain: 0.22,
    vignette: 0.25,
    contrast: 0.98,
    saturation: 0.92,
    brightness: 1.06,
    temperature: 12,
    tint: 5,
  },
  {
    id: 'ektar',
    name: 'Ektar 100',
    brand: 'Kodak',
    description: 'Warna sangat vivid dan kontras tinggi',
    cssFilter: 'contrast(1.25) saturate(1.4) brightness(1.0)',
    grain: 0.18,
    vignette: 0.3,
    contrast: 1.3,
    saturation: 1.45,
    brightness: 1.0,
    temperature: 5,
    tint: -3,
  },
  {
    id: 'hp5',
    name: 'HP5 Plus',
    brand: 'Ilford',
    description: 'Hitam putih klasik dengan grain kasar',
    cssFilter: 'grayscale(1) contrast(1.2) brightness(1.05)',
    grain: 0.55,
    vignette: 0.45,
    contrast: 1.25,
    saturation: 0,
    brightness: 1.05,
    temperature: 0,
    tint: 0,
  },
  {
    id: 'cinestill',
    name: 'CineStill 800T',
    brand: 'CineStill',
    description: 'Tungsten look, halation merah, cinematic',
    cssFilter: 'contrast(1.1) saturate(1.15) brightness(0.95) sepia(0.15) hue-rotate(-10deg)',
    grain: 0.4,
    vignette: 0.5,
    contrast: 1.15,
    saturation: 1.2,
    brightness: 0.95,
    temperature: -20,
    tint: 10,
  },
];

export function getPreset(id: string): FilmPreset {
  return FILM_PRESETS.find((p) => p.id === id) || FILM_PRESETS[0];
}
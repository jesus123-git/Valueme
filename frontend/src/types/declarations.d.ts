// ─── Declaraciones de módulos para archivos estáticos ────────────────────────
//
// Next.js genera estas declaraciones en .next/types/ cuando el servidor de
// desarrollo está corriendo DENTRO del proyecto (no en Docker). Como nuestro
// dev-server corre en un contenedor, esa carpeta no existe en el host y VS Code
// no puede resolver las importaciones de CSS/imágenes/fuentes.
//
// Este archivo reemplaza esas declaraciones para que TypeScript en el host
// reconozca los módulos correctamente sin necesitar .next/types.
// ─────────────────────────────────────────────────────────────────────────────

// CSS — side-effect import: import './globals.css'
declare module '*.css';

// CSS Modules — named import: import styles from './Component.module.css'
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

// Imágenes
declare module '*.svg' {
  import type { FC, SVGProps } from 'react';
  const ReactComponent: FC<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
declare module '*.png'  { const src: string; export default src; }
declare module '*.jpg'  { const src: string; export default src; }
declare module '*.jpeg' { const src: string; export default src; }
declare module '*.webp' { const src: string; export default src; }
declare module '*.gif'  { const src: string; export default src; }
declare module '*.ico'  { const src: string; export default src; }

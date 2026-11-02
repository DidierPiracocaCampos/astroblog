# @didierp/astroblog

## 0.3.2

### Patch Changes

- d77357a: Dependencias: `@astrojs/mdx` 8.1.2 y pruebas con Astro 7.4.4. Primera versión publicada desde el CI con npm Trusted Publishing y provenance.

## 0.3.1

### Patch Changes

- fbeb0fa: Documentación y metadatos: campo `author` en `package.json`, titular completo en `LICENSE`, enlaces del README válidos también en npm, secciones de desarrollo y licencia, y aclaración del autor y el *publisher* del JSON-LD cuando no hay autor configurado.

## 0.3.0

### Minor Changes

- f5b4f65: Sin autor configurado, el JSON-LD de los posts atribuye el contenido a la organización del sitio (`config.title`) en lugar de a una Person con el nombre del titular.

## 0.2.0

### Minor Changes

- ea2c4c6: Silos y señales YMYL. Todo es opcional: un sitio 0.1 genera las mismas páginas.
  
  - `permalinks: 'silo'`: posts en `/<categoria>/<slug>/` y listados en `/<categoria>/` (página n en `/<categoria>/pagina/<n>/`), con validación de colisiones en el build.
  - Frontmatter `reviewer`, `reviewedDate`, `faq` y `sources`; config `reviewers`, `disclaimer`, `seo.articleType` y `author.bio`/`jobTitle`/`sameAs`. Se muestran en el post y se emiten como JSON-LD (`FAQPage`, `reviewedBy`).
  - Componentes sustituibles nuevos: `Faq`, `Sources` y `ReviewedBy`.
  - `@didierp/astroblog/layouts` exporta `BaseLayout` y `PageLayout` para páginas propias.

## 0.1.0

### Minor Changes

- a818c18: Primera versión

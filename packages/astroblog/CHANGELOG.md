# @didierp/astroblog

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

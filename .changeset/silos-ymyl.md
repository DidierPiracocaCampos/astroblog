---
"@didierp/astroblog": minor
---

Silos y señales YMYL. Todo es opcional: un sitio 0.1 genera las mismas páginas.

- `permalinks: 'silo'`: posts en `/<categoria>/<slug>/` y listados en `/<categoria>/` (página n en `/<categoria>/pagina/<n>/`), con validación de colisiones en el build.
- Frontmatter `reviewer`, `reviewedDate`, `faq` y `sources`; config `reviewers`, `disclaimer`, `seo.articleType` y `author.bio`/`jobTitle`/`sameAs`. Se muestran en el post y se emiten como JSON-LD (`FAQPage`, `reviewedBy`).
- Componentes sustituibles nuevos: `Faq`, `Sources` y `ReviewedBy`.
- `@didierp/astroblog/layouts` exporta `BaseLayout` y `PageLayout` para páginas propias.

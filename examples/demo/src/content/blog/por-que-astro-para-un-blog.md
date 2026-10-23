---
title: "Por qué elegí Astro para escribir este blog"
description: "Contenido en Markdown, HTML estático por defecto y JavaScript solo donde hace falta. Las razones detrás de la elección de Astro."
pubDate: 2026-08-04
category: Programación Web
tags: [astro, markdown, sitios estáticos]
---

Durante años mantuve un blog sobre un CMS con base de datos. Funcionaba, pero cada actualización era una pequeña apuesta y el hosting costaba más que el dominio. Cuando decidí empezar de cero tenía tres requisitos claros: escribir en Markdown, publicar HTML estático y no pagar por un servidor.

## Markdown como fuente de verdad

Cada artículo es un archivo `.md` con su frontmatter: título, descripción, fecha, categoría y etiquetas. Puedo escribir en cualquier editor, revisar los cambios con Git y mover el contenido a otra herramienta si algún día lo necesito.

## Cero JavaScript por defecto

Astro genera HTML y CSS. Solo envía JavaScript a los componentes que lo necesitan, como el buscador o el selector de tema. El resultado son páginas que cargan rápido incluso en conexiones lentas.

## Despliegue sin servidor

El resultado del build es una carpeta `dist/` que cualquier hosting estático sirve sin configuración. En mi caso, Cloudflare Pages construye el sitio en cada `git push` y lo distribuye por su red global.

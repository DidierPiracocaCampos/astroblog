---
title: "Guía práctica de Core Web Vitals para blogs estáticos"
description: "Qué miden LCP, INP y CLS, cómo diagnosticarlos con herramientas gratuitas y qué ajustes concretos mejoran un blog estático."
pubDate: 2026-09-18
updatedDate: 2026-10-02
category: Rendimiento
tags: [core web vitals, lighthouse, imágenes]
cover: ../../assets/portada-rendimiento.png
coverAlt: Degradado de colores que representa la velocidad de carga de una página
---

Un blog estático parte con ventaja: no hay servidor que genere cada página ni base de datos que consultar. Aun así, es fácil perder esa ventaja con imágenes pesadas, fuentes que bloquean el renderizado o anuncios que desplazan el contenido. Esta guía repasa las tres métricas que Google usa para valorar la experiencia de página y cómo atacarlas una por una.

## LCP: el elemento más grande, cuanto antes

El *Largest Contentful Paint* mide cuánto tarda en pintarse el elemento más grande visible al cargar, normalmente la imagen de portada o el titular. El objetivo es que ocurra antes de 2,5 segundos.

- Sirve las imágenes en formatos modernos (WebP o AVIF) y con dimensiones explícitas.
- No cargues de forma diferida (`loading="lazy"`) la imagen principal: queremos justo lo contrario.
- Evita que el titular dependa de una fuente web que todavía no ha llegado.

## INP: que la página responda al instante

El *Interaction to Next Paint* sustituyó a FID y mide la latencia de todas las interacciones, no solo de la primera. En un blog suele estropearse por scripts de terceros que ocupan el hilo principal.

Carga los scripts no esenciales con `async` o después del consentimiento, y desconfía de los widgets que se ejecutan en cada página aunque nadie los use.

## CLS: nada debe moverse

El *Cumulative Layout Shift* penaliza los saltos de contenido. Los culpables habituales son las imágenes sin `width` y `height` y los bloques de anuncios que aparecen de repente. La solución es reservar el espacio: un contenedor con altura mínima evita que el texto salte cuando llega el anuncio.

## Cómo medir sin volverse loco

Lighthouse, en las herramientas de desarrollo del navegador, da una foto de laboratorio. PageSpeed Insights añade datos reales de usuarios cuando el sitio tiene tráfico suficiente. Mide siempre en modo incógnito y con la limitación de red móvil activada: es como te verá la mayoría de tus lectores.

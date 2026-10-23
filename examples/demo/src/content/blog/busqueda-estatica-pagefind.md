---
title: "Búsqueda sin servidor con Pagefind"
description: "Pagefind indexa el HTML generado y sirve la búsqueda desde archivos estáticos. Así funciona y por qué encaja tan bien en un blog."
pubDate: 2026-05-12
category: Programación Web
tags: [pagefind, búsqueda, sitios estáticos]
---

Añadir un buscador a un sitio estático solía implicar un servicio externo de pago o un índice JSON enorme que el navegador descargaba entero. Pagefind propone otra cosa: indexar el HTML ya generado y dividir el índice en fragmentos pequeños que se descargan bajo demanda.

## Cómo funciona

Después del build, Pagefind recorre la carpeta de salida, lee el contenido marcado con `data-pagefind-body` y genera un índice en `/pagefind/`. En el navegador, una pequeña biblioteca descarga solo los fragmentos necesarios para cada consulta.

## Lo que se indexa

Solo el cuerpo de los artículos: así los menús, el pie de página y los textos legales no ensucian los resultados. Las páginas de listado tampoco aparecen, porque no tienen ese atributo.

## Coste en rendimiento

Ninguno hasta que alguien abre el buscador. La biblioteca se carga en ese momento, y el índice de un blog de cien artículos ocupa unos pocos cientos de kilobytes repartidos en muchos archivos pequeños.

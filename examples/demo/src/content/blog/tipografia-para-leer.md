---
title: "Tipografía pensada para leer en pantalla"
description: "Tamaño de letra, longitud de línea e interlineado. Los tres ajustes tipográficos que más mejoran la lectura de artículos largos."
pubDate: 2026-04-08
category: Diseño
tags: [tipografía, css, accesibilidad]
---

Un buen artículo puede volverse ilegible con una tipografía descuidada. No hace falta ser diseñador para acertar: basta con respetar tres medidas.

## Tamaño base generoso

En pantalla, 16 píxeles es el mínimo razonable para el texto principal; 18 suele leerse mejor en artículos largos. Usa unidades relativas (`rem`) para respetar el tamaño que el lector haya elegido en su navegador.

## Entre 60 y 75 caracteres por línea

Las líneas demasiado largas obligan a la vista a buscar el comienzo de la siguiente. Limitar el ancho del contenido con `max-width: 65ch` resuelve el problema en una sola línea de CSS.

## Interlineado de 1,5 a 1,7

El texto necesita aire. Un interlineado cercano a 1,6 mejora la lectura sin separar tanto las líneas como para romper la continuidad del párrafo.

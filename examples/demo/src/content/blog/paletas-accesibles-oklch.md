---
title: "Paletas de color accesibles con OKLCH"
description: "Cómo usar el espacio de color OKLCH para construir paletas con contraste suficiente y variaciones de luminosidad predecibles."
pubDate: 2026-07-22
category: Diseño
tags: [css, color, accesibilidad]
---

Durante mucho tiempo definimos colores en hexadecimal o en HSL. El problema de HSL es que la luminosidad no es perceptual: un amarillo y un azul con la misma «L» no se ven igual de claros. OKLCH corrige eso.

## Tres números con sentido

Un color OKLCH tiene luminosidad (`L`, de 0 % a 100 %), croma (`C`, la intensidad) y tono (`H`, en grados). Si mantienes la luminosidad y cambias el tono, obtienes colores que se perciben igual de claros. Eso hace que generar variantes sea casi mecánico:

```css
:root {
  --azul: oklch(60% 0.2 250);
  --azul-claro: oklch(85% 0.08 250);
  --azul-oscuro: oklch(35% 0.12 250);
}
```

## Contraste antes que estética

Las pautas WCAG piden un contraste mínimo de 4,5:1 para el texto normal. Con OKLCH es fácil razonar sobre ello: si el fondo está por encima del 90 % de luminosidad, el texto debería estar por debajo del 45 %. Comprueba siempre el resultado con una herramienta de contraste antes de darlo por bueno.

## Llevarlo a daisyUI

Los temas de daisyUI ya usan OKLCH en sus variables, así que personalizar un tema consiste en redefinir unas pocas variables como `--color-primary` sobre el selector del tema.

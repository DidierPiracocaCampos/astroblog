# Contribuir a astroblog

Gracias por tu interés. Se aceptan issues y pull requests en español o en inglés.

## Antes de empezar

- **Bugs**: abre un issue con la plantilla de bug, incluyendo tu versión de Astro, de Node y la parte relevante de `astro.config.mjs`.
- **Funcionalidades nuevas**: abre primero un issue para comentarlas. Un PR grande sin discusión previa puede no encajar con el diseño del paquete.
- **Vulnerabilidades**: no abras un issue público; sigue [SECURITY.md](SECURITY.md).

## Entorno

Requisitos: Node ≥ 22.23.4 y pnpm 11 (con `corepack enable` se usa la versión fijada en `packageManager`).

```sh
pnpm install
pnpm test                # tests unitarios y de build (packages/astroblog)
pnpm build:demo          # build del demo
pnpm --filter demo dev   # demo en modo desarrollo
pnpm check:demo          # astro check del demo
```

El CI ejecuta además Lighthouse CI sobre el demo (`lighthouserc.json`).

## Pull requests

1. Crea una rama desde `main` (`feat/…`, `fix/…`, `docs/…`).
2. Añade o actualiza tests en `packages/astroblog/test/` para cualquier cambio de comportamiento.
3. Si el cambio cambia lo que se publica en npm (código, tipos o README del paquete), añade un changeset:
   ```sh
   pnpm changeset
   ```
   Elige `patch` para correcciones, `minor` para funcionalidades nuevas compatibles y `major` para cambios incompatibles, y describe el cambio para quien usa el paquete.
4. Usa mensajes de commit con el formato [Conventional Commits](https://www.conventionalcommits.org/es/) (`feat:`, `fix:`, `docs:`, `chore:`…).
5. Actualiza `packages/astroblog/README.md` si cambias opciones, rutas, props o textos de la interfaz.
6. Comprueba que `pnpm test` y `pnpm build:demo` pasan antes de pedir revisión.

La publicación en npm es automática: al hacer merge en `main`, Changesets abre un PR de versión y, al aceptarlo, publica el paquete.

## Licencia

Al contribuir aceptas que tu aportación se distribuya bajo la [licencia MIT](LICENSE) del proyecto.

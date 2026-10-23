# astroblog

Monorepo de [`@didierp/astroblog`](packages/astroblog), una integración de Astro que convierte un proyecto en un blog estático completo, listo para AdSense y Cloudflare Pages.

- **Documentación del paquete**: [packages/astroblog/README.md](packages/astroblog/README.md) (instalación, configuración, consentimiento, componentes).
- **Demo**: [examples/demo](examples/demo), un blog de ejemplo que usa el paquete del workspace.

## Desarrollo

Requisitos: Node ≥ 22.23.4 y pnpm ≥ 9.

```sh
pnpm install          # dependencias de todo el workspace
pnpm -r test          # tests unitarios y de build del paquete
pnpm build:demo       # build del demo (examples/demo/dist)
pnpm --filter demo dev  # servidor de desarrollo del demo
```

## Licencia

[MIT](LICENSE)

import type { AstroIntegration } from 'astro';

export default function astroblog(userConfig?: unknown): AstroIntegration {
  void userConfig;
  return {
    name: '@didierp/astroblog',
    hooks: {
      'astro:config:setup': () => {},
    },
  };
}

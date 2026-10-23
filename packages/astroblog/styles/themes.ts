/** astroblog's own daisyUI themes; emitted into the generated stylesheet only when selected. */
const SHARED = `  --radius-selector: 0.5rem;
  --radius-field: 0.375rem;
  --radius-box: 0.75rem;
  --size-selector: 0.25rem;
  --size-field: 0.25rem;
  --border: 1px;
  --depth: 0;
  --noise: 0;`;

function block(name: string, flags: string, scheme: string, colors: Record<string, string>): string {
  const vars = Object.entries(colors).map(([k, v]) => `  --color-${k}: ${v};`).join('\n');
  return `@plugin "daisyui/theme" {\n  name: "${name}";\n${flags}\n  color-scheme: ${scheme};\n${vars}\n${SHARED}\n}`;
}

export const LIGHT_THEME = block('astroblog-light', '  default: true;\n  prefersdark: false;', 'light', {
  'base-100': 'oklch(100% 0 0)', 'base-200': 'oklch(97% 0 0)', 'base-300': 'oklch(92% 0 0)',
  'base-content': 'oklch(25% 0.01 255)',
  primary: 'oklch(55% 0.2 255)', 'primary-content': 'oklch(98% 0.01 255)',
  secondary: 'oklch(45% 0.03 255)', 'secondary-content': 'oklch(98% 0 0)',
  accent: 'oklch(65% 0.15 200)', 'accent-content': 'oklch(20% 0.03 200)',
  neutral: 'oklch(30% 0.02 255)', 'neutral-content': 'oklch(97% 0 0)',
  info: 'oklch(70% 0.15 235)', 'info-content': 'oklch(20% 0.04 235)',
  success: 'oklch(70% 0.17 150)', 'success-content': 'oklch(20% 0.05 150)',
  warning: 'oklch(82% 0.17 85)', 'warning-content': 'oklch(25% 0.06 85)',
  error: 'oklch(62% 0.22 27)', 'error-content': 'oklch(97% 0.01 27)',
});

export const DARK_THEME = block('astroblog-dark', '  default: false;\n  prefersdark: true;', 'dark', {
  'base-100': 'oklch(22% 0.01 255)', 'base-200': 'oklch(19% 0.01 255)', 'base-300': 'oklch(16% 0.01 255)',
  'base-content': 'oklch(92% 0.01 255)',
  primary: 'oklch(65% 0.19 255)', 'primary-content': 'oklch(15% 0.03 255)',
  secondary: 'oklch(70% 0.03 255)', 'secondary-content': 'oklch(15% 0.01 255)',
  accent: 'oklch(72% 0.14 200)', 'accent-content': 'oklch(18% 0.03 200)',
  neutral: 'oklch(32% 0.02 255)', 'neutral-content': 'oklch(92% 0.01 255)',
  info: 'oklch(72% 0.14 235)', 'info-content': 'oklch(18% 0.04 235)',
  success: 'oklch(72% 0.16 150)', 'success-content': 'oklch(18% 0.05 150)',
  warning: 'oklch(83% 0.16 85)', 'warning-content': 'oklch(22% 0.06 85)',
  error: 'oklch(66% 0.21 27)', 'error-content': 'oklch(15% 0.04 27)',
});

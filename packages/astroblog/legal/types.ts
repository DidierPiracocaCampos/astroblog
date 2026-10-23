import type { ResolvedConfig } from '../schema/config';

/** Props of every template under legal/<lang>/ (spec §8). */
export interface LegalTemplateProps {
  config: ResolvedConfig;
  /** Last-updated date shown on legal pages: the build date. */
  updated: Date;
}

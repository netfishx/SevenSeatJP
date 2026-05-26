export const BUTTON_STYLES = {
  link: 'group inline-flex items-center gap-2 min-h-11 text-base text-text border-b border-text/40 hover:border-gold hover:text-gold transition-colors pb-1',
  quiet:
    'inline-flex items-center justify-center min-h-12 px-7 border border-gold/60 text-gold hover:bg-gold hover:text-bg transition-colors font-display tracking-[0.12em] uppercase text-sm rounded-[2px]',
  solid:
    'inline-flex items-center justify-center min-h-12 px-7 bg-gold text-bg hover:bg-gold-dark transition-colors font-display tracking-[0.12em] uppercase text-sm rounded-[2px]',
} as const;

export type ButtonVariant = keyof typeof BUTTON_STYLES;

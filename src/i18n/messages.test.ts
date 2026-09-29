import { describe, expect, it } from 'vitest';
import { en, fa, t } from '@/i18n/messages';

describe('shell messages', () => {
  it('fa has exactly the keys of en', () => {
    expect(Object.keys(fa).sort()).toEqual(Object.keys(en).sort());
  });

  it('t returns a non-empty string', () => {
    expect(t('nav.timer')).not.toBe('');
  });
});

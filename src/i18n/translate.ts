import { en } from './en';
import type { MessageKey, Messages } from './en';
import { fa } from './fa';
import type { Locale } from './locale';

const dictionaries: Record<Locale, Messages> = { en, fa };

export type Params = Record<string, string | number>;

/** Looks up a message and replaces `{name}` placeholders. Unknown placeholders are left as is. */
export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  const message = dictionaries[locale][key];
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

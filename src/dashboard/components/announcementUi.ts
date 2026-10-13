import { currentLocale } from '@/shared/i18n';
import type { AnnouncementTag } from '@/shared/announcements';

/** Tag chip colours, shared by the What's new panel, modal and sidebar card. */
export function tagClass(tag: AnnouncementTag): string {
  return {
    release: 'bg-brand-50 text-brand-600 dark:bg-commentgrab-soft dark:text-commentgrab-violet',
    news: 'bg-[#e7f5ec] text-[#1f7a45] dark:bg-[#1f7a45]/20 dark:text-[#6fcf97]',
    tip: 'bg-[#fdeede] text-[#b5651d] dark:bg-[#b5651d]/20 dark:text-[#f0b070]',
    post: 'bg-[#e7f0fd] text-[#2c5fb3] dark:bg-[#2c5fb3]/20 dark:text-[#7aa9ee]',
  }[tag];
}

export function formatDate(d: string): string {
  try {
    return new Intl.DateTimeFormat(currentLocale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(`${d}T00:00:00Z`),
    );
  } catch {
    return d;
  }
}

export type BodyBlock = { kind: 'list'; items: string[] } | { kind: 'p'; text: string };

const BULLET_RE = /^\s*[-*•]\s+/;

/** Plain-text body: blank lines split paragraphs, blocks of "- " lines are lists. */
export function parseBody(body: string): BodyBlock[] {
  return body.split(/\n{2,}/).map((b) => {
    const lines = b.split('\n');
    return lines.every((l) => BULLET_RE.test(l))
      ? { kind: 'list', items: lines.map((l) => l.replace(BULLET_RE, '')) }
      : { kind: 'p', text: lines.join('\n') };
  });
}

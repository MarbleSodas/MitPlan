/**
 * AbilityIcon — a tiny inline SVG icon set for the seeded mitigation
 * abilities. The full FFXIV action library has hundreds of icons; we
 * ship a curated set for the 23 v1 demo abilities so the editor
 * renders something more than text chips.
 *
 * Each icon is a colored circle + 1-2 character monogram. Cheap to
 * render, doesn't need an external asset, and gives a visual scan
 * aid for the Quick-mits strip.
 *
 * If a requested ability has no icon yet, falls back to a neutral
 * gray circle with the job abbreviation.
 */
import { cn } from '@/lib/utils';

export type AbilityIconKey =
  | 'reprisal'
  | 'rampart'
  | 'sentinel'
  | 'vengeance'
  | 'shadow-wall'
  | 'dark-mind'
  | 'nebula'
  | 'heart-of-corundum'
  | 'hallowed-ground'
  | 'holmgang'
  | 'living-dead'
  | 'superbolide'
  | 'bloodwhetting'
  | 'arms-length'
  | 'feint'
  | 'addle'
  | 'reprise'
  | 'dark-missionary'
  | 'collective-unconscious'
  | 'sacred-soil'
  | 'kerachole'
  | 'holos'
  | 'panhaima'
  | 'liturgy-of-the-bell'
  | 'tactician'
  | 'shield-samba'
  | 'troubadour'
  | "nature's-minne"
  | 'fey-illumination'
  | 'excogitation'
  | 'indomitability'
  | 'succor'
  | 'tetragrammaton'
  | 'aquaveil';

const ICON_MAP: Record<AbilityIconKey, { color: string; glyph: string }> = {
  'reprisal': { color: 'bg-red-500/15 text-red-700 dark:text-red-300', glyph: 'Rp' },
  'rampart': { color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300', glyph: 'Rm' },
  'sentinel': { color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300', glyph: 'Sn' },
  'vengeance': { color: 'bg-red-500/15 text-red-700 dark:text-red-300', glyph: 'Vn' },
  'shadow-wall': { color: 'bg-slate-500/15 text-slate-700 dark:text-slate-300', glyph: 'SW' },
  'dark-mind': { color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300', glyph: 'DM' },
  'nebula': { color: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300', glyph: 'Nb' },
  'heart-of-corundum': { color: 'bg-pink-500/15 text-pink-700 dark:text-pink-300', glyph: 'HoC' },
  'hallowed-ground': { color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', glyph: 'HG' },
  'holmgang': { color: 'bg-red-500/15 text-red-700 dark:text-red-300', glyph: 'Hm' },
  'living-dead': { color: 'bg-slate-500/15 text-slate-700 dark:text-slate-300', glyph: 'LD' },
  'superbolide': { color: 'bg-orange-500/15 text-orange-700 dark:text-orange-300', glyph: 'Sb' },
  'bloodwhetting': { color: 'bg-red-500/15 text-red-700 dark:text-red-300', glyph: 'Bw' },
  'arms-length': { color: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300', glyph: 'AL' },
  'feint': { color: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300', glyph: 'Fn' },
  'addle': { color: 'bg-violet-500/15 text-violet-700 dark:text-violet-300', glyph: 'Ad' },
  'reprise': { color: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300', glyph: 'Rp' },
  'dark-missionary': { color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300', glyph: 'DM' },
  'collective-unconscious': { color: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300', glyph: 'CU' },
  'sacred-soil': { color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', glyph: 'SS' },
  'kerachole': { color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', glyph: 'Kr' },
  'holos': { color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', glyph: 'Hl' },
  'panhaima': { color: 'bg-teal-500/15 text-teal-700 dark:text-teal-300', glyph: 'Ph' },
  'liturgy-of-the-bell': { color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', glyph: 'LtB' },
  'tactician': { color: 'bg-sky-500/15 text-sky-700 dark:text-sky-300', glyph: 'Tc' },
  'shield-samba': { color: 'bg-pink-500/15 text-pink-700 dark:text-pink-300', glyph: 'ShS' },
  'troubadour': { color: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300', glyph: 'Tr' },
  'fey-illumination': { color: 'bg-violet-500/15 text-violet-700 dark:text-violet-300', glyph: 'FI' },
  "nature's-minne": { color: 'bg-green-500/15 text-green-700 dark:text-green-300', glyph: 'NM' },
  'excogitation': { color: 'bg-violet-500/15 text-violet-700 dark:text-violet-300', glyph: 'Ex' },
  'indomitability': { color: 'bg-violet-500/15 text-violet-700 dark:text-violet-300', glyph: 'In' },
  'succor': { color: 'bg-violet-500/15 text-violet-700 dark:text-violet-300', glyph: 'Sc' },
  'tetragrammaton': { color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', glyph: 'Tt' },
  'aquaveil': { color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300', glyph: 'Aq' },
};

/** Resolve an AbilityInfo to an icon key, or null if no icon is known. */
export const abilityIconKey = (
  abilityId: string | null | undefined,
): AbilityIconKey | null => {
  if (!abilityId) return null;
  const slug = abilityId.toLowerCase().replace(/^a-/, '').replace(/-partymit$/, '');
  const map = ICON_MAP as unknown as Record<string, AbilityIconKey>;
  return map[slug] ?? null;
};

export const AbilityIcon = ({
  abilityId,
  jobAbbrev,
  className,
  size = 'sm',
}: {
  abilityId: string | null | undefined;
  jobAbbrev?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}) => {
  const key = abilityIconKey(abilityId);
  const sizeClass =
    size === 'xs'
      ? 'size-5 text-[9px]'
      : size === 'md'
        ? 'size-8 text-xs'
        : 'size-6 text-[10px]';
  if (!key) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-mono font-semibold text-muted-foreground',
          sizeClass,
          className,
        )}
        aria-hidden="true"
      >
        {jobAbbrev?.slice(0, 2) ?? '?'}
      </span>
    );
  }
  const { color, glyph } = ICON_MAP[key];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-mono font-semibold',
        sizeClass,
        color,
        className,
      )}
      aria-hidden="true"
    >
      {glyph}
    </span>
  );
};
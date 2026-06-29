/**
 * XIVMitPlan logo mark. A stylized shield with a mit bar — the brand's
 * "planning + mitigation" pun, drawn inline so it ships in the bundle
 * with no extra HTTP request.
 */
import { cn } from '@/lib/utils';

export const Logo = ({ className }: { className?: string }) => (
  <svg
    className={cn('size-6 shrink-0', className)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    {/* Shield outline */}
    <path
      d="M12 2 L21 6 L21 12 C21 17 17 21 12 22 C7 21 3 17 3 12 L3 6 Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Mitigation bar (horizontal hash mark in the shield) */}
    <line x1="7" y1="11" x2="17" y2="11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <line x1="7" y1="15" x2="17" y2="15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);
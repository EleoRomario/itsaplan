import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// A Linear-style pill trigger: rounded, muted, icon + label. Used by the field
// selects, the new-issue modal and the issue detail panel so every field trigger
// looks the same. It never grows past the room it is given, so a caller puts its
// text in a `truncate` span rather than letting a long value push out of the
// column.
export const Pill = forwardRef<
  HTMLButtonElement,
  { active?: boolean } & React.ComponentProps<'button'>
>(({ active, className, children, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-full border px-2.5 text-sm transition-colors hover:bg-accent [&_svg:not([class*='size-'])]:size-3.5 [&>svg]:shrink-0",
      active ? 'text-foreground' : 'text-muted-foreground',
      className,
    )}
    {...props}
  >
    {children}
  </button>
));
Pill.displayName = 'Pill';

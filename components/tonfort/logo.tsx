import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  showWordmark?: boolean
}

/**
 * Tonfort monogram — two minimalist "T" letters.
 * The second T is rotated 180° and interlocked with the first,
 * forming a balanced, symmetric mark.
 */
export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        className="h-7 w-7"
        aria-hidden="true"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="square"
      >
        {/* First T */}
        <path d="M6 9 H22" />
        <path d="M14 9 V31" />
        {/* Second T, rotated 180° and interlocked */}
        <path d="M34 31 H18" />
        <path d="M26 31 V9" />
      </svg>
      {showWordmark && (
        <span className="font-display text-lg font-medium uppercase tracking-[0.35em] leading-none">
          Tonfort
        </span>
      )}
    </span>
  )
}

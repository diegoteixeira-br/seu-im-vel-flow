import symbolSrc from "@/assets/alugaflow-symbol.png";
import { cn } from "@/lib/utils";

type Props = {
  /** Show the "AlugaFlow" wordmark next to the symbol. Defaults to true. */
  withWordmark?: boolean;
  /** Symbol size in px. The wordmark scales relative to it. */
  size?: number;
  className?: string;
};

/**
 * AlugaFlow logo: house-roof "A" symbol + "AlugaFlow" wordmark beside it.
 */
export function BrandLogo({ withWordmark = true, size = 36, className }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src={symbolSrc}
        alt="AlugaFlow"
        width={size}
        height={size}
        style={{ height: size, width: size }}
        className="object-contain shrink-0"
      />
      {withWordmark && (
        <span
          className="font-bold tracking-tight text-foreground"
          style={{ fontSize: Math.round(size * 0.6), lineHeight: 1 }}
        >
          AlugaFlow
        </span>
      )}
    </span>
  );
}

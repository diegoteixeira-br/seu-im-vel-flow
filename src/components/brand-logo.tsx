import logoSrc from "@/assets/alugaflow-logo.png";
import { cn } from "@/lib/utils";

type Props = {
  /** Show the wordmark next to the symbol. Defaults to true. */
  withWordmark?: boolean;
  /** Symbol size in px. */
  size?: number;
  className?: string;
};

/**
 * AlugaFlow logo. The source PNG already contains the "AlugaFlow" wordmark,
 * so when `withWordmark` is false we crop to roughly the top symbol area.
 */
export function BrandLogo({ withWordmark = true, size = 32, className }: Props) {
  if (withWordmark) {
    return (
      <img
        src={logoSrc}
        alt="AlugaFlow"
        width={size * 4}
        height={size}
        style={{ height: size, width: "auto" }}
        className={cn("object-contain", className)}
      />
    );
  }
  // Symbol-only: use the top portion of the artwork.
  return (
    <span
      aria-label="AlugaFlow"
      role="img"
      className={cn("inline-block bg-no-repeat bg-contain", className)}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${logoSrc})`,
        backgroundPosition: "center top",
        backgroundSize: "100% 150%",
      }}
    />
  );
}

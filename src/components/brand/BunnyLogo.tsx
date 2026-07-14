const LOGO_SRC = "/images/brand/Bunny_logo.png";
const LOGO_NATIVE_WIDTH = 1377;
const LOGO_NATIVE_HEIGHT = 768;

type BunnyLogoProps = {
  /** Rendered height in px; width follows automatically from the asset's aspect ratio. */
  size?: number;
  className?: string;
};

/**
 * The main Listy bunny brand mark (public/images/brand/Bunny_logo.png).
 * Decorative — pages that show this alongside the "Listy" wordmark
 * should not also give it meaningful alt text (avoids double
 * announcement by screen readers).
 */
export function BunnyLogo({ size = 64, className = "" }: BunnyLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny bundled static brand image
    <img
      src={LOGO_SRC}
      alt=""
      width={LOGO_NATIVE_WIDTH}
      height={LOGO_NATIVE_HEIGHT}
      className={["object-contain", className].join(" ")}
      style={{ height: size, width: "auto" }}
    />
  );
}

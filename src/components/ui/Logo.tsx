/**
 * Adaptive Zephyron logo component that responds to theme and accent color.
 *
 * The logo adapts in two ways:
 * 1. Brightness: Inverts for light theme, stays normal for dark themes
 * 2. Color: Tints with the current accent color (hsl(var(--h3)))
 *
 * @param size - Width/height in pixels (default: 32)
 * @param className - Additional CSS classes
 */

interface LogoProps {
  size?: number
  className?: string
  alt?: string
}

export function Logo({ size = 32, className = '', alt = 'Zephyron logo' }: LogoProps) {
  return (
    <div
      className={`logo-wrapper ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src="/logo-128.png"
        alt={alt}
        className="logo-adaptive"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          // Apply accent color tint via CSS filter
          filter: `
            brightness(var(--logo-brightness, 1))
            contrast(1.05)
            hue-rotate(var(--logo-hue-rotate, 0deg))
            saturate(var(--logo-saturate, 1.2))
          `,
          transition: 'filter 0.3s ease',
        }}
      />
      <style>{`
        /* Default (dark themes) */
        :root {
          --logo-brightness: 1;
          --logo-hue-rotate: 0deg;
          --logo-saturate: 1.2;
        }

        /* Light theme - increase brightness */
        :root[data-theme="light"] {
          --logo-brightness: 0.9;
        }

        /* Adapt to accent color by rotating hue */
        /* Violet (255) - default */
        :root[data-accent="violet"] {
          --logo-hue-rotate: 0deg;
        }

        /* Blue (220) - rotate -35deg */
        :root[data-accent="blue"] {
          --logo-hue-rotate: -35deg;
        }

        /* Cyan (190) - rotate -65deg */
        :root[data-accent="cyan"] {
          --logo-hue-rotate: -65deg;
        }

        /* Teal (170) - rotate -85deg */
        :root[data-accent="teal"] {
          --logo-hue-rotate: -85deg;
        }

        /* Green (145) - rotate -110deg */
        :root[data-accent="green"] {
          --logo-hue-rotate: -110deg;
        }

        /* Yellow (50) - rotate 155deg */
        :root[data-accent="yellow"] {
          --logo-hue-rotate: 155deg;
          --logo-saturate: 1.4;
        }

        /* Orange (25) - rotate 130deg */
        :root[data-accent="orange"] {
          --logo-hue-rotate: 130deg;
        }

        /* Red (0) - rotate 105deg */
        :root[data-accent="red"] {
          --logo-hue-rotate: 105deg;
        }

        /* Pink (330) - rotate 75deg */
        :root[data-accent="pink"] {
          --logo-hue-rotate: 75deg;
        }

        /* Rose (350) - rotate 95deg */
        :root[data-accent="rose"] {
          --logo-hue-rotate: 95deg;
        }
      `}</style>
    </div>
  )
}

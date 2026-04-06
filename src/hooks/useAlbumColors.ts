import { useState, useEffect, useRef } from "react";
import Vibrant from "node-vibrant";

export interface AlbumColors {
  vibrant: string;
  darkVibrant: string;
  muted: string;
  darkMuted: string;
  lightVibrant: string;
}

const DEFAULT_COLORS: AlbumColors = {
  vibrant: "hsl(var(--h3))",
  darkVibrant: "hsl(var(--h4))",
  muted: "hsl(var(--b4))",
  darkMuted: "hsl(var(--b6))",
  lightVibrant: "hsl(var(--h2))",
};

// Cache extracted colors by URL to avoid re-extraction
const colorCache = new Map<string, AlbumColors>();

/**
 * Extract dominant colors from an album art image URL using node-vibrant.
 * Returns a palette of 5 colors that transition smoothly when the URL changes.
 */
export function useAlbumColors(imageUrl: string | null): {
  colors: AlbumColors;
  isLoading: boolean;
} {
  const [colors, setColors] = useState<AlbumColors>(DEFAULT_COLORS);
  const [isLoading, setIsLoading] = useState(false);
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!imageUrl || imageUrl === prevUrl.current) return;
    prevUrl.current = imageUrl;

    // Check cache first
    const cached = colorCache.get(imageUrl);
    if (cached) {
      setColors(cached);
      return;
    }

    setIsLoading(true);

    // Create a proxy image element for cross-origin access
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = async () => {
      try {
        const palette = await Vibrant.from(img).getPalette();

        const extracted: AlbumColors = {
          vibrant: palette.Vibrant?.hex || DEFAULT_COLORS.vibrant,
          darkVibrant: palette.DarkVibrant?.hex || DEFAULT_COLORS.darkVibrant,
          muted: palette.Muted?.hex || DEFAULT_COLORS.muted,
          darkMuted: palette.DarkMuted?.hex || DEFAULT_COLORS.darkMuted,
          lightVibrant:
            palette.LightVibrant?.hex || DEFAULT_COLORS.lightVibrant,
        };

        colorCache.set(imageUrl, extracted);
        setColors(extracted);
      } catch {
        // Extraction failed — keep current colors
      } finally {
        setIsLoading(false);
      }
    };

    img.onerror = () => {
      setIsLoading(false);
      // Try without crossOrigin for external CDNs that don't support CORS
      // In this case we can't extract colors, so keep defaults
    };

    img.src = imageUrl;
  }, [imageUrl]);

  return { colors, isLoading };
}

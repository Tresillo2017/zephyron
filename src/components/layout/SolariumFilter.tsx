/**
 * The refraction filter behind `backdrop-filter: ... url(#solarium)` (--solarium in themes.css).
 * Mount once near the app root. Chromium only; Firefox and Safari drop the url() via @supports.
 *
 * Pipeline: low-frequency noise (soft map) x a blurred edge mask of the surface shape, then used
 * to displace the backdrop, so glass bends what is behind it, most strongly near its edges.
 */
export function SolariumFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute', pointerEvents: 'none' }}>
      <filter id="solarium" x="0" y="0" width="100%" height="100%" filterUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="10" result="softMap" />

        <feFlood floodColor="white" result="flood" />
        <feComposite in="flood" in2="SourceAlpha" operator="in" result="shape" />
        <feMorphology in="shape" operator="erode" radius="0" result="eroded" />
        <feGaussianBlur in="eroded" stdDeviation="150" result="blurredShape" />
        <feComponentTransfer in="blurredShape" result="edgeMask">
          <feFuncR type="table" tableValues="0 1" />
          <feFuncG type="table" tableValues="0 1" />
          <feFuncB type="table" tableValues="0 1" />
        </feComponentTransfer>

        <feComposite in="softMap" in2="edgeMask" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="edgeDistortion" />
        <feDisplacementMap in="SourceGraphic" in2="edgeDistortion" scale="200" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

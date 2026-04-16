/**
 * Get the appropriate placeholder image based on the shape/aspect ratio
 * @param shape - 'circle' for circular elements, 'square' for square/rectangular elements
 * @returns The path to the placeholder image
 */
export function getPlaceholder(shape: 'circle' | 'square'): string {
  return shape === 'circle' ? '/placeholder1.png' : '/placeholder2.png'
}

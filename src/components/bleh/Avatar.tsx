import { useEffect, useRef } from 'react';
import { cn } from '../../lib/cn';
import { avatarInitial, avatarModel, type AvatarModel } from './avatarModel';

const CANVAS_PX = 128;
const MIN_INITIAL_PX = 24;
const INITIAL_RATIO = 0.46;
const oklch = (l: number, c: number, h: number, a = 1) => `oklch(${l} ${c} ${h} / ${a})`;

function paint(canvas: HTMLCanvasElement, { hue, base, blobs }: AvatarModel) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = canvas.height = CANVAS_PX;
  ctx.fillStyle = oklch(base.l, base.c, hue);
  ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);
  for (const b of blobs) {
    const g = ctx.createRadialGradient(b.x * CANVAS_PX, b.y * CANVAS_PX, 0, b.x * CANVAS_PX, b.y * CANVAS_PX, b.r * CANVAS_PX);
    g.addColorStop(0, oklch(b.l, b.c, b.hue));
    g.addColorStop(1, oklch(b.l, b.c, b.hue, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);
  }
  const sheen = ctx.createLinearGradient(0, 0, CANVAS_PX, CANVAS_PX);
  sheen.addColorStop(0, 'oklch(1 0 0 / 0.28)');
  sheen.addColorStop(0.55, 'oklch(1 0 0 / 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);
}

/**
 * Generated avatar for users and children: a soft oklch mesh seeded by id, with the
 * name's initial in the heading serif. An uploaded `image` replaces it. Follows the
 * avatar-shape setting. The canvas stays initial-free so AvatarSnapshot can reuse it for
 * the hero backdrop.
 */
export function Avatar({ seed, name, image, size, className }: { seed: string; name?: string; image?: string | null; size: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const model = avatarModel(seed);
  useEffect(() => {
    if (canvasRef.current) paint(canvasRef.current, avatarModel(seed));
  }, [seed, image]);

  const initial = !image && size >= MIN_INITIAL_PX ? avatarInitial(name) : '';
  return (
    <span
      className={cn('avatar-shape relative inline-flex shrink-0 items-center justify-center shadow-avatar-inset', className)}
      style={{ width: size, height: size, containerType: 'inline-size' }}
      aria-hidden="true"
    >
      {image
        ? <img src={image} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
        : <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />}
      {initial && (
        <span
          className="relative"
          style={{
            fontFamily: 'var(--font-head)',
            fontStyle: 'italic',
            fontSize: `${INITIAL_RATIO * 100}cqw`, // follows the rendered width, which a parent may override
            lineHeight: 1,
            color: oklch(0.24, 0.05, model.hue, 0.85),
          }}
        >
          {initial}
        </span>
      )}
    </span>
  );
}

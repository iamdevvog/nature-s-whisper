import { useEffect, useRef } from "react";

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; hue: number };

export function CustomCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let w = (canvas.width = window.innerWidth * devicePixelRatio);
    let h = (canvas.height = window.innerHeight * devicePixelRatio);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const onResize = () => {
      w = canvas.width = window.innerWidth * devicePixelRatio;
      h = canvas.height = window.innerHeight * devicePixelRatio;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    window.addEventListener("resize", onResize);

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let dx = mx;
    let dy = my;
    let rx = mx;
    let ry = my;
    let lastSpawn = 0;
    const particles: Particle[] = [];
    let hovering = false;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      const target = e.target as HTMLElement | null;
      hovering = !!target?.closest("a, button, input, textarea, [data-cursor='hover']");
    };
    const onClick = (e: MouseEvent) => {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const s = 1.5 + Math.random() * 2;
        particles.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 0,
          max: 60 + Math.random() * 40,
          hue: 90 + Math.random() * 60,
        });
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);

    let raf = 0;
    const loop = (t: number) => {
      // smooth dot
      dx += (mx - dx) * 0.35;
      dy += (my - dy) * 0.35;
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${dx - 6}px, ${dy - 6}px, 0)`;
      }
      if (ringRef.current) {
        const scale = hovering ? 1.8 : 1;
        ringRef.current.style.transform = `translate3d(${rx - 22}px, ${ry - 22}px, 0) scale(${scale})`;
        ringRef.current.style.opacity = hovering ? "0.9" : "0.55";
      }

      // spawn trail
      if (t - lastSpawn > 18) {
        lastSpawn = t;
        particles.push({
          x: mx + (Math.random() - 0.5) * 4,
          y: my + (Math.random() - 0.5) * 4,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -0.3 - Math.random() * 0.4,
          life: 0,
          max: 70 + Math.random() * 40,
          hue: 95 + Math.random() * 50,
        });
      }

      ctx.clearRect(0, 0, w, h);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.005;
        p.vx *= 0.99;
        const k = 1 - p.life / p.max;
        if (k <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${k * 0.7})`;
        ctx.shadowColor = `hsla(${p.hue}, 90%, 70%, ${k})`;
        ctx.shadowBlur = 12;
        ctx.arc(p.x, p.y, 2 + k * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[9998]"
        aria-hidden
      />
      <div
        ref={ringRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-11 w-11 rounded-full border border-primary/70 mix-blend-screen transition-[opacity] duration-200"
        style={{ boxShadow: "0 0 30px oklch(0.85 0.13 130 / 0.5)" }}
        aria-hidden
      />
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-3 w-3 rounded-full bg-primary"
        style={{ boxShadow: "0 0 18px oklch(0.85 0.13 130 / 0.9)" }}
        aria-hidden
      />
    </>
  );
}
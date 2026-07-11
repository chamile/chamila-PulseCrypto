import { useEffect, useState } from 'react';

let rafId: number | null = null;

export function useFps() {
  const [fps, setFps] = useState(60);

  useEffect(() => {
    let frames = 0;
    let last = Date.now();

    const loop = () => {
      frames++;
      const now = Date.now();
      if (now - last >= 1000) {
        const measured = Math.round((frames * 1000) / (now - last));
        setFps(Math.min(60, measured));
        frames = 0;
        last = now;
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, []);

  return fps;
}

import { useEffect, useMemo, useState } from 'react';

export function useAudioLevel(stream: MediaStream | null): number {
  const [level, setLevel] = useState(0);

  const audioTrack = useMemo(() => stream?.getAudioTracks?.()[0] ?? null, [stream]);

  useEffect(() => {
    if (!stream || !audioTrack) {
      setLevel(0);
      return;
    }

    let raf = 0;
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const sample = data[i] ?? 128;
        const v = (sample - 128) / 128;
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      setLevel(Math.min(1, Math.max(0, rms * 2.2)));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        // ignore
      }
      ctx.close().catch(() => {});
    };
  }, [stream, audioTrack]);

  return level;
}


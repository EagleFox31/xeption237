import { useEffect, useState } from 'react';
import { nextBackgroundRotationDelayMs } from '../constants/backgroundImages';

export const useRotatingBackground = (images: readonly string[]): string => {
  const poolKey = images.join('|');
  const [index, setIndex] = useState(() =>
    images.length > 0 ? Math.floor(Math.random() * images.length) : 0,
  );

  useEffect(() => {
    if (images.length > 0) {
      setIndex(Math.floor(Math.random() * images.length));
    }
  }, [poolKey, images.length]);

  useEffect(() => {
    if (images.length <= 1) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeoutId = setTimeout(() => {
        setIndex((i) => (i + 1) % images.length);
        schedule();
      }, nextBackgroundRotationDelayMs());
    };
    schedule();
    return () => clearTimeout(timeoutId);
  }, [poolKey, images.length]);

  return images[index] ?? images[0] ?? '';
};

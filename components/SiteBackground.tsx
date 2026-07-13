import React, { useEffect, useRef, useState } from 'react';
import { optimizeVideo } from '../utils/mediaOptimization';
import { useRotatingBackground } from '../hooks/useRotatingBackground';

interface SiteBackgroundProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoUrl: string;
  isVideoPaused: boolean;
  imagePool: readonly string[];
  /** Fond clair (pages légales, contact…) → pas d’overlay */
  variant?: 'dark' | 'light';
}

const SiteBackground: React.FC<SiteBackgroundProps> = ({
  videoRef,
  videoUrl,
  isVideoPaused,
  imagePool,
  variant = 'dark',
}) => {
  const poolKey = imagePool.join('|');
  const currentImage = useRotatingBackground(imagePool);
  const [frontImage, setFrontImage] = useState(currentImage);
  const [backImage, setBackImage] = useState(currentImage);
  const [fadeIn, setFadeIn] = useState(true);
  const isFirstImage = useRef(true);
  const lastPoolKey = useRef(poolKey);

  useEffect(() => {
    if (lastPoolKey.current !== poolKey) {
      lastPoolKey.current = poolKey;
      isFirstImage.current = true;
      setFrontImage(currentImage);
      setBackImage(currentImage);
      setFadeIn(true);
      return;
    }

    if (isFirstImage.current) {
      isFirstImage.current = false;
      return;
    }
    if (currentImage === frontImage) return;

    setBackImage(frontImage);
    setFrontImage(currentImage);
    setFadeIn(false);
    requestAnimationFrame(() => setFadeIn(true));
  }, [currentImage, frontImage, poolKey]);

  const isLight = variant === 'light';
  const imageLayerClass = `absolute inset-0 bg-cover bg-center bg-no-repeat${
    isLight ? ' site-light-bg-zoom' : ''
  }`;

  return (
    <div
      className="fixed inset-0 z-0 w-full h-full pointer-events-none overflow-hidden"
      style={
        isLight
          ? ({ '--site-light-bg-zoom-duration': '75s' } as React.CSSProperties)
          : undefined
      }
    >
      <div
        key={isLight ? backImage : undefined}
        className={imageLayerClass}
        style={{ backgroundImage: `url('${backImage}')` }}
        aria-hidden
      />
      <div
        key={isLight ? frontImage : undefined}
        className={`${imageLayerClass} transition-opacity duration-[2000ms] ease-in-out`}
        style={{
          backgroundImage: `url('${frontImage}')`,
          opacity: fadeIn ? 1 : 0,
        }}
        aria-hidden
      />

      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        poster={frontImage}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          isVideoPaused ? 'opacity-0' : 'opacity-90 md:opacity-100'
        }`}
      >
        <source src={optimizeVideo(videoUrl)} type="video/mp4" />
      </video>

      {variant === 'dark' && (
        <>
          <div className="absolute inset-0 bg-black/20" aria-hidden />
          <div
            className="absolute inset-0 bg-[linear-gradient(rgba(255,215,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,215,0,0.05)_1px,transparent_1px)] bg-[size:60px_60px] opacity-10"
            aria-hidden
          />
        </>
      )}
    </div>
  );
};

export default SiteBackground;

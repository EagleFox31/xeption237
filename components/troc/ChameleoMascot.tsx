import React, { useState, useEffect, useRef } from 'react';
import type { ChameleoState } from '../../utils/trocCoach';

export type { ChameleoState };

interface ChameleoMascotProps {
  state?: ChameleoState;
  message?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Bulle au-dessus du composant. Désactiver si le parent affiche déjà le texte. */
  showSpeechBubble?: boolean;
  /** Suivi du curseur (3D Tilt & regard vers la souris). */
  trackPointer?: boolean;
  /** Activer le mode danse rythmé gauche-droite. */
  isDancing?: boolean;
  /** Pose du personnage : waving (salut), pointing (pointe du doigt), shopping (sac boutique), inspector (loupe diagnostic) ou delivery (livreur colis). */
  pose?: 'waving' | 'pointing' | 'shopping' | 'inspector' | 'delivery';
  onClick?: () => void;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

/**
 * Composant Mascotte Officielle Xepti (La lettre 'X' 237) pour Xeption Smart Troc, Shop & Tracking.
 * - Poses multiples 3D : Salutation (waving), Pointage (pointing), Shopping (shopping), Inspecteur (inspector), Livreur (delivery)
 * - Double Sprite 3D : Bouche fermée & Bouche ouverte en haute définition (Lip-sync)
 * - Suivi du regard et 3D Tilt vers la souris en temps réel
 * - Danse et flottement avec rebond physique
 */
export const ChameleoMascot: React.FC<ChameleoMascotProps> = ({
  state = 'idle',
  message,
  className = '',
  size = 'md',
  showSpeechBubble = true,
  trackPointer = true,
  isDancing = true,
  pose = 'waving',
  onClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, scale: 1 });
  const [isJumping, setIsJumping] = useState(false);
  const [clickSparkles, setClickSparkles] = useState<Sparkle[]>([]);
  const [isOpenMouth, setIsOpenMouth] = useState(false);

  // Messages par défaut par état
  const defaultMessages: Record<ChameleoState, string> = {
    idle: pose === 'delivery'
      ? 'Ton colis est préparé et tracé en direct ! 📦🚀'
      : pose === 'shopping' 
        ? 'Trouve les meilleures pépites tech du 237 ! 🛍️✨' 
        : pose === 'pointing' 
          ? 'Sélectionne ton appareil juste en bas ! 👇' 
          : pose === 'inspector'
            ? 'Analyse IA & diagnostic en direct... 🧐🔍'
            : 'Salut ! Je suis Xepti. Ton ancien phone vaut de l’or !',
    thinking: 'Je regarde ce que tu m’as donné... 🧐',
    scanning: 'Scan IA & vérification en cours... ✨',
    happy: 'Waoooh ! Offre calculée au top ! 🎉⚡',
    warning: 'Attention, cet appareil nécessite une vérification.',
  };

  const activeMessage = message || defaultMessages[state];

  // 1. Animation de Parole (Alterne bouche ouverte/fermée naturellement pendant 3.5s quand le message s'affiche)
  useEffect(() => {
    if (!showSpeechBubble || !activeMessage || pose === 'pointing') {
      setIsOpenMouth(false);
      return;
    }

    let count = 0;
    const maxToggles = 12; // ~3.5 secondes de parole rythmée

    const interval = setInterval(() => {
      setIsOpenMouth(prev => !prev);
      count++;
      if (count >= maxToggles) {
        clearInterval(interval);
        setIsOpenMouth(false);
      }
    }, 280);

    return () => clearInterval(interval);
  }, [showSpeechBubble, activeMessage, state, pose]);

  // 2. Suivi 3D de la souris (Regard et inclinaison vers le curseur en temps réel)
  useEffect(() => {
    if (!trackPointer) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calcul de l'angle vers la souris (regard et inclinaison)
      const deltaX = (e.clientX - centerX) / (window.innerWidth / 2);
      const deltaY = (e.clientY - centerY) / (window.innerHeight / 2);

      const rotateY = Math.max(Math.min(deltaX * 16, 16), -16);
      const rotateX = Math.max(Math.min(-deltaY * 16, 16), -16);

      setTilt({ rotateX, rotateY, scale: 1.02 });
    };

    const handleMouseLeave = () => {
      setTilt({ rotateX: 0, rotateY: 0, scale: 1 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [trackPointer]);

  // 3. Réaction au Clic (Super Rebond + Explosion d'étoiles)
  const handleClick = () => {
    setIsJumping(true);
    setIsOpenMouth(true);

    const newSparkles: Sparkle[] = Array.from({ length: 8 }).map((_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 90,
      y: (Math.random() - 0.5) * 90 - 25,
      size: Math.random() * 10 + 8,
      delay: i * 40
    }));
    setClickSparkles(newSparkles);

    setTimeout(() => {
      setIsJumping(false);
      setIsOpenMouth(false);
    }, 650);
    setTimeout(() => setClickSparkles([]), 1000);

    if (onClick) onClick();
  };

  // Dimensions selon taille
  const sizeClasses = {
    xs: 'w-16 h-16',
    sm: 'w-24 h-24',
    md: 'w-44 h-44',
    lg: 'w-64 h-64'
  }[size];

  // Image courante selon la pose et l'état de parole
  let currentImage = '/mascot/xepti_transparent.png';
  if (pose === 'delivery') {
    currentImage = '/mascot/xepti_delivery_transparent.png';
  } else if (pose === 'inspector') {
    currentImage = '/mascot/xepti_inspector_transparent.png';
  } else if (pose === 'shopping') {
    currentImage = '/mascot/xepti_shopping_transparent.png';
  } else if (pose === 'pointing') {
    currentImage = '/mascot/xepti_pointing_transparent.png';
  } else if (isOpenMouth) {
    currentImage = '/mascot/xepti_open_transparent.png';
  }

  // Animation selon la pose
  const danceSpeed = state === 'happy' ? '1.4s' : '2.4s';
  const animationStyle = pose === 'delivery'
    ? 'deliveryFly 2.2s ease-in-out infinite'
    : pose === 'inspector'
      ? 'inspectorScan 2.6s ease-in-out infinite'
      : pose === 'shopping'
        ? 'shoppingFloat 3.2s ease-in-out infinite'
        : pose === 'pointing'
          ? 'pointDown 3s ease-in-out infinite'
          : isDancing && !isJumping
            ? `dance ${danceSpeed} ease-in-out infinite`
            : undefined;

  return (
    <div 
      ref={containerRef}
      className={`relative inline-flex flex-col items-center select-none [perspective:800px] ${className}`}
    >
      {/* Bulle de Dialogue Réactive */}
      {showSpeechBubble && activeMessage && (
        <div className="mb-3 max-w-xs px-4 py-2 bg-black/90 border border-xeption-gold/50 text-white rounded-2xl shadow-[0_0_20px_rgba(255,215,0,0.25)] text-xs font-tech tracking-wide text-center relative animate-fade-in backdrop-blur-xl z-20 transition-transform duration-300">
          <span className="text-gray-100">{activeMessage}</span>
          {/* Flèche bulle */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-black/90" />
        </div>
      )}

      {/* Conteneur Pivot 3D vers la souris */}
      <div 
        onClick={handleClick}
        className={`relative cursor-pointer ${sizeClasses} ${
          isJumping ? 'animate-[jump_0.65s_ease-out]' : ''
        }`}
        style={{
          transform: isJumping 
            ? undefined 
            : `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${tilt.scale})`,
          transition: isJumping ? 'none' : 'transform 0.15s ease-out'
        }}
      >
        {/* Halo doré lumineux réactif */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-xeption-gold/30 to-amber-500/20 blur-2xl animate-pulse pointer-events-none" />

        {/* Mascotte Xepti (Waving ou Pointing avec animation fluide) */}
        <div 
          className="w-full h-full"
          style={{
            animation: animationStyle
          }}
        >
          <img
            src={currentImage}
            alt="Xepti - Mascotte Xeption"
            className="w-full h-full object-contain drop-shadow-[0_15px_30px_rgba(255,215,0,0.25)] pointer-events-auto transition-opacity duration-75"
            loading="eager"
          />
        </div>

        {/* Particules d'étoiles dorées au clic */}
        {clickSparkles.map((s) => (
          <span
            key={s.id}
            className="absolute left-1/2 top-1/2 pointer-events-none animate-ping text-xeption-gold font-bold select-none"
            style={{
              transform: `translate(${s.x}px, ${s.y}px)`,
              fontSize: `${s.size}px`,
              animationDuration: '0.8s'
            }}
          >
            ✨
          </span>
        ))}
      </div>

      {/* Style CSS pour les animations */}
      <style>{`
        @keyframes dance {
          0% {
            transform: translateX(0px) translateY(0px) rotate(0deg) scale(1);
          }
          25% {
            transform: translateX(-12px) translateY(-6px) rotate(-6deg) scale(1.03, 0.97);
          }
          50% {
            transform: translateX(0px) translateY(-1px) rotate(0deg) scale(0.98, 1.02);
          }
          75% {
            transform: translateX(12px) translateY(-6px) rotate(6deg) scale(1.03, 0.97);
          }
          100% {
            transform: translateX(0px) translateY(0px) rotate(0deg) scale(1);
          }
        }
        @keyframes deliveryFly {
          0%, 100% {
            transform: translateY(0px) rotate(0deg) scale(1);
          }
          25% {
            transform: translateY(-8px) rotate(-3deg) scale(1.03);
          }
          50% {
            transform: translateY(-2px) rotate(1deg) scale(0.99);
          }
          75% {
            transform: translateY(-10px) rotate(3deg) scale(1.04);
          }
        }
        @keyframes inspectorScan {
          0%, 100% {
            transform: translateY(0px) rotate(0deg) scale(1);
          }
          30% {
            transform: translateY(-4px) rotate(3deg) scale(1.03);
          }
          70% {
            transform: translateY(-2px) rotate(-3deg) scale(1.02);
          }
        }
        @keyframes shoppingFloat {
          0%, 100% {
            transform: translateY(0px) rotate(-2deg);
          }
          50% {
            transform: translateY(-9px) rotate(2deg) scale(1.02);
          }
        }
        @keyframes pointDown {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(8px) rotate(2deg);
          }
        }
        @keyframes jump {
          0%   { transform: scale(1, 1) translateY(0); }
          20%  { transform: scale(1.18, 0.82) translateY(0); }
          50%  { transform: scale(0.88, 1.12) translateY(-28px); }
          75%  { transform: scale(1.06, 0.94) translateY(0); }
          100% { transform: scale(1, 1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ChameleoMascot;

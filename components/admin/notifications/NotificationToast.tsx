
import React, { useEffect } from 'react';
import { X, Bell, ShoppingBag, Wrench, AlertCircle } from 'lucide-react';
import { AdminNotification } from '../../../types';

interface NotificationToastProps {
  notification: AdminNotification | null;
  onClose: () => void;
  onClick: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose, onClick }) => {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        onClose();
      }, 6000); // Disparait après 6 secondes
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const getIcon = () => {
      switch(notification.type) {
          case 'order': return <ShoppingBag className="w-6 h-6 text-xeption-gold" />;
          case 'ticket': return <Wrench className="w-6 h-6 text-blue-400" />;
          default: return <AlertCircle className="w-6 h-6 text-red-500" />;
      }
  };

  return (
    <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-right-10 fade-in duration-300">
      <div className="bg-black/90 backdrop-blur-xl border border-white/20 p-4 rounded-lg shadow-2xl w-80 relative overflow-hidden group cursor-pointer" onClick={onClick}>
         {/* Glow Effect */}
         <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-[40px] opacity-20 ${
             notification.type === 'order' ? 'bg-xeption-gold' : notification.type === 'ticket' ? 'bg-blue-500' : 'bg-red-500'
         }`}></div>

         <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute top-2 right-2 text-gray-500 hover:text-white transition-colors p-1"
         >
             <X className="w-3 h-3" />
         </button>

         <div className="flex items-start gap-4 relative z-10">
             <div className={`p-2 rounded-full border border-white/10 ${
                 notification.type === 'order' ? 'bg-xeption-gold/10' : notification.type === 'ticket' ? 'bg-blue-500/10' : 'bg-red-500/10'
             }`}>
                 {getIcon()}
             </div>
             <div>
                 <h4 className="text-white font-bold font-tech uppercase text-sm mb-1">{notification.title}</h4>
                 <p className="text-gray-300 text-xs leading-relaxed line-clamp-2">{notification.message}</p>
                 <span className="text-[10px] text-gray-500 mt-2 block font-mono">À l'instant</span>
             </div>
         </div>
         
         <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${
             notification.type === 'order' ? 'from-xeption-gold to-transparent' : notification.type === 'ticket' ? 'from-blue-500 to-transparent' : 'from-red-500 to-transparent'
         } w-full transition-all duration-[6000ms] ease-linear origin-left scale-x-0 animate-[progress_6s_linear_forwards]`}></div>
      </div>
      <style>{`
        @keyframes progress {
            from { transform: scaleX(1); }
            to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
};

export default NotificationToast;

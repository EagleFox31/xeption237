
import React from 'react';
import { X, ShoppingBag, Wrench, AlertCircle, Bell, Trash2 } from 'lucide-react';
import { AdminNotification } from '../../../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AdminNotification[];
  onClearAll: () => void;
  onNotificationClick: (n: AdminNotification) => void;
}

const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose, notifications, onClearAll, onNotificationClick }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}></div>

      {/* Drawer */}
      <div className="relative w-full max-w-sm bg-[#09090b] border-l border-white/10 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
           <div className="flex items-center gap-2">
               <Bell className="w-5 h-5 text-xeption-gold" />
               <h3 className="text-white font-bold font-tech uppercase tracking-wide">Notifications</h3>
               <span className="bg-white/10 text-xs font-bold px-2 py-0.5 rounded text-white">{notifications.length}</span>
           </div>
           <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
               <X className="w-5 h-5" />
           </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <Bell className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">Aucune notification.</p>
                    <p className="text-xs">C'est calme... trop calme.</p>
                </div>
            ) : (
                notifications.map((notif) => (
                    <div 
                        key={notif.id}
                        onClick={() => onNotificationClick(notif)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all hover:translate-x-1 ${
                            notif.read 
                            ? 'bg-transparent border-white/5 text-gray-500' 
                            : 'bg-white/5 border-white/20 text-white'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                             <div className={`mt-1 ${
                                 notif.type === 'order' ? 'text-xeption-gold' : notif.type === 'ticket' ? 'text-blue-400' : 'text-red-500'
                             }`}>
                                 {notif.type === 'order' && <ShoppingBag className="w-4 h-4" />}
                                 {notif.type === 'ticket' && <Wrench className="w-4 h-4" />}
                                 {notif.type === 'alert' && <AlertCircle className="w-4 h-4" />}
                             </div>
                             <div className="flex-1">
                                 <h4 className={`text-sm font-bold uppercase mb-1 ${notif.read ? 'text-gray-500' : 'text-white'}`}>{notif.title}</h4>
                                 <p className="text-xs leading-relaxed mb-2 opacity-80">{notif.message}</p>
                                 <span className="text-[10px] font-mono opacity-50 block text-right">
                                     {notif.timestamp.toLocaleTimeString()}
                                 </span>
                             </div>
                             {!notif.read && <div className="w-2 h-2 rounded-full bg-xeption-gold mt-2"></div>}
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
            <div className="p-4 border-t border-white/10 bg-black/40">
                <button 
                    onClick={onClearAll}
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold uppercase text-red-500 hover:text-white hover:bg-red-500/10 py-3 rounded transition-colors"
                >
                    <Trash2 className="w-4 h-4" /> Tout effacer
                </button>
            </div>
        )}

      </div>
    </div>
  );
};

export default NotificationDrawer;

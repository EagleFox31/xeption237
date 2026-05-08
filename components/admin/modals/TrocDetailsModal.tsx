import React from 'react';
import { X, Download, Camera } from 'lucide-react';
import type { TradeInRequest } from '../../../types';
import { downloadTradeInVoucher } from '../../../utils/tradeInVoucherGenerator';

interface TrocDetailsModalProps {
  request: TradeInRequest;
  onClose: () => void;
}

const SCORE_COLOR_CLASSES: Record<string, string> = {
  green:  'bg-green-500/20 text-green-400 border-green-500/30',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  red:    'bg-red-500/20 text-red-400 border-red-500/30',
};

const formatFCFA = (amount?: number) =>
  amount != null ? new Intl.NumberFormat('fr-FR').format(amount).replace(/\s/g, '.') + ' F' : '—';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const TrocDetailsModal: React.FC<TrocDetailsModalProps> = ({ request, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0c0c0e] border border-white/10 rounded-sm w-full max-w-4xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-xl font-bold font-tech text-white uppercase tracking-widest flex items-center gap-3">
              Dossier Troc {request.voucher_reference ?? request.id.slice(0, 8)}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                request.status === 'pending'   ? 'bg-yellow-500/20 text-yellow-400' :
                request.status === 'accepted'  ? 'bg-blue-500/20 text-blue-400' :
                request.status === 'validated' ? 'bg-green-500/20 text-green-400' :
                request.status === 'completed' ? 'bg-gray-500/20 text-gray-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {request.status}
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-1 font-sans">Créé le {formatDate(request.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
          
          {/* Colonne de gauche : Infos */}
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Client & Appareil */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 p-4 rounded-sm">
                <p className="text-[10px] font-tech text-gray-500 uppercase tracking-widest mb-1">Client</p>
                <p className="text-sm text-white font-bold">{request.customer_name}</p>
                <p className="text-xs text-gray-400">{request.customer_phone}</p>
                {request.customer_email && <p className="text-xs text-gray-400">{request.customer_email}</p>}
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-sm">
                <p className="text-[10px] font-tech text-gray-500 uppercase tracking-widest mb-1">Appareil Déclaré</p>
                <p className="text-sm text-white font-bold">{request.device_brand} {request.device_model}</p>
                <p className="text-xs text-gray-400">
                  {request.device_storage && `${request.device_storage} `}
                  {request.device_ram && `/ ${request.device_ram} RAM`}
                </p>
                {request.imei && <p className="text-[10px] font-mono text-gray-500 mt-1">IMEI: {request.imei}</p>}
              </div>
            </div>

            {/* Analyse IA */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[10px] font-tech text-xeption-gold uppercase tracking-widest">Analyse IA (Gemini Vision)</p>
                {request.ai_score != null && (
                  <span className={`px-3 py-1 border rounded-full text-sm font-bold font-tech ${SCORE_COLOR_CLASSES[request.ai_score_color ?? 'red']}`}>
                    {request.ai_score} / 100
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-300 font-sans leading-relaxed">
                {request.ai_justification || <span className="text-gray-600 italic">Aucune justification IA disponible.</span>}
              </p>
            </div>

            {/* Décision et Valeur */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 p-4 rounded-sm text-center flex flex-col items-center justify-center">
                <p className="text-[10px] font-tech text-gray-500 uppercase tracking-widest mb-1">Grade Final</p>
                <p className="text-lg text-white font-bold capitalize">{request.trade_in_grade || '—'}</p>
              </div>
              <div className="bg-xeption-gold/10 border border-xeption-gold/20 p-4 rounded-sm text-center flex flex-col items-center justify-center">
                <p className="text-[10px] font-tech text-xeption-gold/70 uppercase tracking-widest mb-1">Valeur Estimée</p>
                <p className="text-2xl font-tech text-xeption-gold font-bold">{formatFCFA(request.trade_in_value)}</p>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => downloadTradeInVoucher(request)}
                disabled={!request.trade_in_value}
                className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-tech font-bold uppercase tracking-widest py-3 text-xs rounded-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Voir le bon PDF
              </button>
            </div>

          </div>

          {/* Colonne de droite : Photos */}
          <div className="flex-1 flex flex-col gap-4">
            <h4 className="text-[10px] font-tech text-gray-500 uppercase tracking-widest border-b border-white/10 pb-2">
              Photos transmises ({request.photo_urls?.length || 0})
            </h4>
            
            {request.photo_urls && request.photo_urls.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {request.photo_urls.map((url, i) => (
                  <a 
                    key={i} 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block aspect-[3/4] bg-black/50 border border-white/5 rounded-sm overflow-hidden hover:border-xeption-gold/50 transition-colors group relative"
                  >
                    <img 
                      src={url} 
                      alt={`Photo ${i+1}`} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                      <span className="bg-black/80 text-white px-3 py-1 rounded text-[10px] font-tech uppercase tracking-widest">
                        Agrandir
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex-1 min-h-[200px] border border-dashed border-white/10 rounded-sm flex flex-col items-center justify-center text-gray-500 gap-2">
                <Camera className="w-8 h-8 opacity-50" />
                <p className="text-xs font-tech uppercase tracking-widest">Aucune photo</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

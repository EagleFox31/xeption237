
import React from 'react';
import { Film, Loader2 } from 'lucide-react';

interface MarketingTabProps {
  videoPrompt: string;
  setVideoPrompt: (val: string) => void;
  generatingVideo: boolean;
  generatedVideoUrl: string | null;
  onGenerateVideo: () => void;
}

const MarketingTab: React.FC<MarketingTabProps> = ({ videoPrompt, setVideoPrompt, generatingVideo, generatedVideoUrl, onGenerateVideo }) => {
  return (
     <div className="animate-in fade-in">
        <h2 className="text-3xl font-tech font-bold uppercase text-white mb-6">Marketing Studio</h2>
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm">
            <textarea 
                value={videoPrompt} 
                onChange={e => setVideoPrompt(e.target.value)} 
                className="w-full bg-black/50 border border-white/10 p-4 text-white rounded-sm h-32 mb-4" 
                placeholder="Prompt vidéo..." 
            />
            <button 
                onClick={onGenerateVideo} 
                disabled={generatingVideo} 
                className="bg-xeption-gold text-black px-6 py-2 font-bold uppercase rounded-sm flex items-center gap-2"
            >
                {generatingVideo ? <Loader2 className="w-4 h-4 animate-spin"/> : <Film className="w-4 h-4"/>} Générer
            </button>
            {generatedVideoUrl && (
                <div className="mt-4">
                    <video src={generatedVideoUrl} controls className="w-full rounded border border-white/10" />
                </div>
            )}
        </div>
     </div>
  );
};

export default MarketingTab;

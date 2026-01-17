
import React, { useState, useEffect } from 'react';
import { RefreshCw, Smartphone, Laptop, Check, X, ArrowRight, AlertTriangle, ChevronRight, RotateCcw, Loader2, HelpCircle, MessageCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { TradeInModel } from '../types';

interface TrocSectionProps {
  onNavigate?: (page: string) => void;
}

// --- LOGIQUE METIER (Grille Yaoundé) ---
type Grade = 'A' | 'B' | 'C' | 'D' | 'X';

interface GradeInfo {
    label: string;
    desc: string;
    minPercent: number;
    maxPercent: number;
    color: string;
}

const GRADES: Record<Grade, GradeInfo> = {
    'A': { label: 'Grade A (Premium)', desc: 'Téléphone quasi neuf. Écran intact, aucune rayure, batterie top.', minPercent: 0.80, maxPercent: 0.90, color: 'text-green-400' },
    'B': { label: 'Grade B (Bon État)', desc: 'Propre. Micro-rayures invisibles écran allumé.', minPercent: 0.65, maxPercent: 0.75, color: 'text-xeption-gold' },
    'C': { label: 'Grade C (État Moyen)', desc: 'Rayures visibles ou petits chocs. Fonctionnel mais fatigué.', minPercent: 0.45, maxPercent: 0.60, color: 'text-orange-400' },
    'D': { label: 'Grade D (À Réparer)', desc: 'Écran fissuré, batterie HS, ou bugs. Pour pièces/réparation.', minPercent: 0.20, maxPercent: 0.40, color: 'text-red-500' },
    'X': { label: 'Hors Cote', desc: 'Invendable (Bloqué iCloud, HS, Carte mère, volé).', minPercent: 0, maxPercent: 0, color: 'text-gray-500' }
};

const TrocSection: React.FC<TrocSectionProps> = ({ onNavigate }) => {
  const [mode, setMode] = useState<'intro' | 'simulator'>('intro');
  const [isLoadingDB, setIsLoadingDB] = useState(false);
  
  // Data
  const [dbModels, setDbModels] = useState<TradeInModel[]>([]);
  const [category, setCategory] = useState<'phone' | 'laptop' | null>(null);
  const [selectedModel, setSelectedModel] = useState<TradeInModel | null>(null);
  const [isOtherModel, setIsOtherModel] = useState(false); // New: Handle "Other" selection
  
  const [step, setStep] = useState(0); // 0: Model, 1: Questions, 2: Result
  
  // Questionnaire State
  const [answers, setAnswers] = useState({
      screenBroken: false, // D
      buttonsOrCamIssue: false, // D
      bodyCondition: 'perfect', // perfect(A), micro(B), visible(C), heavy(D/C)
      batteryHealth: 'good', // good(A), average(B), bad(C/D)
      icloudLocked: false // X
  });

  // Fetch Database on mount (or when simulator opens)
  useEffect(() => {
      const fetchModels = async () => {
          setIsLoadingDB(true);
          const { data, error } = await supabase.from('trade_in_models').select('*');
          if (!error && data) {
              // Mapping snake_case -> camelCase if needed, but here structure matches
              setDbModels(data as TradeInModel[]);
          }
          setIsLoadingDB(false);
      };
      fetchModels();
  }, []);

  const resetSimulator = () => {
      setMode('intro');
      setStep(0);
      setCategory(null);
      setSelectedModel(null);
      setIsOtherModel(false);
      setAnswers({ screenBroken: false, buttonsOrCamIssue: false, bodyCondition: 'perfect', batteryHealth: 'good', icloudLocked: false });
  };

  const calculateGrade = (): Grade => {
      if (answers.icloudLocked) return 'X';
      
      // --- LOGIQUE ENTONNOIR (Le pire défaut l'emporte) ---

      // 1. Grade D : Gros problèmes
      if (answers.screenBroken) return 'D'; // Écran cassé = D direct
      if (answers.buttonsOrCamIssue) return 'D'; // Défaut fonctionnel majeur = D

      // 2. Grade C : Esthétique visible ou batterie faible
      if (answers.bodyCondition === 'visible' || answers.bodyCondition === 'heavy') return 'C';
      if (answers.batteryHealth === 'bad') return 'C'; // Batterie HS sur un tel propre = C (ou D selon coût, on met C généreux)

      // 3. Grade B : Micro défauts
      if (answers.bodyCondition === 'micro' || answers.batteryHealth === 'average') return 'B';

      // 4. Grade A : Tout est parfait
      return 'A';
  };

  const currentGrade = calculateGrade();
  const basePrice = selectedModel?.base_price || 0;
  
  // Calcul final arrondi à 5000 près pour faire propre
  const roundPrice = (price: number) => Math.round(price / 5000) * 5000;
  const minPrice = roundPrice(basePrice * GRADES[currentGrade].minPercent);
  const maxPrice = roundPrice(basePrice * GRADES[currentGrade].maxPercent);

  const renderSimulator = () => {
      return (
          <div className="w-full h-full flex flex-col animate-in fade-in slide-in-from-right-10">
              
              {/* Header Simulateur */}
              <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                  <div>
                      <h3 className="text-2xl font-bold font-tech text-white uppercase flex items-center gap-2">
                         <RefreshCw className="w-5 h-5 text-xeption-gold animate-spin-slow" /> Simulateur Troc
                      </h3>
                      <p className="text-xs text-gray-400">Cotation temps réel (Argus Xeption)</p>
                  </div>
                  <button onClick={resetSimulator} className="text-xs text-gray-500 hover:text-white uppercase font-bold flex items-center gap-1">
                      <X className="w-4 h-4" /> Fermer
                  </button>
              </div>

              {/* STEP 0: CHOIX CATEGORIE */}
              {!category && (
                  <div className="flex-1 flex flex-col justify-center gap-4">
                      <p className="text-center text-gray-300 mb-4">Qu'est-ce que tu veux échanger ?</p>
                      <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => setCategory('phone')} className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-xeption-gold p-6 rounded-lg flex flex-col items-center gap-3 transition-all group">
                              <Smartphone className="w-12 h-12 text-gray-400 group-hover:text-xeption-gold transition-colors" />
                              <span className="font-bold uppercase text-sm">Smartphone</span>
                          </button>
                          <button onClick={() => setCategory('laptop')} className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-xeption-gold p-6 rounded-lg flex flex-col items-center gap-3 transition-all group">
                              <Laptop className="w-12 h-12 text-gray-400 group-hover:text-xeption-gold transition-colors" />
                              <span className="font-bold uppercase text-sm">Ordinateur</span>
                          </button>
                      </div>
                  </div>
              )}

              {/* STEP 1: CHOIX MODELE (DB) */}
              {category && step === 0 && (
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                      <p className="text-gray-300 mb-4">Sélectionne ton modèle :</p>
                      
                      {isLoadingDB ? (
                          <div className="flex items-center justify-center h-40">
                              <Loader2 className="w-8 h-8 text-xeption-gold animate-spin" />
                          </div>
                      ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-2 custom-scrollbar pb-4 max-h-[400px]">
                              {dbModels.filter(m => m.category === category).length === 0 ? (
                                  <div className="col-span-3 text-center text-gray-500 py-10">Aucun modèle trouvé dans la base pour le moment.</div>
                              ) : (
                                  dbModels
                                    .filter(m => m.category === category)
                                    .sort((a,b) => b.base_price - a.base_price) // Les plus chers d'abord
                                    .map(m => (
                                      <button 
                                        key={m.id} 
                                        onClick={() => { setSelectedModel(m); setStep(1); }}
                                        className="text-left p-3 rounded bg-white/5 hover:bg-xeption-gold hover:text-black border border-white/10 group transition-all"
                                      >
                                          <span className="text-[10px] text-gray-500 group-hover:text-black/60 uppercase block font-bold">{m.brand}</span>
                                          <span className="text-sm font-bold">{m.model_name}</span>
                                      </button>
                                  ))
                              )}
                              
                              {/* BOUTON "AUTRE" */}
                              <button 
                                onClick={() => { setIsOtherModel(true); setStep(2); }}
                                className="col-span-2 sm:col-span-3 mt-2 p-3 border border-dashed border-white/20 rounded text-center text-gray-400 hover:text-white hover:border-white transition-all text-xs font-bold uppercase flex items-center justify-center gap-2"
                              >
                                  <HelpCircle className="w-4 h-4" /> Mon modèle n'est pas listé
                              </button>
                          </div>
                      )}
                      
                      <button onClick={() => setCategory(null)} className="mt-4 text-gray-500 text-xs hover:text-white flex items-center gap-1">← Retour</button>
                  </div>
              )}

              {/* STEP 2: QUESTIONS (CRITÈRES STRICTS) */}
              {category && step === 1 && selectedModel && (
                  <div className="flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-4 text-xeption-gold text-sm font-bold uppercase">
                          <span>{selectedModel.model_name}</span> <span className="text-gray-600">/</span> <span>État</span>
                      </div>
                      
                      <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                          
                          {/* Q1: iCloud */}
                          <div className="bg-black/30 p-3 rounded border border-white/5">
                              <label className="text-xs text-gray-400 uppercase font-bold block mb-2">
                                  {category === 'phone' ? 'Compte iCloud / Google bloqué ?' : 'Compte Admin / BIOS bloqué ?'}
                              </label>
                              <div className="flex gap-2">
                                  <button onClick={() => setAnswers({...answers, icloudLocked: false})} className={`flex-1 py-2 text-xs font-bold rounded transition-all ${!answers.icloudLocked ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-500'}`}>Non (Clean)</button>
                                  <button onClick={() => setAnswers({...answers, icloudLocked: true})} className={`flex-1 py-2 text-xs font-bold rounded transition-all ${answers.icloudLocked ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-500'}`}>Oui (Bloqué)</button>
                              </div>
                          </div>

                          {/* Q2: Écran */}
                          <div className="bg-black/30 p-3 rounded border border-white/5">
                              <label className="text-xs text-gray-400 uppercase font-bold block mb-2">L'écran est-il cassé ou fissuré ?</label>
                              <div className="flex gap-2">
                                  <button onClick={() => setAnswers({...answers, screenBroken: false})} className={`flex-1 py-2 text-xs font-bold rounded transition-all ${!answers.screenBroken ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-500'}`}>Intact (Pas de fissure)</button>
                                  <button onClick={() => setAnswers({...answers, screenBroken: true})} className={`flex-1 py-2 text-xs font-bold rounded transition-all ${answers.screenBroken ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-500'}`}>Cassé / Fissuré</button>
                              </div>
                          </div>

                          {/* Q3: Défauts Fonctionnels */}
                          <div className="bg-black/30 p-3 rounded border border-white/5">
                              <label className="text-xs text-gray-400 uppercase font-bold block mb-2">Tout fonctionne (Caméra, Boutons, FaceID, Wifi) ?</label>
                              <div className="flex gap-2">
                                  <button onClick={() => setAnswers({...answers, buttonsOrCamIssue: false})} className={`flex-1 py-2 text-xs font-bold rounded transition-all ${!answers.buttonsOrCamIssue ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-500'}`}>Oui, tout marche</button>
                                  <button onClick={() => setAnswers({...answers, buttonsOrCamIssue: true})} className={`flex-1 py-2 text-xs font-bold rounded transition-all ${answers.buttonsOrCamIssue ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-500'}`}>Non, il y a une panne</button>
                              </div>
                          </div>

                          {/* Q4: Esthétique */}
                          <div className="bg-black/30 p-3 rounded border border-white/5">
                              <label className="text-xs text-gray-400 uppercase font-bold block mb-2">État esthétique (Coque, rayures)</label>
                              <select 
                                value={answers.bodyCondition} 
                                onChange={(e) => setAnswers({...answers, bodyCondition: e.target.value})}
                                className="w-full bg-black border border-white/20 text-white text-sm p-2 rounded outline-none focus:border-xeption-gold"
                              >
                                  <option value="perfect">Comme neuf (Grade A)</option>
                                  <option value="micro">Micro-rayures invisibles allumé (Grade B)</option>
                                  <option value="visible">Rayures visibles / Petits chocs (Grade C)</option>
                                  <option value="heavy">Gros chocs / Tordu (Grade D)</option>
                              </select>
                          </div>

                          {/* Q5: Batterie */}
                          <div className="bg-black/30 p-3 rounded border border-white/5">
                              <label className="text-xs text-gray-400 uppercase font-bold block mb-2">Autonomie Batterie</label>
                              <div className="flex gap-2">
                                  <button onClick={() => setAnswers({...answers, batteryHealth: 'good'})} className={`flex-1 py-2 text-[10px] font-bold rounded transition-all ${answers.batteryHealth === 'good' ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-500'}`}>Top (Tient la journée)</button>
                                  <button onClick={() => setAnswers({...answers, batteryHealth: 'average'})} className={`flex-1 py-2 text-[10px] font-bold rounded transition-all ${answers.batteryHealth === 'average' ? 'bg-yellow-600 text-white' : 'bg-white/10 text-gray-500'}`}>Moyenne</button>
                                  <button onClick={() => setAnswers({...answers, batteryHealth: 'bad'})} className={`flex-1 py-2 text-[10px] font-bold rounded transition-all ${answers.batteryHealth === 'bad' ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-500'}`}>Faible / HS</button>
                              </div>
                          </div>

                      </div>

                      <div className="mt-4 flex gap-3 pt-4 border-t border-white/10">
                           <button onClick={() => setStep(0)} className="px-4 py-3 border border-white/10 rounded hover:bg-white/5 text-gray-400 text-xs font-bold uppercase">Retour</button>
                           <button onClick={() => setStep(2)} className="flex-1 bg-xeption-gold text-black font-bold uppercase py-3 rounded shadow-lg hover:bg-white transition-all">Calculer l'offre</button>
                      </div>
                  </div>
              )}

              {/* STEP 3: RESULTAT */}
              {category && step === 2 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
                      
                      {/* CAS 1 : MODÈLE NON LISTÉ (AUTRE) */}
                      {isOtherModel ? (
                          <div className="w-full">
                              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
                                  <HelpCircle className="w-10 h-10 text-blue-500" />
                              </div>
                              <h3 className="text-xl font-bold text-white uppercase font-tech mb-2">Modèle Hors Catalogue</h3>
                              <p className="text-gray-300 text-sm mb-6 px-4 leading-relaxed">
                                  Pas de panique ! Ton appareil a surement de la valeur.<br/>
                                  Contacte directement un expert Xeption pour une estimation manuelle.
                              </p>
                              
                              <a 
                                href={`https://wa.me/237699000000?text=Hello Xeption, je ne trouve pas mon appareil dans le simulateur. C'est un...`}
                                target="_blank"
                                rel="noreferrer"
                                className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase py-4 rounded shadow-lg transition-all flex items-center justify-center gap-2 mb-4"
                              >
                                  <MessageCircle className="w-5 h-5" /> Contacter sur WhatsApp
                              </a>
                              
                              <button onClick={resetSimulator} className="text-xs text-gray-500 hover:text-white border-b border-white/20 pb-1">Retour au début</button>
                          </div>
                      ) : selectedModel ? (
                          /* CAS 2 : MODÈLE TROUVÉ */
                          currentGrade === 'X' ? (
                              <div className="bg-red-900/20 border border-red-500/30 p-6 rounded-lg w-full">
                                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                  <h3 className="text-xl font-bold text-white uppercase font-tech">Non Repris</h3>
                                  <p className="text-gray-400 text-sm mt-2">{GRADES['X'].desc}</p>
                                  <button onClick={resetSimulator} className="mt-6 text-xs font-bold uppercase text-white border-b border-white pb-1">Recommencer</button>
                              </div>
                          ) : (
                              <div className="w-full">
                                  <div className="w-20 h-20 rounded-full border-4 border-xeption-gold flex items-center justify-center mx-auto mb-4 bg-xeption-gold/10 relative">
                                      <span className="text-4xl font-bold text-white font-tech">{currentGrade}</span>
                                      <div className="absolute -bottom-2 bg-black px-2 text-[10px] font-bold text-xeption-gold border border-xeption-gold rounded">GRADE</div>
                                  </div>
                                  
                                  <h3 className={`text-xl font-bold font-tech uppercase mb-1 ${GRADES[currentGrade].color}`}>{GRADES[currentGrade].label}</h3>
                                  <p className="text-xs text-gray-400 mb-6 px-4">{GRADES[currentGrade].desc}</p>

                                  <div className="bg-white/5 border border-white/10 p-4 rounded-lg mb-6 relative overflow-hidden">
                                      <div className="absolute top-0 right-0 w-20 h-20 bg-xeption-gold/10 blur-xl"></div>
                                      <p className="text-xs text-gray-500 uppercase font-bold mb-1">Valeur de reprise estimée</p>
                                      <div className="text-3xl md:text-4xl font-bold text-white font-mono tracking-tight">
                                          {minPrice.toLocaleString()} <span className="text-lg text-gray-500">-</span> {maxPrice.toLocaleString()} <span className="text-sm text-xeption-gold">FCFA</span>
                                      </div>
                                      <p className="text-[10px] text-gray-600 mt-2 italic">* Prix final validé en boutique après inspection technique.</p>
                                  </div>

                                  <div className="space-y-3">
                                      <a 
                                        href={`https://wa.me/237699000000?text=Hello Xeption, j'ai fait une estimation pour mon ${selectedModel.brand} ${selectedModel.model_name} (Grade ${currentGrade}). Valeur estimée: ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}. Je veux passer valider le troc.`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block w-full bg-green-600 hover:bg-green-500 text-white font-bold uppercase py-4 rounded shadow-lg transition-all flex items-center justify-center gap-2"
                                      >
                                          Valider sur WhatsApp
                                      </a>
                                      <button onClick={() => onNavigate && onNavigate('shop')} className="block w-full border border-white/20 hover:bg-white hover:text-black text-white font-bold uppercase py-3 rounded transition-all">
                                          Voir les offres pour échanger
                                      </button>
                                  </div>
                                  
                                  <button onClick={resetSimulator} className="mt-6 text-xs text-gray-500 hover:text-white flex items-center justify-center gap-1 mx-auto">
                                      <RotateCcw className="w-3 h-3" /> Nouvelle estimation
                                  </button>
                              </div>
                          )
                      ) : null}
                  </div>
              )}

          </div>
      );
  };

  // --- RENDU SECTION MARKETING (DEFAULT) ---
  const renderMarketing = () => (
      <div className="flex flex-col md:flex-row items-center gap-12 h-full">
          <div className="flex-1 space-y-8">
            <div>
                <div className="inline-flex items-center px-3 py-1 bg-xeption-gold/10 text-xeption-gold text-xs font-bold uppercase tracking-[0.2em] font-tech mb-4 border border-xeption-gold/20">
                <RefreshCw className="w-3 h-3 mr-2 animate-spin-slow" />
                Service Troc 2.0
                </div>
                
                <h2 className="text-4xl md:text-6xl font-bold text-white font-tech leading-none mb-4 drop-shadow-xl">
                TON ANCIEN PHONE <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold to-white">VAUT DE L'OR.</span>
                </h2>
                
                <p className="text-lg text-gray-300 font-light max-w-lg drop-shadow-md">
                Ne laisse pas ton vieux iPhone ou Mac prendre la poussière. 
                Fais une <span className="text-white font-bold">cotation immédiate</span> selon nos standards A/B/C/D.
                </p>
            </div>

            <ul className="space-y-4">
              {[
                "Simulateur connecté au marché local",
                "Cotation transparente (Grades A-D)",
                "Paiement Cash ou Déduction immédiate"
              ].map((item, i) => (
                <li key={i} className="flex items-center text-gray-200">
                  <div className="bg-green-500/10 p-1.5 rounded-none border border-green-500/30 mr-4 backdrop-blur-sm">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                  <span className="font-tech text-lg uppercase tracking-wide">{item}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={() => onNavigate ? onNavigate('troc') : setMode('simulator')}
              className="group bg-white/90 backdrop-blur text-black px-8 py-3 font-tech font-bold uppercase tracking-widest hover:bg-xeption-gold transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] flex items-center gap-2"
            >
              Lancer le simulateur <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="flex-1 relative w-full flex justify-center pointer-events-none">
             <div className="relative w-64 h-64 md:w-80 md:h-80">
                <div className="absolute inset-0 border-2 border-dashed border-gray-600 rounded-full animate-spin-slow"></div>
                <div className="absolute inset-4 border border-white/10 rounded-full"></div>
                
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-black/60 backdrop-blur-md w-32 h-32 rounded-full border border-xeption-gold/30 shadow-[0_0_30px_rgba(255,215,0,0.15)] z-20">
                    <RefreshCw className="w-12 h-12 text-xeption-gold" />
                </div>
                
                {/* Grades Floating */}
                <div className="absolute top-0 left-10 bg-black/80 backdrop-blur p-2 border border-green-500/30 text-green-500 text-xs font-bold rounded animate-bounce delay-75">Grade A</div>
                <div className="absolute bottom-10 right-0 bg-black/80 backdrop-blur p-2 border border-xeption-gold/30 text-xeption-gold text-xs font-bold rounded animate-bounce delay-150">Grade B</div>
             </div>
          </div>
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 transition-all duration-500" id="troc-section">
      {/* 
          MODIFICATION DU FLOU ICI : 
          Passage de backdrop-blur-xl à backdrop-blur-3xl 
          Passage de bg-black/40 à bg-black/80 pour renforcer le contraste et isoler du fond
      */}
      <div className={`relative bg-black/80 backdrop-blur-3xl border border-white/10 overflow-hidden shadow-2xl transition-all duration-500 rounded-xl ${mode === 'simulator' ? 'min-h-[600px]' : 'min-h-[500px]'}`}>
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 tech-pattern opacity-10 pointer-events-none"></div>
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-xeption-gold/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>

        <div className="relative z-10 p-8 md:p-16 h-full flex flex-col justify-center">
            {mode === 'intro' ? renderMarketing() : renderSimulator()}
        </div>
      </div>
    </div>
  );
};

export default TrocSection;

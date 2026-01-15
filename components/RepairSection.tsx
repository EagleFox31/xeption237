
import React, { useState } from 'react';
import { Search, Wrench, CheckCircle, AlertTriangle, Calendar, Smartphone, ShieldCheck, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Order, Product } from '../types';

const RepairSection: React.FC = () => {
  const [step, setStep] = useState<'search' | 'select' | 'form' | 'success'>('search');
  const [orderId, setOrderId] = useState('');
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);
  const [issue, setIssue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Check Order Logic
  const handleCheckOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Fetch order by ID
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error || !data) throw new Error("Commande introuvable. Vérifiez l'ID sur votre facture.");

      // Map DB response to Order type
      const order: Order = {
          id: data.id,
          items: data.items,
          total: data.total,
          status: data.status,
          paymentMethod: data.payment_method,
          customerName: data.customer_name,
          customerPhone: data.customer_phone,
          date: data.date,
          deliveryMode: data.delivery_mode
      };

      setFoundOrder(order);
      setStep('select');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Check Warranty Validity
  const checkWarranty = (orderDate: string, warrantyMonths: number = 0) => {
    if (!warrantyMonths) return { valid: false, message: "Pas de garantie" };
    
    const purchaseDate = new Date(orderDate);
    const expirationDate = new Date(purchaseDate.setMonth(purchaseDate.getMonth() + warrantyMonths));
    const today = new Date();

    const isValid = today <= expirationDate;
    const diffTime = Math.abs(expirationDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    return {
        valid: isValid,
        message: isValid 
            ? `Valide encore ${diffDays} jours` 
            : `Expirée le ${expirationDate.toLocaleDateString()}`
    };
  };

  // 2. Create Ticket Logic
  const handleSubmitTicket = async () => {
    if (!foundOrder || !selectedItem || !issue) return;
    setLoading(true);

    try {
        const warrantyInfo = checkWarranty(foundOrder.date, selectedItem.warrantyMonths);
        
        // CHECK INTEGRITY: Verify if product still exists in catalog to avoid FK error
        // If the product was deleted from the 'products' table, we cannot send its ID as foreign key.
        const { data: productExists } = await supabase
            .from('products')
            .select('id')
            .eq('id', selectedItem.id)
            .maybeSingle();

        // Use JSON mapping for inserting into Supabase custom table 'repair_tickets'
        const { error } = await supabase.from('repair_tickets').insert([{
            id: `REP-${Date.now().toString().slice(-6)}`,
            order_id: foundOrder.id,
            // Safety Check: If product deleted, send null to satisfy Foreign Key constraint (assumes column is nullable)
            product_id: productExists ? selectedItem.id : null, 
            product_name: selectedItem.name,
            customer_name: foundOrder.customerName,
            customer_phone: foundOrder.customerPhone,
            issue_description: issue,
            status: 'open',
            warranty_status: warrantyInfo.valid ? 'active' : 'expired',
            created_at: new Date().toISOString()
        }]);

        if (error) throw error;
        setStep('success');

    } catch (err: any) {
        alert("Erreur création ticket: " + err.message);
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="pt-24 pb-20 px-4 min-h-screen max-w-4xl mx-auto">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white font-tech uppercase drop-shadow-lg mb-4">
                Service Après-Vente <span className="text-xeption-gold">237</span>
            </h1>
            <p className="text-gray-300 max-w-2xl mx-auto">
                Un problème avec ton matos ? Vérifie ta garantie en 2 secondes et ouvre un dossier avant de passer nous voir au Mfoundi Mall.
            </p>
        </div>

        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl relative">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-xeption-gold/5 rounded-full blur-[100px]"></div>

            {/* STEP 1: SEARCH */}
            {step === 'search' && (
                <div className="p-8 md:p-12 animate-in fade-in slide-in-from-bottom-5">
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                            <Search className="w-8 h-8 text-xeption-gold" />
                        </div>
                        <h3 className="text-xl font-bold text-white font-tech uppercase mb-6">Trouver ma commande</h3>
                        
                        <form onSubmit={handleCheckOrder} className="w-full max-w-md">
                            <div className="relative mb-4">
                                <input 
                                    type="text" 
                                    placeholder="Numéro de commande (Ex: ORD-123456)" 
                                    value={orderId}
                                    onChange={(e) => setOrderId(e.target.value)}
                                    className="w-full bg-black/50 border border-white/20 text-white px-5 py-4 rounded-lg focus:border-xeption-gold outline-none text-center font-mono placeholder-gray-600 transition-all focus:bg-black/70"
                                />
                            </div>
                            
                            {error && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-500 text-sm flex items-center justify-center gap-2">
                                    <AlertTriangle className="w-4 h-4" /> {error}
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={loading || !orderId}
                                className="w-full bg-xeption-gold text-black font-bold py-4 rounded-lg font-tech uppercase tracking-wider hover:bg-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? "Recherche..." : "Vérifier Garantie"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* STEP 2: SELECT PRODUCT */}
            {step === 'select' && foundOrder && (
                <div className="p-8 animate-in fade-in slide-in-from-right-5">
                     <button onClick={() => setStep('search')} className="text-gray-500 hover:text-white mb-6 text-sm flex items-center gap-1">← Retour</button>
                     <h3 className="text-xl font-bold text-white font-tech uppercase mb-6 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" /> Commande #{foundOrder.id} trouvée
                     </h3>
                     <p className="text-gray-400 text-sm mb-6">Sélectionnez le produit défectueux pour vérifier son éligibilité.</p>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {foundOrder.items.map((item) => {
                            const warranty = checkWarranty(foundOrder.date, item.warrantyMonths);
                            return (
                                <div 
                                    key={item.id} 
                                    onClick={() => { setSelectedItem(item); setStep('form'); }}
                                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:scale-[1.02] flex items-center gap-4 ${
                                        warranty.valid 
                                        ? 'bg-white/5 border-white/10 hover:border-xeption-gold/50' 
                                        : 'bg-red-900/10 border-red-900/30 opacity-70 hover:opacity-100'
                                    }`}
                                >
                                    <div className="w-16 h-16 bg-black rounded p-2 border border-white/10">
                                        <img src={item.image} className="w-full h-full object-contain" alt={item.name} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-white font-bold text-sm line-clamp-1">{item.name}</h4>
                                        <div className={`text-xs mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                            warranty.valid ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                                        }`}>
                                            {warranty.valid ? <ShieldCheck className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                            {warranty.message}
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-600" />
                                </div>
                            );
                        })}
                     </div>
                </div>
            )}

            {/* STEP 3: ISSUE FORM */}
            {step === 'form' && selectedItem && (
                 <div className="p-8 animate-in fade-in slide-in-from-right-5">
                    <button onClick={() => setStep('select')} className="text-gray-500 hover:text-white mb-6 text-sm flex items-center gap-1">← Retour</button>
                    
                    <div className="flex items-start gap-4 mb-8 bg-black/30 p-4 rounded-lg border border-white/10">
                        <div className="w-16 h-16 bg-black rounded p-2 flex-shrink-0">
                             <img src={selectedItem.image} className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">{selectedItem.name}</h3>
                            <p className="text-xeption-gold text-xs font-mono uppercase mt-1">Garantie Active</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider">Description du problème</label>
                        <textarea 
                            value={issue}
                            onChange={(e) => setIssue(e.target.value)}
                            className="w-full h-32 bg-black/50 border border-white/20 text-white p-4 rounded-lg focus:border-xeption-gold outline-none resize-none placeholder-gray-600"
                            placeholder="Dites-nous ce qui ne va pas (ex: L'écran scintille, ne charge plus...)"
                        />
                        <button 
                            onClick={handleSubmitTicket}
                            disabled={loading || !issue}
                            className="w-full bg-xeption-gold text-black font-bold py-4 rounded-lg font-tech uppercase tracking-wider hover:bg-white transition-all shadow-lg mt-4"
                        >
                            {loading ? "Création du ticket..." : "Ouvrir un ticket SAV"}
                        </button>
                    </div>
                 </div>
            )}

            {/* STEP 4: SUCCESS */}
            {step === 'success' && (
                <div className="p-12 text-center animate-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                        <Wrench className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-3xl font-bold text-white font-tech uppercase mb-4">Ticket Ouvert !</h3>
                    <p className="text-gray-300 leading-relaxed mb-8">
                        Votre demande a été pré-enregistrée. <br/>
                        Passez à la boutique <strong>Mfoundi Mall, Boutique 2063</strong> avec votre appareil et ce numéro de commande.
                    </p>
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10 inline-block mb-8">
                        <span className="text-gray-500 text-xs uppercase block mb-1">Rappel Numéro Commande</span>
                        <span className="text-xl font-mono text-white font-bold tracking-widest">{foundOrder?.id}</span>
                    </div>
                    <button 
                        onClick={() => { setStep('search'); setOrderId(''); setIssue(''); }}
                        className="block w-full text-xeption-gold hover:text-white text-sm uppercase font-bold tracking-widest"
                    >
                        Nouvelle demande
                    </button>
                </div>
            )}

        </div>
    </div>
  );
};

export default RepairSection;

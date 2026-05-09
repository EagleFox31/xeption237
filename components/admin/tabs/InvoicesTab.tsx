
import React from 'react';
import { Order } from '../../../types';
import { generateInvoiceHTML } from '../../../utils/invoiceGenerator';
import { Printer, Download, Eye, FileText } from 'lucide-react';
import TableShell from '../shared/TableShell';

interface InvoicesTabProps {
  orders: Order[];
}

const InvoicesTab: React.FC<InvoicesTabProps> = ({ orders }) => {
  
  // Filter only valid orders (exclude pending/cancelled if desired, but keep all for accounting)
  const validOrders = orders.filter(o => o.status !== 'cancelled');

  const handlePrint = (order: Order) => {
    const html = generateInvoiceHTML(order);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      // Wait for resources to load then print
      setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
      }, 500);
    }
  };

  const handleDownloadPDF = async (order: Order) => {
    const html = generateInvoiceHTML(order);
    const element = document.createElement('div');
    element.innerHTML = html;
    element.style.width = '700px'; 
    element.style.background = 'white';
    
    // Create container offscreen
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.appendChild(element);
    document.body.appendChild(container);

    const safeName = order.customerName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    try {
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default;
        const opt = {
            margin:       0, // Zero margin since CSS handles @page margin
            filename:     `Facture_${order.id}_${safeName}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(element).save();
    } catch {
        alert("Impossible de générer le PDF pour le moment.");
    } finally {
        document.body.removeChild(container);
    }
  };

  return (
    <div className="animate-in fade-in h-[calc(100vh-140px)] flex flex-col">
        <h2 className="text-3xl font-tech font-bold uppercase text-white mb-6 shrink-0">Gestion des Factures</h2>
        
        <div className="flex-1 min-h-0 relative">
            <TableShell className="h-full overflow-y-auto border-t border-white/10">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="sticky top-0 z-20 bg-[#0c0c0e] text-gray-400 text-xs uppercase font-bold tracking-wider shadow-lg">
                        <tr>
                            <th className="px-6 py-4">Réf.</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Client</th>
                            <th className="px-6 py-4">Montant</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                        {validOrders.map(order => (
                            <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4 font-mono text-xs font-bold text-xeption-gold">#{order.id}</td>
                                <td className="px-6 py-4 text-xs">{order.date}</td>
                                <td className="px-6 py-4">
                                    <span className="block font-bold text-white">{order.customerName}</span>
                                    <span className="text-[10px] text-gray-500">{order.customerEmail || order.customerPhone}</span>
                                </td>
                                <td className="px-6 py-4 font-mono font-bold">{order.total.toLocaleString()} FCFA</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold border ${order.status === 'delivered' ? 'border-green-500/30 text-green-500 bg-green-500/10' : 'border-gray-500/30 text-gray-400 bg-gray-500/10'}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => handlePrint(order)} 
                                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors" 
                                            title="Imprimer"
                                        >
                                            <Printer className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDownloadPDF(order)} 
                                            className="p-2 text-xeption-gold hover:bg-xeption-gold/10 rounded transition-colors" 
                                            title="Télécharger PDF"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableShell>
        </div>
    </div>
  );
};

export default InvoicesTab;

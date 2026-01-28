import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Search, Calendar, FileText, Printer, Eye, X, Check, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';

interface SaleItem {
    productName: string;
    quantity: number;
    unitPrice: number;
    subTotal: number;
}

interface SaleResult {
    saleId: number;
    invoiceNumber: string;
    date: string;
    totalAmount: number;
    paymentMethod: string;
    customerName?: string;
    cufe?: string;
    qrCode?: string;
    electronicInvoicingStatus?: string;
    items: SaleItem[];
}

const SalesHistory = () => {
    const [sales, setSales] = useState<SaleResult[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [customerName, setCustomerName] = useState('');

    // Modal
    const [selectedSale, setSelectedSale] = useState<SaleResult | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [processing, setProcessing] = useState(false);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (fromDate) params.append('fromDate', fromDate);
            if (toDate) params.append('toDate', toDate);
            if (invoiceNumber) params.append('invoiceNumber', invoiceNumber);
            if (customerName) params.append('customerName', customerName);

            const response = await api.get(`/sales?${params.toString()}`);
            setSales(response.data);
        } catch (error) {
            console.error("Error fetching sales", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchSales();
    };

    const handleViewSale = (sale: SaleResult) => {
        setSelectedSale(sale);
        setShowModal(true);
    };

    const handleRetryInvoice = async () => {
        if (!selectedSale) return;
        setProcessing(true);
        try {
            const response = await api.post(`/sales/${selectedSale.saleId}/emit-invoice`);
            setSelectedSale(response.data);
            // Update in list as well
            setSales(prev => prev.map(s => s.saleId === response.data.saleId ? response.data : s));
        } catch (error) {
            console.error("Error emitting invoice", error);
            alert("Error al emitir factura electrónica");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Historial de Ventas</h1>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Desde</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="date" 
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hasta</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="date" 
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">No. Factura</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="V-2024..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Nombre..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        </div>
                    </div>
                    <button 
                        type="submit"
                        className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium flex justify-center items-center gap-2"
                    >
                        <Search size={18} /> Buscar
                    </button>
                </form>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-sm">Factura</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-sm">Fecha</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-sm">Cliente</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-sm">Pago</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-sm text-right">Total</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-sm text-center">Estado FE</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-sm text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        Cargando ventas...
                                    </td>
                                </tr>
                            ) : sales.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        No se encontraron ventas con los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                sales.map((sale) => (
                                    <tr key={sale.saleId} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{sale.invoiceNumber}</td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {new Date(sale.date).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{sale.customerName}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                {sale.paymentMethod === 'Cash' ? 'Efectivo' : sale.paymentMethod === 'Card' ? 'Tarjeta' : sale.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-900 font-bold text-right">
                                            ${sale.totalAmount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {sale.cufe ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                    <Check size={12} className="mr-1" /> Enviada
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                    Pendiente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleViewSale(sale)}
                                                className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Ver detalle"
                                            >
                                                <Eye size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Ticket Modal (Reuse logic from POS) */}
            {showModal && selectedSale && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center">
                                <FileText className="mr-2 text-blue-400" /> Detalle de Venta
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 bg-gray-50 max-h-[70vh] overflow-y-auto">
                            <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg text-sm font-mono relative" id="printable-ticket">
                                {/* Ticket Header */}
                                <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
                                    <h2 className="font-bold text-xl text-black">KASSA</h2>
                                    <p className="text-gray-500">Sucursal Principal</p>
                                    <p className="text-gray-500 mt-2">{new Date(selectedSale.date).toLocaleString()}</p>
                                    <p className="font-bold mt-1">Ticket: {selectedSale.invoiceNumber}</p>
                                </div>
                                
                                {/* Customer Info */}
                                {selectedSale.customerName && (
                                    <div className="mb-4 border-b border-dashed border-gray-300 pb-4">
                                        <p className="font-bold">Cliente:</p>
                                        <p>{selectedSale.customerName}</p>
                                    </div>
                                )}

                                {/* Items */}
                                <div className="space-y-2 mb-4">
                                    {selectedSale.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between">
                                            <span>{item.quantity} x {item.productName}</span>
                                            <span>${item.subTotal.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Totals */}
                                <div className="border-t border-dashed border-gray-300 pt-4">
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>TOTAL</span>
                                        <span>${selectedSale.totalAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500 mt-2">
                                        <span>Método de Pago</span>
                                        <span>{selectedSale.paymentMethod === 'Cash' ? 'Efectivo' : selectedSale.paymentMethod}</span>
                                    </div>
                                </div>
                                
                                {/* Electronic Invoicing */}
                                {selectedSale.cufe && selectedSale.qrCode ? (
                                    <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                                        <p className="text-xs font-bold text-gray-500 mb-2">Factura Electrónica</p>
                                        <div className="flex justify-center mb-2">
                                            <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(selectedSale.qrCode)}`} 
                                                alt="QR Code" 
                                                className="w-24 h-24"
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 break-all leading-tight">CUFE: {selectedSale.cufe}</p>
                                    </div>
                                ) : (
                                    <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                                        <p className="text-xs text-amber-600 font-bold mb-2">Factura Electrónica Pendiente</p>
                                        <button 
                                            onClick={handleRetryInvoice}
                                            disabled={processing}
                                            className="bg-amber-100 text-amber-800 text-xs px-3 py-2 rounded hover:bg-amber-200 disabled:opacity-50 w-full font-bold transition-colors"
                                        >
                                            {processing ? 'Emitiendo...' : 'Emitir Factura Ahora'}
                                        </button>
                                    </div>
                                )}

                                {/* Cut Line Visual */}
                                <div className="absolute -bottom-3 -left-2 -right-2 h-6 bg-gray-50 rounded-full"></div>
                            </div>
                        </div>

                        <div className="p-4 bg-white border-t flex gap-3">
                            <button 
                                onClick={() => window.print()} 
                                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 flex justify-center items-center gap-2"
                            >
                                <Printer size={20} /> Imprimir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesHistory;

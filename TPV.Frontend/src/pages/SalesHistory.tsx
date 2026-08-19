import { useEffect, useState } from 'react';
import api from '../api/axios';
import { Check, Eye, FileMinus2, FileText, Printer, RotateCcw, Search, X } from 'lucide-react';

interface SaleItem {
    saleDetailId: number;
    productId: number;
    productName: string;
    sku: string;
    quantity: number;
    adjustedQuantity: number;
    unitCode: string;
    unitPrice: number;
    discountAmount: number;
    subTotal: number;
    unitCost: number;
    totalCost: number;
    brandName?: string;
    accountingClassification: string;
}

interface SaleAdjustment {
    id: number;
    documentType: string;
    documentNumber: string;
    date: string;
    reason: string;
    restocksInventory: boolean;
    totalAmount: number;
    status: string;
}

interface SaleResult {
    saleId: number;
    invoiceNumber: string;
    date: string;
    totalAmount: number;
    paymentMethod: string;
    customerName?: string;
    cufe?: string;
    electronicInvoicingStatus?: string;
    serviceOrderId?: number;
    quotationId?: number;
    quotationNumber?: string;
    items: SaleItem[];
    adjustments: SaleAdjustment[];
}

const money = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);

const SalesHistory = () => {
    const [sales, setSales] = useState<SaleResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [selectedSale, setSelectedSale] = useState<SaleResult | null>(null);
    const [processing, setProcessing] = useState(false);
    const [showAdjustment, setShowAdjustment] = useState(false);
    const [adjustmentType, setAdjustmentType] = useState<'DEVOLUCION' | 'NOTA_CREDITO'>('DEVOLUCION');
    const [reason, setReason] = useState('');
    const [quantities, setQuantities] = useState<Record<number, number>>({});

    const fetchSales = async () => {
        setLoading(true);
        try {
            const response = await api.get('/sales', { params: { fromDate: fromDate || undefined, toDate: toDate || undefined, invoiceNumber: invoiceNumber || undefined, customerName: customerName || undefined } });
            setSales(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSales(); }, []);

    const openSale = async (saleId: number) => {
        try {
            const response = await api.get(`/sales/${saleId}`);
            setSelectedSale(response.data);
            setShowAdjustment(false);
            setReason('');
            setQuantities({});
        } catch (error: any) {
            alert(error.response?.data?.message || 'NO FUE POSIBLE CARGAR LA VENTA');
        }
    };

    const retryInvoice = async () => {
        if (!selectedSale) return;
        setProcessing(true);
        try {
            const response = await api.post(`/sales/${selectedSale.saleId}/emit-invoice`);
            setSelectedSale(response.data);
            await fetchSales();
        } catch (error: any) {
            alert(error.response?.data?.message || 'NO FUE POSIBLE EMITIR LA FACTURA');
        } finally {
            setProcessing(false);
        }
    };

    const createAdjustment = async () => {
        if (!selectedSale) return;
        const items = Object.entries(quantities).filter(([, quantity]) => quantity > 0).map(([saleDetailId, quantity]) => ({ saleDetailId: Number(saleDetailId), quantity }));
        if (!items.length || reason.trim().length < 5) {
            alert('INDIQUE CANTIDADES Y UN MOTIVO DE AL MENOS CINCO CARACTERES');
            return;
        }
        setProcessing(true);
        try {
            await api.post(`/sales/${selectedSale.saleId}/adjustments`, { documentType: adjustmentType, reason, items });
            await openSale(selectedSale.saleId);
            await fetchSales();
        } catch (error: any) {
            alert(error.response?.data?.message || 'NO FUE POSIBLE CREAR EL AJUSTE');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-5 p-0 sm:p-6">
            <h1 className="text-2xl font-extrabold text-slate-900">HISTORIAL DE VENTAS</h1>
            <form onSubmit={event => { event.preventDefault(); fetchSales(); }} className="grid grid-cols-1 gap-3 border border-slate-200 bg-white p-4 md:grid-cols-5">
                <label className="text-xs font-bold text-slate-600">DESDE<input type="date" className="mt-1 h-10 w-full border border-slate-300 px-3" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label>
                <label className="text-xs font-bold text-slate-600">HASTA<input type="date" className="mt-1 h-10 w-full border border-slate-300 px-3" value={toDate} onChange={event => setToDate(event.target.value)} /></label>
                <label className="text-xs font-bold text-slate-600">FACTURA<input className="mt-1 h-10 w-full border border-slate-300 px-3" value={invoiceNumber} onChange={event => setInvoiceNumber(event.target.value)} /></label>
                <label className="text-xs font-bold text-slate-600">CLIENTE<input className="mt-1 h-10 w-full border border-slate-300 px-3" value={customerName} onChange={event => setCustomerName(event.target.value)} /></label>
                <button className="mt-auto flex h-10 items-center justify-center gap-2 bg-blue-600 px-4 text-sm font-bold text-white"><Search size={17} />BUSCAR</button>
            </form>

            <div className="overflow-x-auto border border-slate-200 bg-white">
                <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-extrabold text-slate-600"><tr><th className="p-4">FACTURA</th><th className="p-4">COTIZACIÓN</th><th className="p-4">FECHA</th><th className="p-4">CLIENTE</th><th className="p-4">PAGO</th><th className="p-4 text-right">TOTAL</th><th className="p-4 text-center">FE</th><th className="p-4 text-center">ACCIONES</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {sales.map(sale => <tr key={sale.saleId} className="hover:bg-slate-50"><td className="p-4 font-bold">{sale.invoiceNumber}</td><td className="p-4 font-semibold text-blue-700">{sale.quotationNumber || '-'}</td><td className="p-4">{new Date(sale.date).toLocaleString('es-CO')}</td><td className="p-4">{sale.customerName || 'CLIENTE GENERAL'}</td><td className="p-4">{sale.paymentMethod}</td><td className="p-4 text-right font-extrabold">{money(sale.totalAmount)}</td><td className="p-4 text-center">{sale.cufe ? <Check className="inline text-emerald-600" size={18} /> : 'PENDIENTE'}</td><td className="p-4 text-center"><button title="VER DETALLE" onClick={() => openSale(sale.saleId)} className="p-2 text-blue-700"><Eye size={19} /></button></td></tr>)}
                        {!loading && !sales.length && <tr><td colSpan={8} className="p-10 text-center text-slate-400">NO HAY VENTAS PARA LOS FILTROS SELECCIONADOS</td></tr>}
                    </tbody>
                </table>
            </div>

            {selectedSale && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
                <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-6xl overflow-y-auto bg-white shadow-2xl">
                    <header className="sticky top-0 z-10 flex items-center justify-between bg-slate-900 px-5 py-4 text-white"><div><div className="text-xs font-bold text-slate-300">FACTURA ORIGINAL</div><div className="text-lg font-extrabold">{selectedSale.invoiceNumber}</div></div><button title="CERRAR" onClick={() => setSelectedSale(null)}><X /></button></header>
                    <div className="space-y-5 p-5">
                        <div className="grid gap-3 text-sm sm:grid-cols-5"><div><b>FECHA</b><br />{new Date(selectedSale.date).toLocaleString('es-CO')}</div><div><b>CLIENTE</b><br />{selectedSale.customerName || 'CLIENTE GENERAL'}</div><div><b>COTIZACIÓN ORIGEN</b><br /><span className="font-bold text-blue-700">{selectedSale.quotationNumber || '-'}</span></div><div><b>ORDEN DE TALLER</b><br />{selectedSale.serviceOrderId || '-'}</div><div><b>TOTAL</b><br /><span className="text-lg font-extrabold text-blue-700">{money(selectedSale.totalAmount)}</span></div></div>
                        <div className="overflow-x-auto border border-slate-200"><table className="w-full min-w-[950px] text-sm"><thead className="bg-slate-50 text-xs font-extrabold"><tr><th className="p-3 text-left">REFERENCIA</th><th className="p-3 text-left">MARCA / CLASIFICACION</th><th className="p-3 text-right">CANTIDAD</th><th className="p-3 text-right">PRECIO</th><th className="p-3 text-right">DESCUENTO</th><th className="p-3 text-right">COSTO</th><th className="p-3 text-right">TOTAL</th></tr></thead><tbody className="divide-y">{selectedSale.items.map(item => <tr key={item.saleDetailId}><td className="p-3"><b>{item.sku}</b><br />{item.productName}</td><td className="p-3">{item.brandName || '-'}<br /><span className="text-xs text-slate-500">{item.accountingClassification}</span></td><td className="p-3 text-right">{item.quantity} {item.unitCode}<br /><span className="text-xs text-amber-700">AJUSTADA {item.adjustedQuantity || 0}</span></td><td className="p-3 text-right">{money(item.unitPrice)}</td><td className="p-3 text-right">{money(item.discountAmount)}</td><td className="p-3 text-right">{money(item.totalCost)}</td><td className="p-3 text-right font-bold">{money(item.subTotal)}</td></tr>)}</tbody></table></div>

                        <div className="flex flex-wrap gap-2"><button onClick={() => window.print()} className="flex items-center gap-2 border border-slate-300 px-4 py-2 text-sm font-bold"><Printer size={17} />IMPRIMIR</button>{!selectedSale.cufe && <button disabled={processing} onClick={retryInvoice} className="flex items-center gap-2 bg-blue-600 px-4 py-2 text-sm font-bold text-white"><FileText size={17} />EMITIR FACTURA</button>}<button onClick={() => setShowAdjustment(value => !value)} className="flex items-center gap-2 bg-amber-500 px-4 py-2 text-sm font-bold text-white"><RotateCcw size={17} />DEVOLUCION / NOTA CREDITO</button></div>

                        {showAdjustment && <section className="space-y-4 border border-amber-200 bg-amber-50 p-4"><div className="grid gap-3 md:grid-cols-[220px_1fr]"><label className="text-xs font-bold">TIPO DE DOCUMENTO<select className="mt-1 h-10 w-full border border-amber-300 bg-white px-3" value={adjustmentType} onChange={event => setAdjustmentType(event.target.value as typeof adjustmentType)}><option value="DEVOLUCION">DEVOLUCION CON INVENTARIO</option><option value="NOTA_CREDITO">NOTA CREDITO SIN INVENTARIO</option></select></label><label className="text-xs font-bold">MOTIVO<input className="mt-1 h-10 w-full border border-amber-300 px-3" value={reason} onChange={event => setReason(event.target.value)} /></label></div><div className="grid gap-2">{selectedSale.items.map(item => { const available = item.quantity - (item.adjustedQuantity || 0); return <label key={item.saleDetailId} className="grid grid-cols-[1fr_130px] items-center gap-3 bg-white p-3 text-sm"><span><b>{item.sku}</b> {item.productName}<br /><span className="text-xs text-slate-500">SALDO AJUSTABLE: {available} {item.unitCode}</span></span><input type="number" min="0" max={available} step="0.0001" disabled={available <= 0} className="h-10 border border-slate-300 px-3 text-right" value={quantities[item.saleDetailId] || ''} onChange={event => setQuantities({...quantities, [item.saleDetailId]: Math.min(Number(event.target.value), available)})} /></label>; })}</div><button disabled={processing} onClick={createAdjustment} className="flex items-center gap-2 bg-amber-600 px-4 py-2 text-sm font-extrabold text-white"><FileMinus2 size={17} />{processing ? 'PROCESANDO...' : 'CREAR DOCUMENTO'}</button></section>}

                        <section><h3 className="mb-2 text-sm font-extrabold">DEVOLUCIONES Y NOTAS CREDITO</h3><div className="grid gap-2">{selectedSale.adjustments?.map(adjustment => <div key={adjustment.id} className="grid gap-2 border border-slate-200 p-3 text-sm md:grid-cols-[160px_1fr_160px]"><div><b>{adjustment.documentType}</b><br />{adjustment.documentNumber}</div><div>{adjustment.reason}<br /><span className="text-xs text-slate-500">{new Date(adjustment.date).toLocaleString('es-CO')} | {adjustment.restocksInventory ? 'REINTEGRA INVENTARIO' : 'SIN MOVIMIENTO FISICO'}</span></div><div className="text-right font-extrabold">{money(adjustment.totalAmount)}<br /><span className="text-xs text-emerald-700">{adjustment.status}</span></div></div>)}{!selectedSale.adjustments?.length && <div className="text-sm text-slate-400">SIN AJUSTES</div>}</div></section>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default SalesHistory;

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { Loader2 } from 'lucide-react';

interface PurchaseDetail {
    productId: number;
    productName: string;
    quantity: number;
    unitCost: number;
    subTotal: number;
    taxRate?: number;
    taxAmount?: number;
}

interface Purchase {
    id: number;
    supplierName: string;
    supplierType: string;
    officialBrandName?: string;
    branchName: string;
    inventoryLocationCode: string;
    inventoryLocationName: string;
    date: string;
    supplierInvoiceDate?: string | null;
    receivedAt: string;
    purchaseOrderNumber?: string | null;
    purchaseOrderDate?: string | null;
    referenceNumber: string;
    totalAmount: number;
    itemsSubTotal: number;
    itemsTaxAmount: number;
    freight?: number;
    freightTaxRate?: number;
    freightTaxAmount?: number;
    status: string;
    accountingStatus: string;
    details: PurchaseDetail[];
}

const money = (value?: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Number.isFinite(value ?? 0) ? value ?? 0 : 0);

const formatDate = (value?: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('es-CO');
};

const PurchasePrint = () => {
    const { id } = useParams<{ id: string }>();
    const [purchase, setPurchase] = useState<Purchase | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPurchase = async () => {
            if (!id) return;
            try {
                const response = await api.get(`/purchases/${id}`);
                setPurchase(response.data);
            } catch (error) {
                console.error('Error fetching purchase:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPurchase();
    }, [id]);

    useEffect(() => {
        if (!loading && purchase) {
            setTimeout(() => window.print(), 500);
        }
    }, [loading, purchase]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    if (!purchase) {
        return <div className="p-8 text-center text-red-600">Entrada no encontrada.</div>;
    }

    const freight = purchase.freight ?? 0;
    const freightTaxAmount = purchase.freightTaxAmount ?? 0;

    return (
        <div className="mx-auto max-w-4xl bg-white p-8 text-black print:p-0">
            <div className="mb-8 flex items-start justify-between border-b border-gray-300 pb-5">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900">ENTRADA DE MERCANCIA</h1>
                    <p className="mt-1 text-sm text-gray-500">Comprobante interno #{purchase.id}</p>
                </div>
                <div className="text-right">
                    <button
                        type="button"
                        onClick={() => window.close()}
                        className="mb-4 rounded-lg bg-gray-200 px-4 py-2 text-sm font-bold text-gray-800 transition hover:bg-gray-300 print:hidden"
                    >
                        Cerrar
                    </button>
                    <div className="text-lg font-black text-gray-900">{purchase.branchName}</div>
                    <div className="mt-1 text-sm text-gray-600">Estado: {purchase.status}</div>
                    <div className="text-sm text-gray-600">ERP: {purchase.accountingStatus || 'Pending'}</div>
                </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 print:bg-white">
                    <h2 className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500">Proveedor</h2>
                    <div className="text-lg font-bold text-gray-900">{purchase.supplierName}</div>
                    <div className="text-sm font-bold text-gray-600">{purchase.supplierType || 'TERCERO'}{purchase.officialBrandName ? ` - ${purchase.officialBrandName}` : ''}</div>
                    <div className="mt-2 text-sm text-gray-600">Factura: {purchase.referenceNumber || '-'}</div>
                    <div className="text-sm text-gray-600">Fecha factura: {formatDate(purchase.supplierInvoiceDate)}</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 print:bg-white">
                    <h2 className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500">Movimiento</h2>
                    <div className="text-sm text-gray-600">Fecha documento: {formatDate(purchase.date)}</div>
                    <div className="text-sm font-bold text-gray-700">Recepcion efectiva: {formatDate(purchase.receivedAt)}</div>
                    <div className="text-sm text-gray-600">Pedido: {purchase.purchaseOrderNumber || '-'} / {formatDate(purchase.purchaseOrderDate)}</div>
                    <div className="text-sm text-gray-600">Bodega: {purchase.branchName}</div>
                    <div className="text-sm text-gray-600">Ubicación: {purchase.inventoryLocationCode} - {purchase.inventoryLocationName}</div>
                </div>
            </div>

            <div className="mb-8">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="border-b-2 border-gray-900 text-sm">
                            <th className="py-2 font-black text-gray-800">Articulo</th>
                            <th className="py-2 text-center font-black text-gray-800">Cant.</th>
                            <th className="py-2 text-right font-black text-gray-800">Costo</th>
                            <th className="py-2 text-right font-black text-gray-800">Base</th>
                            <th className="py-2 text-right font-black text-gray-800">IVA</th>
                            <th className="py-2 text-right font-black text-gray-800">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {purchase.details.map((detail, index) => {
                            const taxAmount = detail.taxAmount || 0;
                            const taxRate = detail.taxRate || 0;
                            const totalLine = detail.subTotal + taxAmount;
                            return (
                                <tr key={`${detail.productId}-${index}`} className="border-b border-gray-200 text-sm">
                                    <td className="py-3">{detail.productName}</td>
                                    <td className="py-3 text-center">{detail.quantity}</td>
                                    <td className="py-3 text-right">{money(detail.unitCost)}</td>
                                    <td className="py-3 text-right">{money(detail.subTotal)}</td>
                                    <td className="py-3 text-right">
                                        <div>{money(taxAmount)}</div>
                                        <div className="text-xs text-gray-500">({taxRate}%)</div>
                                    </td>
                                    <td className="py-3 text-right font-bold">{money(totalLine)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="text-sm">
                        <tr>
                            <td colSpan={5} className="pt-5 text-right font-bold text-gray-600">Base articulos:</td>
                            <td className="pt-5 text-right font-bold text-gray-800">{money(purchase.itemsSubTotal)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} className="pt-2 text-right font-bold text-gray-600">IVA articulos:</td>
                            <td className="pt-2 text-right font-bold text-gray-800">{money(purchase.itemsTaxAmount)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} className="pt-2 text-right font-bold text-gray-600">Flete:</td>
                            <td className="pt-2 text-right font-bold text-gray-800">{money(freight)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} className="pt-2 text-right font-bold text-gray-600">
                                IVA flete ({purchase.freightTaxRate || 0}%):
                            </td>
                            <td className="pt-2 text-right font-bold text-gray-800">{money(freightTaxAmount)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} className="pt-4 text-right text-xl font-black text-gray-900">Total entrada:</td>
                            <td className="pt-4 text-right text-xl font-black text-gray-900">{money(purchase.totalAmount)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="mt-12 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
                Generado el {new Date().toLocaleString('es-CO')}
            </div>

            <style>{`
                @media print {
                    @page { margin: 20mm; }
                    body { -webkit-print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
};

export default PurchasePrint;

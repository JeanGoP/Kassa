import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { Loader2 } from 'lucide-react';

interface QuotationDetail {
    id: number;
    productId: number;
    productName: string;
    sku: string;
    barcode?: string | null;
    quantity: number;
    availableQuantity: number;
    unitPrice: number;
    subTotal: number;
}

interface Quotation {
    id: number;
    quotationNumber: string;
    date: string;
    requestedByName: string;
    requestedByPhone?: string | null;
    requestedByEmail?: string | null;
    notes?: string | null;
    totalAmount: number;
    details: QuotationDetail[];
}

const formatCurrency = (value: number) =>
    (value || 0).toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    });

const QuotationPrint = () => {
    const { id } = useParams<{ id: string }>();
    const [quotation, setQuotation] = useState<Quotation | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuotation = async () => {
            if (!id) return;
            try {
                const response = await api.get(`/quotations/${id}`);
                setQuotation(response.data);
            } catch (error) {
                console.error('Error loading quotation', error);
            } finally {
                setLoading(false);
            }
        };

        fetchQuotation();
    }, [id]);

    useEffect(() => {
        if (!loading && quotation) {
            setTimeout(() => window.print(), 500);
        }
    }, [loading, quotation]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    if (!quotation) {
        return <div className="p-8 text-center text-red-600">Cotizacion no encontrada.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 text-black print:p-0">
            <div className="mb-8 flex items-start justify-between border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">COTIZACION</h1>
                    <p className="mt-1 text-sm text-gray-600">No. {quotation.quotationNumber}</p>
                </div>
                <div className="text-right">
                    <button
                        onClick={() => window.close()}
                        className="mb-4 rounded-lg bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 print:hidden"
                    >
                        Cerrar
                    </button>
                    <div className="text-sm text-gray-600">
                        Fecha: {new Date(quotation.date).toLocaleString('es-CO')}
                    </div>
                </div>
            </div>

            <div className="mb-8 grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 print:border-gray-300 md:grid-cols-3">
                <div>
                    <div className="text-xs font-bold uppercase text-gray-500">Solicitante</div>
                    <div className="mt-1 text-lg font-semibold">{quotation.requestedByName}</div>
                </div>
                <div>
                    <div className="text-xs font-bold uppercase text-gray-500">Telefono</div>
                    <div className="mt-1">{quotation.requestedByPhone || '-'}</div>
                </div>
                <div>
                    <div className="text-xs font-bold uppercase text-gray-500">Correo</div>
                    <div className="mt-1">{quotation.requestedByEmail || '-'}</div>
                </div>
            </div>

            <table className="mb-8 w-full border-collapse text-left">
                <thead>
                    <tr className="border-b-2 border-gray-900">
                        <th className="py-2 text-sm font-bold text-gray-700">Repuesto / articulo</th>
                        <th className="py-2 text-sm font-bold text-gray-700">SKU</th>
                        <th className="py-2 text-center text-sm font-bold text-gray-700">Cant.</th>
                        <th className="py-2 text-center text-sm font-bold text-gray-700">Disp.</th>
                        <th className="py-2 text-right text-sm font-bold text-gray-700">Precio unit.</th>
                        <th className="py-2 text-right text-sm font-bold text-gray-700">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    {quotation.details.map((detail) => (
                        <tr key={detail.id} className="border-b border-gray-200">
                            <td className="py-3 pr-3">
                                <div className="font-medium">{detail.productName}</div>
                                {detail.barcode && <div className="text-xs text-gray-500">Codigo: {detail.barcode}</div>}
                            </td>
                            <td className="py-3 text-sm">{detail.sku || '-'}</td>
                            <td className="py-3 text-center">{detail.quantity}</td>
                            <td className="py-3 text-center">{detail.availableQuantity}</td>
                            <td className="py-3 text-right">{formatCurrency(detail.unitPrice)}</td>
                            <td className="py-3 text-right font-semibold">{formatCurrency(detail.subTotal)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={5} className="pt-5 text-right text-xl font-bold text-gray-800">Total:</td>
                        <td className="pt-5 text-right text-xl font-bold text-gray-900">{formatCurrency(quotation.totalAmount)}</td>
                    </tr>
                </tfoot>
            </table>

            {quotation.notes && (
                <div className="mb-8 rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 text-xs font-bold uppercase text-gray-500">Notas</div>
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{quotation.notes}</p>
                </div>
            )}

            <div className="mt-12 border-t pt-4 text-center text-xs text-gray-500">
                <p>Documento generado por Kassa el {new Date().toLocaleString('es-CO')}</p>
            </div>

            <style>{`
                @media print {
                    @page { margin: 18mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
};

export default QuotationPrint;

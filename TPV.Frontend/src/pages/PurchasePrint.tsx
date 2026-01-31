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
    date: string;
    referenceNumber: string;
    totalAmount: number;
    freight?: number;
    status: string;
    details: PurchaseDetail[];
    branchName: string;
}

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

        if (id) {
            fetchPurchase();
        }
    }, [id]);

    useEffect(() => {
        if (!loading && purchase) {
            // Give a small delay to ensure rendering is complete (including styles)
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [loading, purchase]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    if (!purchase) {
        return <div className="p-8 text-center text-red-600">Entrada no encontrada.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-8 bg-white text-black print:p-0">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">ENTRADA DE MERCANCÍA</h1>
                    <p className="text-sm text-gray-500 mt-1">Ref: {purchase.referenceNumber}</p>
                </div>
                <div className="text-right flex flex-col items-end">
                    <button 
                        onClick={() => window.close()} 
                        className="mb-4 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg print:hidden transition-colors"
                    >
                        Cerrar
                    </button>
                    <div className="text-xl font-bold text-gray-800">{purchase.branchName}</div>
                    <div className="text-sm text-gray-600">
                        Fecha: {new Date(purchase.date).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600">
                        Estado: <span className="uppercase font-semibold">{purchase.status}</span>
                    </div>
                </div>
            </div>

            {/* Supplier Info */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200 print:border-gray-300">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Proveedor</h3>
                <div className="text-lg font-semibold">{purchase.supplierName}</div>
            </div>

            {/* Details Table */}
            <div className="mb-8">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-gray-800">
                            <th className="py-2 font-bold text-gray-700">Producto</th>
                            <th className="py-2 text-center font-bold text-gray-700">Cant.</th>
                            <th className="py-2 text-right font-bold text-gray-700">Costo Unit.</th>
                            <th className="py-2 text-right font-bold text-gray-700">Subtotal</th>
                            <th className="py-2 text-right font-bold text-gray-700">IVA</th>
                            <th className="py-2 text-right font-bold text-gray-700">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {purchase.details.map((detail, index) => {
                            const taxAmount = detail.taxAmount || 0;
                            const taxRate = detail.taxRate || 0;
                            const totalLine = detail.subTotal + taxAmount;
                            return (
                            <tr key={index} className="border-b border-gray-200">
                                <td className="py-3">{detail.productName}</td>
                                <td className="py-3 text-center">{detail.quantity}</td>
                                <td className="py-3 text-right">${detail.unitCost.toLocaleString()}</td>
                                <td className="py-3 text-right">${detail.subTotal.toLocaleString()}</td>
                                <td className="py-3 text-right text-xs text-gray-500">
                                    ${taxAmount.toLocaleString()} 
                                    <br/>({taxRate}%)
                                </td>
                                <td className="py-3 text-right font-medium">${totalLine.toLocaleString()}</td>
                            </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        {purchase.freight && purchase.freight > 0 ? (
                            <>
                                <tr>
                                    <td colSpan={5} className="pt-4 text-right font-bold text-gray-600">Subtotal Productos:</td>
                                    <td className="pt-4 text-right font-bold text-gray-600">
                                        ${(purchase.totalAmount - purchase.freight).toLocaleString()}
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={5} className="pt-2 text-right font-bold text-gray-600">Flete:</td>
                                    <td className="pt-2 text-right font-bold text-gray-600">
                                        ${purchase.freight.toLocaleString()}
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={5} className="pt-2 text-right font-bold text-xl text-gray-800">Total:</td>
                                    <td className="pt-2 text-right font-bold text-xl text-gray-800">
                                        ${purchase.totalAmount.toLocaleString()}
                                    </td>
                                </tr>
                            </>
                        ) : (
                            <tr>
                                <td colSpan={5} className="pt-4 text-right font-bold text-xl text-gray-800">Total:</td>
                                <td className="pt-4 text-right font-bold text-xl text-gray-800">
                                    ${purchase.totalAmount.toLocaleString()}
                                </td>
                            </tr>
                        )}
                    </tfoot>
                </table>
            </div>

            {/* Footer */}
            <div className="mt-12 text-center text-xs text-gray-400 border-t pt-4">
                <p>Generado el {new Date().toLocaleString()}</p>
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

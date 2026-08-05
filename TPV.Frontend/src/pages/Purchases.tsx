import { useEffect, useState } from 'react';
import api from '../api/axios';
import { ArrowDownCircle, Building2, Calendar, FileText, Plus, Printer, Search, Trash2, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Purchase {
    id: number;
    supplierName: string;
    branchName: string;
    inventoryLocationCode: string;
    inventoryLocationName: string;
    date: string;
    supplierInvoiceDate?: string | null;
    referenceNumber: string;
    totalAmount: number;
    freight: number;
    freightTaxAmount: number;
    status: string;
    accountingStatus: string;
}

const money = (value: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Number.isFinite(value) ? value : 0);

const formatDate = (value?: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('es-CO');
};

const Purchases = () => {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        const delay = setTimeout(() => {
            fetchPurchases(searchTerm);
        }, 400);

        return () => clearTimeout(delay);
    }, [searchTerm]);

    const fetchPurchases = async (search: string = '') => {
        try {
            const response = await api.get('/purchases', { params: { search } });
            setPurchases(response.data);
        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.message || 'Error al cargar las entradas de mercancia.';
            const details = error.response?.data?.details ? `\nDetalles: ${error.response.data.details}` : '';
            alert(`${message}${details}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const confirmed = window.confirm('Seguro que desea eliminar esta entrada? Esto ajustara el inventario.');
        if (!confirmed) return;

        try {
            setDeletingId(id);
            await api.delete(`/purchases/${id}`);
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'NO FUE POSIBLE ANULAR LA ENTRADA DE MERCANCÍA');
        } finally {
            setDeletingId(null);
            await fetchPurchases(searchTerm);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Movimientos</div>
                    <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-slate-950">
                        <ArrowDownCircle className="text-blue-700" size={26} />
                        Entradas de mercancia
                    </h1>
                </div>
                <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                    <div className="relative min-w-0 flex-1 lg:w-80">
                        <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar proveedor o factura"
                            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pl-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </div>
                    <Link
                        to="/purchases/create"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-extrabold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700"
                    >
                        <Plus size={19} />
                        Nueva entrada
                    </Link>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full min-w-[1040px] border-collapse text-left">
                        <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="border-b border-slate-200 p-4">Entrada</th>
                                <th className="border-b border-slate-200 p-4">Factura proveedor</th>
                                <th className="border-b border-slate-200 p-4">Proveedor</th>
                                <th className="border-b border-slate-200 p-4">Bodega</th>
                                <th className="border-b border-slate-200 p-4 text-right">Total</th>
                                <th className="border-b border-slate-200 p-4 text-center">Contable</th>
                                <th className="border-b border-slate-200 p-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {purchases.map(item => (
                                <tr key={item.id} className="transition hover:bg-blue-50/50">
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                            <Calendar size={15} className="text-slate-400" />
                                            {formatDate(item.date)}
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500">ID #{item.id}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                            <FileText size={15} className="text-slate-400" />
                                            {item.referenceNumber || 'Sin numero'}
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500">Fecha: {formatDate(item.supplierInvoiceDate)}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                            <User size={15} className="text-slate-400" />
                                            {item.supplierName}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                            <Building2 size={15} className="text-slate-400" />
                                            {item.branchName}
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500">
                                            {item.inventoryLocationCode} - {item.inventoryLocationName}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="font-extrabold text-slate-950">{money(item.totalAmount)}</div>
                                        {(item.freight || item.freightTaxAmount) ? (
                                            <div className="mt-1 text-xs text-slate-500">
                                                Flete {money(item.freight + item.freightTaxAmount)}
                                            </div>
                                        ) : null}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="inline-flex rounded-md bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-700 ring-1 ring-amber-100">
                                            {item.accountingStatus || 'Pending'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <Link
                                                to={`/purchases/print/${item.id}`}
                                                target="_blank"
                                                className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                                                title="Imprimir entrada"
                                            >
                                                <Printer size={18} />
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(item.id)}
                                                disabled={deletingId === item.id}
                                                className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                                title="Eliminar entrada"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {purchases.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={7} className="p-10 text-center text-sm font-semibold text-slate-400">
                                        No hay entradas registradas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="divide-y divide-slate-100 lg:hidden">
                    {purchases.map(item => (
                        <div key={item.id} className="space-y-3 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="truncate text-base font-extrabold text-slate-950">
                                        {item.referenceNumber || `Entrada #${item.id}`}
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-slate-600">{item.supplierName}</div>
                                </div>
                                <span className="shrink-0 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-700 ring-1 ring-amber-100">
                                    {item.accountingStatus || 'Pending'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <div className="text-xs font-bold uppercase text-slate-400">Entrada</div>
                                    <div className="font-semibold text-slate-700">{formatDate(item.date)}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase text-slate-400">Factura</div>
                                    <div className="font-semibold text-slate-700">{formatDate(item.supplierInvoiceDate)}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase text-slate-400">Bodega</div>
                                    <div className="font-semibold text-slate-700">{item.branchName}</div>
                                    <div className="text-xs text-slate-500">{item.inventoryLocationCode} - {item.inventoryLocationName}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase text-slate-400">Total</div>
                                    <div className="font-extrabold text-blue-700">{money(item.totalAmount)}</div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <Link
                                    to={`/purchases/print/${item.id}`}
                                    target="_blank"
                                    className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                                    title="Imprimir entrada"
                                >
                                    <Printer size={18} />
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(item.id)}
                                    disabled={deletingId === item.id}
                                    className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                    title="Eliminar entrada"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {purchases.length === 0 && !loading && (
                        <div className="p-10 text-center text-sm font-semibold text-slate-400">
                            No hay entradas registradas.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Purchases;

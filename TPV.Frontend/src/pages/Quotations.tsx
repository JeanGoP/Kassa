import React, { useMemo, useState } from 'react';
import api from '../api/axios';
import { CheckCircle, FileText, PackageSearch, Plus, Printer, Search, Trash2, X, XCircle } from 'lucide-react';

interface BranchAvailability {
    branchId: number;
    branchName: string;
    quantity: number;
}

interface ProductAvailability {
    productId: number;
    name: string;
    sku: string;
    barcode?: string | null;
    price: number;
    totalQuantity: number;
    branches: BranchAvailability[];
}

interface SearchResult {
    searchTerm: string;
    foundInStock: boolean;
    totalQuantity: number;
    products: ProductAvailability[];
}

interface QuoteItem {
    productId: number;
    name: string;
    sku: string;
    barcode?: string | null;
    availableQuantity: number;
    quantity: number;
    unitPrice: number;
}

interface SavedQuotationDetail {
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

interface SavedQuotation {
    id: number;
    quotationNumber: string;
    date: string;
    requestedByName: string;
    requestedByPhone?: string | null;
    requestedByEmail?: string | null;
    notes?: string | null;
    totalAmount: number;
    details: SavedQuotationDetail[];
}

const formatCurrency = (value: number) =>
    (value || 0).toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    });

const Quotations = () => {
    const [requestedByName, setRequestedByName] = useState('');
    const [requestedByPhone, setRequestedByPhone] = useState('');
    const [requestedByEmail, setRequestedByEmail] = useState('');
    const [notes, setNotes] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [result, setResult] = useState<SearchResult | null>(null);
    const [items, setItems] = useState<QuoteItem[]>([]);
    const [lastQuotation, setLastQuotation] = useState<SavedQuotation | null>(null);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const totalAmount = useMemo(
        () => items.reduce((total, item) => total + item.quantity * item.unitPrice, 0),
        [items]
    );

    const handleSearch = async (event: React.FormEvent) => {
        event.preventDefault();
        const term = searchTerm.trim();
        if (!term) return;

        setIsSearching(true);
        setError('');
        setResult(null);
        try {
            const response = await api.get(`/quotations/search?term=${encodeURIComponent(term)}`);
            setResult(response.data);
        } catch (err: any) {
            const message = err?.response?.data?.message || 'No se pudo buscar el repuesto.';
            setError(message);
        } finally {
            setIsSearching(false);
        }
    };

    const addItem = (product: ProductAvailability) => {
        setError('');
        setLastQuotation(null);
        setIsPrintModalOpen(false);
        setItems((current) => {
            const existing = current.find((item) => item.productId === product.productId);
            if (existing) {
                return current.map((item) =>
                    item.productId === product.productId
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }

            return [
                ...current,
                {
                    productId: product.productId,
                    name: product.name,
                    sku: product.sku,
                    barcode: product.barcode,
                    availableQuantity: product.totalQuantity,
                    quantity: 1,
                    unitPrice: product.price
                }
            ];
        });
    };

    const updateItem = (productId: number, changes: Partial<QuoteItem>) => {
        setLastQuotation(null);
        setIsPrintModalOpen(false);
        setItems((current) =>
            current.map((item) =>
                item.productId === productId
                    ? { ...item, ...changes }
                    : item
            )
        );
    };

    const removeItem = (productId: number) => {
        setLastQuotation(null);
        setIsPrintModalOpen(false);
        setItems((current) => current.filter((item) => item.productId !== productId));
    };

    const resetQuotation = () => {
        setRequestedByName('');
        setRequestedByPhone('');
        setRequestedByEmail('');
        setNotes('');
        setSearchTerm('');
        setResult(null);
        setItems([]);
        setError('');
        setLastQuotation(null);
        setIsPrintModalOpen(false);
    };

    const handleSave = async () => {
        setError('');
        const cleanName = requestedByName.trim();
        if (!cleanName) {
            setError('Ingrese el nombre de la persona que solicita la cotización.');
            return;
        }

        if (items.length === 0) {
            setError('Agregue al menos un repuesto o artículo a la cotización.');
            return;
        }

        setIsSaving(true);
        try {
            const response = await api.post('/quotations', {
                requestedByName: cleanName,
                requestedByPhone: requestedByPhone.trim() || null,
                requestedByEmail: requestedByEmail.trim() || null,
                notes: notes.trim() || null,
                details: items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice
                }))
            });

            setLastQuotation(response.data);
            setIsPrintModalOpen(true);
        } catch (err: any) {
            const message = err?.response?.data?.message || 'No se pudo guardar la cotización.';
            setError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrintModal = () => {
        window.print();
    };

    return (
        <div className="k-page">
            <div className="k-page-header flex-col lg:flex-row lg:items-center">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="k-page-title">Cotización</h2>
                        <p className="k-page-subtitle">Crea una cotización formal con solicitante, repuestos y cantidades.</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={resetQuotation}
                    className="k-button-secondary w-full px-4 py-2 text-sm sm:w-fit"
                >
                    Nueva cotización
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                </div>
            )}

            {lastQuotation && (
                <div className="flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="font-bold text-green-800">Cotización guardada: {lastQuotation.quotationNumber}</p>
                        <p className="text-sm text-green-700">
                            Solicitante: {lastQuotation.requestedByName} - Total: {formatCurrency(lastQuotation.totalAmount)}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsPrintModalOpen(true)}
                        className="k-button-success w-full px-4 py-2 text-sm sm:w-fit"
                    >
                        <Printer size={18} />
                        Imprimir / PDF
                    </button>
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className="space-y-6">
                    <section className="k-card p-4">
                        <h3 className="mb-4 k-section-title">Datos del solicitante</h3>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="md:col-span-1">
                                <label className="mb-1 block text-sm font-medium text-slate-700">Nombre *</label>
                                <input
                                    type="text"
                                    value={requestedByName}
                                    onChange={(e) => setRequestedByName(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Persona o cliente"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
                                <input
                                    type="text"
                                    value={requestedByPhone}
                                    onChange={(e) => setRequestedByPhone(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Opcional"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Correo</label>
                                <input
                                    type="email"
                                    value={requestedByEmail}
                                    onChange={(e) => setRequestedByEmail(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Opcional"
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                placeholder="Observaciones, vigencia o condiciones de la cotización"
                            />
                        </div>
                    </section>

                    <section className="k-card p-4">
                        <h3 className="mb-4 k-section-title">Buscar repuestos o artículos</h3>
                        <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar por nombre, SKU o código..."
                                    className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSearching || !searchTerm.trim()}
                                className="k-button-primary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-55"
                            >
                                <PackageSearch size={18} />
                                {isSearching ? 'Buscando...' : 'Buscar'}
                            </button>
                        </form>
                    </section>

                    {result && (
                        <section className="k-card overflow-hidden">
                            <div className="k-panel-header flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h3 className="k-section-title">Resultado de búsqueda</h3>
                                    <p className="text-sm text-slate-500">
                                        "{result.searchTerm}" - {result.totalQuantity} unidades disponibles
                                    </p>
                                </div>
                                {result.foundInStock ? (
                                    <span className="k-badge k-badge-success w-fit">
                                        <CheckCircle size={16} />
                                        En existencia
                                    </span>
                                ) : (
                                    <span className="k-badge k-badge-danger w-fit">
                                        <XCircle size={16} />
                                        Sin existencia
                                    </span>
                                )}
                            </div>

                            {result.products.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    No se encontró ningún producto asociado a la búsqueda.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {result.products.map((product) => (
                                        <div key={product.productId} className="p-4">
                                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{product.name}</h4>
                                                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                                                        <span className="rounded-full bg-slate-100 px-2 py-1">SKU: {product.sku || 'N/A'}</span>
                                                        {product.barcode && (
                                                            <span className="rounded-full bg-slate-100 px-2 py-1">Código: {product.barcode}</span>
                                                        )}
                                                        <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                                                            Precio: {formatCurrency(product.price)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 md:justify-end">
                                                    <div className="text-left md:text-right">
                                                        <div className="text-2xl font-bold text-slate-800">{product.totalQuantity}</div>
                                                        <div className="text-xs uppercase text-slate-400">Disponibles</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => addItem(product)}
                                                        className="k-button-secondary px-3 py-2 text-sm"
                                                    >
                                                        <Plus size={16} />
                                                        Agregar
                                                    </button>
                                                </div>
                                            </div>

                                            {product.branches.length > 0 ? (
                                                <div className="mt-4 overflow-x-auto">
                                                    <table className="w-full border-collapse text-left text-sm">
                                                        <thead className="bg-gray-50 text-xs uppercase text-slate-500">
                                                            <tr>
                                                                <th className="border-b px-3 py-2">Bodega</th>
                                                                <th className="border-b px-3 py-2 text-right">Cantidad</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {product.branches.map((branch) => (
                                                                <tr key={`${product.productId}-${branch.branchId}`} className="border-b last:border-0">
                                                                    <td className="px-3 py-3 text-slate-700">{branch.branchName}</td>
                                                                    <td className="px-3 py-3 text-right font-semibold text-slate-800">{branch.quantity}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                                    Producto encontrado, pero sin cantidades disponibles en bodegas.
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </div>

                <aside className="k-card h-fit overflow-hidden xl:sticky xl:top-6">
                    <div className="k-panel-header">
                        <h3 className="k-section-title">Detalle de la cotización</h3>
                        <p className="text-sm text-slate-500">{items.length} item(s)</p>
                    </div>

                    {items.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">
                            Agrega repuestos desde la búsqueda para armar la cotización.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {items.map((item) => (
                                <div key={item.productId} className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h4 className="font-semibold text-slate-800">{item.name}</h4>
                                            <p className="text-xs text-slate-500">SKU: {item.sku || 'N/A'} - Disp: {item.availableQuantity}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.productId)}
                                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                                            title="Quitar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-500">Cantidad</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={item.quantity}
                                                onChange={(e) => updateItem(item.productId, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-500">Precio</label>
                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={item.unitPrice}
                                                onChange={(e) => updateItem(item.productId, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-3 text-right text-sm">
                                        <span className="text-slate-500">Subtotal: </span>
                                        <span className="font-bold text-slate-800">{formatCurrency(item.quantity * item.unitPrice)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="border-t bg-slate-50 p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-600">Total</span>
                            <span className="text-xl font-bold text-slate-900">{formatCurrency(totalAmount)}</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || items.length === 0}
                            className="k-button-primary w-full px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-55"
                        >
                            <Printer size={18} />
                            {isSaving ? 'Guardando...' : 'Guardar e imprimir PDF'}
                        </button>
                    </div>
                </aside>
            </div>

            {lastQuotation && isPrintModalOpen && (
                <>
                    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:items-center sm:p-4 print:static print:block print:bg-white print:p-0">
                        <div className="k-document max-h-[calc(100vh-1rem)] w-full max-w-4xl overflow-y-auto bg-white sm:max-h-[90vh] print:max-h-none print:w-full print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
                            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
                                <div>
                                    <h3 className="font-bold text-slate-800">Vista previa de cotización</h3>
                                    <p className="text-sm text-slate-500">{lastQuotation.quotationNumber}</p>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <button
                                        type="button"
                                        onClick={handlePrintModal}
                                        className="k-button-primary w-full px-4 py-2 text-sm sm:w-auto"
                                    >
                                        <Printer size={18} />
                                        Imprimir / PDF
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsPrintModalOpen(false)}
                                        className="k-button-secondary w-full px-3 py-2 text-sm sm:w-auto"
                                    >
                                        <X size={18} />
                                        Cerrar
                                    </button>
                                </div>
                            </div>

                            <div className="quotation-print-area bg-white p-4 text-black sm:p-8 print:p-0">
                                <div className="mb-8 flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">COTIZACIÓN</h1>
                                        <p className="mt-1 text-sm text-gray-600">No. {lastQuotation.quotationNumber}</p>
                                    </div>
                                    <div className="text-left text-sm text-gray-600 sm:text-right">
                                        Fecha: {new Date(lastQuotation.date).toLocaleString('es-CO')}
                                    </div>
                                </div>

                                <div className="mb-8 grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 print:border-gray-300 md:grid-cols-3">
                                    <div>
                                        <div className="text-xs font-bold uppercase text-gray-500">Solicitante</div>
                                        <div className="mt-1 break-words text-base font-semibold sm:text-lg">{lastQuotation.requestedByName}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold uppercase text-gray-500">Teléfono</div>
                                        <div className="mt-1">{lastQuotation.requestedByPhone || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold uppercase text-gray-500">Correo</div>
                                        <div className="mt-1 break-all">{lastQuotation.requestedByEmail || '-'}</div>
                                    </div>
                                </div>

                                <div className="mb-8 space-y-3 md:hidden print:hidden">
                                    {lastQuotation.details.map((detail) => (
                                        <div key={detail.id} className="rounded-lg border border-gray-200 p-3">
                                            <div className="font-semibold text-gray-900">{detail.productName}</div>
                                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                                                <span>SKU: {detail.sku || '-'}</span>
                                                {detail.barcode && <span>Código: {detail.barcode}</span>}
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <div className="text-xs font-bold uppercase text-gray-500">Cant.</div>
                                                    <div>{detail.quantity}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold uppercase text-gray-500">Disp.</div>
                                                    <div>{detail.availableQuantity}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold uppercase text-gray-500">Precio unit.</div>
                                                    <div>{formatCurrency(detail.unitPrice)}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-bold uppercase text-gray-500">Subtotal</div>
                                                    <div className="font-semibold">{formatCurrency(detail.subTotal)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex justify-between border-t pt-4 text-xl font-bold text-gray-900">
                                        <span>Total:</span>
                                        <span>{formatCurrency(lastQuotation.totalAmount)}</span>
                                    </div>
                                </div>

                                <div className="mb-8 hidden overflow-x-auto md:block print:block print:overflow-visible">
                                    <table className="w-full border-collapse text-left">
                                        <thead>
                                            <tr className="border-b-2 border-gray-900">
                                                <th className="py-2 pr-3 text-sm font-bold text-gray-700">Repuesto / artículo</th>
                                                <th className="py-2 text-sm font-bold text-gray-700">SKU</th>
                                                <th className="py-2 text-center text-sm font-bold text-gray-700">Cant.</th>
                                                <th className="py-2 text-center text-sm font-bold text-gray-700">Disp.</th>
                                                <th className="py-2 text-right text-sm font-bold text-gray-700">Precio unit.</th>
                                                <th className="py-2 text-right text-sm font-bold text-gray-700">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lastQuotation.details.map((detail) => (
                                                <tr key={detail.id} className="border-b border-gray-200">
                                                    <td className="py-3 pr-3">
                                                        <div className="font-medium">{detail.productName}</div>
                                                        {detail.barcode && <div className="text-xs text-gray-500">Código: {detail.barcode}</div>}
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
                                                <td className="pt-5 text-right text-xl font-bold text-gray-900">{formatCurrency(lastQuotation.totalAmount)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {lastQuotation.notes && (
                                    <div className="mb-8 rounded-lg border border-gray-200 p-4">
                                        <div className="mb-2 text-xs font-bold uppercase text-gray-500">Notas</div>
                                        <p className="whitespace-pre-wrap text-sm text-gray-700">{lastQuotation.notes}</p>
                                    </div>
                                )}

                                <div className="mt-12 border-t pt-4 text-center text-xs text-gray-500">
                                    <p>Documento generado por Kassa el {new Date().toLocaleString('es-CO')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <style>{`
                        @media print {
                            @page { margin: 18mm; }
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            body * { visibility: hidden !important; }
                            .quotation-print-area, .quotation-print-area * { visibility: visible !important; }
                            .quotation-print-area {
                                position: absolute !important;
                                left: 0;
                                top: 0;
                                width: 100%;
                            }
                        }
                    `}</style>
                </>
            )}
        </div>
    );
};

export default Quotations;

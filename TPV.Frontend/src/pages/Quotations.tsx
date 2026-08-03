import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/axios';
import { CheckCircle, FileText, Plus, Printer, Search, Trash2, X, XCircle } from 'lucide-react';

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
    const [selectedProduct, setSelectedProduct] = useState<ProductAvailability | null>(null);
    const [activeProductIndex, setActiveProductIndex] = useState(0);
    const [quickQuantity, setQuickQuantity] = useState('1');
    const [quickUnitPrice, setQuickUnitPrice] = useState('');
    const [items, setItems] = useState<QuoteItem[]>([]);
    const [lastQuotation, setLastQuotation] = useState<SavedQuotation | null>(null);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const quantityInputRef = useRef<HTMLInputElement | null>(null);
    const priceInputRef = useRef<HTMLInputElement | null>(null);
    const lastRecordedSearchRef = useRef('');

    const totalAmount = useMemo(
        () => items.reduce((total, item) => total + item.quantity * item.unitPrice, 0),
        [items]
    );

    const suggestedProducts = result?.products ?? [];

    useEffect(() => {
        const term = searchTerm.trim();

        if (selectedProduct) {
            setIsSearching(false);
            return;
        }

        if (term.length < 2) {
            setResult(null);
            setIsSearching(false);
            return;
        }

        let isCurrent = true;
        const delay = setTimeout(async () => {
            setIsSearching(true);
            setError('');

            try {
                const response = await api.get('/quotations/search', {
                    params: {
                        term,
                        recordHistory: false
                    }
                });

                if (isCurrent) {
                    setResult(response.data);
                }
            } catch (err: any) {
                if (isCurrent) {
                    const message = err?.response?.data?.message || 'No se pudo buscar el repuesto.';
                    setError(message);
                    setResult(null);
                }
            } finally {
                if (isCurrent) {
                    setIsSearching(false);
                }
            }
        }, 300);

        return () => {
            isCurrent = false;
            clearTimeout(delay);
        };
    }, [searchTerm, selectedProduct]);

    useEffect(() => {
        setActiveProductIndex(0);
    }, [result]);

    const recordSearchHistory = (term: string) => {
        const cleanTerm = term.trim();
        const normalized = cleanTerm.toLowerCase();
        if (cleanTerm.length < 2 || lastRecordedSearchRef.current === normalized) return;

        lastRecordedSearchRef.current = normalized;
        api.get('/quotations/search', {
            params: {
                term: cleanTerm,
                recordHistory: true
            }
        }).catch((err) => {
            console.error('Error recording quotation search', err);
        });
    };

    const clearProductCapture = (focusSearch = true) => {
        setSelectedProduct(null);
        setSearchTerm('');
        setResult(null);
        setActiveProductIndex(0);
        setQuickQuantity('1');
        setQuickUnitPrice('');

        if (focusSearch) {
            setTimeout(() => searchInputRef.current?.focus(), 0);
        }
    };

    const selectProductForCapture = (product: ProductAvailability) => {
        setSelectedProduct(product);
        setSearchTerm(`${product.sku} - ${product.name}`);
        setResult(null);
        setQuickQuantity('1');
        setQuickUnitPrice(String(product.price || 0));
        recordSearchHistory(searchTerm || product.sku || product.name);
        setTimeout(() => quantityInputRef.current?.focus(), 0);
    };

    const addCapturedItem = () => {
        if (!selectedProduct) {
            searchInputRef.current?.focus();
            return;
        }

        const quantity = Number(quickQuantity);
        const unitPrice = Number(quickUnitPrice);

        if (!Number.isFinite(quantity) || quantity <= 0) {
            setError('Ingrese una cantidad mayor a cero.');
            quantityInputRef.current?.focus();
            return;
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            setError('Ingrese un precio valido.');
            priceInputRef.current?.focus();
            return;
        }

        addItem(selectedProduct, quantity, unitPrice);
        clearProductCapture();
    };

    const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (suggestedProducts.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveProductIndex((current) => (current + 1) % suggestedProducts.length);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveProductIndex((current) => (current - 1 + suggestedProducts.length) % suggestedProducts.length);
            return;
        }

        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            selectProductForCapture(suggestedProducts[activeProductIndex] || suggestedProducts[0]);
        }
    };

    const handleQuickFieldKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addCapturedItem();
        }
    };

    const addItem = (product: ProductAvailability, quantity = 1, unitPrice = product.price) => {
        setError('');
        setLastQuotation(null);
        setIsPrintModalOpen(false);
        setItems((current) => {
            const existing = current.find((item) => item.productId === product.productId);
            if (existing) {
                return current.map((item) =>
                    item.productId === product.productId
                        ? { ...item, quantity: item.quantity + quantity, unitPrice }
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
                    quantity,
                    unitPrice
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
        setSelectedProduct(null);
        setActiveProductIndex(0);
        setQuickQuantity('1');
        setQuickUnitPrice('');
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
                        <div className="mb-4">
                            <h3 className="k-section-title">Repuestos o artículos</h3>
                            <p className="text-sm text-slate-500">Busca, selecciona, tabula cantidad/precio y agrega a la cotización.</p>
                        </div>

                        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 sm:p-4">
                            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(260px,1fr)_120px_150px_110px] xl:items-end">
                                <label className="space-y-1.5">
                                    <span className="text-xs font-extrabold uppercase tracking-wide text-slate-600">Buscar artículo</span>
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                setSelectedProduct(null);
                                                setQuickQuantity('1');
                                                setQuickUnitPrice('');
                                            }}
                                            onKeyDown={handleSearchKeyDown}
                                            onBlur={() => {
                                                if (!selectedProduct && result && result.products.length === 0) {
                                                    recordSearchHistory(searchTerm);
                                                }
                                            }}
                                            placeholder="Nombre, SKU o código"
                                            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pl-10 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                            autoComplete="off"
                                        />

                                        {suggestedProducts.length > 0 && !selectedProduct && (
                                            <div className="absolute left-0 right-0 z-20 mt-1 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                                                {suggestedProducts.map((product, index) => (
                                                    <button
                                                        key={product.productId}
                                                        type="button"
                                                        onMouseDown={(event) => {
                                                            event.preventDefault();
                                                            selectProductForCapture(product);
                                                        }}
                                                        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${index === activeProductIndex ? 'bg-blue-50 text-blue-900' : 'hover:bg-blue-50'}`}
                                                    >
                                                        <span className="min-w-0">
                                                            <span className="block truncate text-sm font-bold">{product.name}</span>
                                                            <span className="block text-xs text-slate-500">
                                                                {product.sku || 'N/A'} - Disp. {product.totalQuantity} - {formatCurrency(product.price)}
                                                            </span>
                                                        </span>
                                                        <Plus size={18} className="shrink-0 text-blue-700" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {isSearching && (
                                        <div className="text-xs font-semibold text-blue-700">Buscando coincidencias...</div>
                                    )}
                                    {!isSearching && searchTerm.trim().length >= 2 && result && suggestedProducts.length === 0 && !selectedProduct && (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                                            No hay coincidencias para esta búsqueda.
                                        </div>
                                    )}
                                    {selectedProduct && (
                                        <div className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                                            Seleccionado: <span className="text-slate-900">{selectedProduct.sku || 'N/A'}</span> - {selectedProduct.name}
                                        </div>
                                    )}
                                </label>

                                <label className="space-y-1.5">
                                    <span className="text-xs font-extrabold uppercase tracking-wide text-slate-600">Cantidad</span>
                                    <input
                                        ref={quantityInputRef}
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={quickQuantity}
                                        onChange={(e) => setQuickQuantity(e.target.value)}
                                        onKeyDown={handleQuickFieldKeyDown}
                                        disabled={!selectedProduct}
                                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-center text-sm font-bold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                                    />
                                </label>

                                <label className="space-y-1.5">
                                    <span className="text-xs font-extrabold uppercase tracking-wide text-slate-600">Precio unitario</span>
                                    <input
                                        ref={priceInputRef}
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={quickUnitPrice}
                                        onChange={(e) => setQuickUnitPrice(e.target.value)}
                                        onKeyDown={handleQuickFieldKeyDown}
                                        disabled={!selectedProduct}
                                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-right text-sm font-bold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                                        placeholder="0"
                                    />
                                </label>

                                <button
                                    type="button"
                                    onClick={addCapturedItem}
                                    disabled={!selectedProduct}
                                    className="flex h-11 w-full items-center justify-center rounded-lg border border-blue-300 bg-white text-3xl font-black leading-none text-blue-700 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                                    title="Agregar producto a la cotización"
                                    aria-label="Agregar producto a la cotización"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </section>

                    {selectedProduct && (
                        <section className="k-card overflow-hidden">
                            <div className="k-panel-header flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h3 className="k-section-title">Disponibilidad del artículo</h3>
                                    <p className="text-sm text-slate-500">
                                        {selectedProduct.name}
                                    </p>
                                </div>
                                {selectedProduct.totalQuantity > 0 ? (
                                    <span className="k-badge k-badge-success w-fit">
                                        <CheckCircle size={16} />
                                        {selectedProduct.totalQuantity} disponibles
                                    </span>
                                ) : (
                                    <span className="k-badge k-badge-danger w-fit">
                                        <XCircle size={16} />
                                        Sin existencia
                                    </span>
                                )}
                            </div>

                            {selectedProduct.branches.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-sm">
                                        <thead className="bg-gray-50 text-xs uppercase text-slate-500">
                                            <tr>
                                                <th className="border-b px-4 py-3">Bodega</th>
                                                <th className="border-b px-4 py-3 text-right">Cantidad</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedProduct.branches.map((branch) => (
                                                <tr key={`${selectedProduct.productId}-${branch.branchId}`} className="border-b last:border-0">
                                                    <td className="px-4 py-3 text-slate-700">{branch.branchName}</td>
                                                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{branch.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                                    Producto encontrado, pero sin cantidades disponibles en bodegas.
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

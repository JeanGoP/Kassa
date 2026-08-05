import { useState, useEffect } from 'react';
import api from '../api/axios';

interface OrderSummary {
    id: number;
    customerName: string;
    plate: string;
    intakeDateTime: string;
    status: string;
}

interface Product {
    id: number;
    name: string;
    sku: string;
    price: number;
    stockQuantity: number;
}

type DiscountType = 'NONE' | 'PERCENT' | 'FIXED';

interface PartItem {
    productId: number;
    productName: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    maxStock: number;
    discountType: DiscountType;
    discountValue: number;
    discountAmount: number;
    lineTotal: number;
    lineType: 'REPUESTO' | 'INSUMO';
    payer: 'CLIENTE' | 'FABRICA' | 'INTERNO';
    addsToCustomerTotal: boolean;
    serviceType: 'PREVENTIVO' | 'CORRECTIVO' | 'GARANTIA' | 'RETRABAJO';
    maintenanceReviewMileage: string;
    technician: string;
    estimatedTimeHours: string;
    actualTimeHours: string;
}

const ServiceOrderParts = () => {
    const [orderSearch, setOrderSearch] = useState('');
    const [searchingOrders, setSearchingOrders] = useState(false);
    const [orderResults, setOrderResults] = useState<OrderSummary[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);

    const [productSearch, setProductSearch] = useState('');
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);

    const [items, setItems] = useState<PartItem[]>([]);
    const [confirming, setConfirming] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (!productSearch || productSearch.trim().length < 2) {
            setProducts([]);
            return;
        }

        const timer = setTimeout(() => {
            fetchProducts();
        }, 300);

        return () => clearTimeout(timer);
    }, [productSearch]);

    const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
            const response = await api.get(`/sales/products?search=${encodeURIComponent(productSearch.trim())}`);
            setProducts(response.data);
        } catch (error) {
            console.error('Error fetching products', error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleSearchOrders = async () => {
        if (!orderSearch || orderSearch.trim().length < 2) {
            alert('Ingrese al menos 2 caracteres para buscar.');
            return;
        }

        setSearchingOrders(true);
        try {
            const response = await api.get(`/ServiceOrders?search=${encodeURIComponent(orderSearch.trim())}`);
            setOrderResults(response.data);
        } catch {
            alert('Error al buscar órdenes de servicio.');
        } finally {
            setSearchingOrders(false);
        }
    };

    const handleSelectOrder = (order: OrderSummary) => {
        setSelectedOrder(order);
        setItems([]);
        setSuccessMessage('');
    };

    const addProductToItems = (product: Product) => {
        if (product.stockQuantity <= 0) {
            alert('No hay stock disponible para este producto.');
            return;
        }

        setItems(prev => {
            const existing = prev.find(i => i.productId === product.id && i.discountType === 'NONE');
            if (existing) {
                if (existing.quantity + 1 > product.stockQuantity) {
                    alert(`No puede agregar más de ${product.stockQuantity} unidades.`);
                    return prev;
                }

                return prev.map(i =>
                    i === existing
                        ? recalculateLine({
                              ...i,
                              quantity: i.quantity + 1
                          })
                        : i
                );
            }

            const newItem: PartItem = {
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                unitPrice: product.price,
                quantity: 1,
                maxStock: product.stockQuantity,
                discountType: 'NONE',
                discountValue: 0,
                discountAmount: 0,
                lineTotal: product.price,
                lineType: 'REPUESTO',
                payer: 'CLIENTE',
                addsToCustomerTotal: true,
                serviceType: 'CORRECTIVO',
                maintenanceReviewMileage: '',
                technician: '',
                estimatedTimeHours: '',
                actualTimeHours: ''
            };

            return [...prev, newItem];
        });
    };

    const recalculateLine = (item: PartItem): PartItem => {
        const quantity = item.quantity > 0 ? item.quantity : 1;
        const base = item.unitPrice * quantity;
        let discountAmount = 0;

        if (item.discountType === 'PERCENT' && item.discountValue > 0) {
            const percent = Math.min(Math.max(item.discountValue, 0), 100);
            discountAmount = parseFloat((base * (percent / 100)).toFixed(2));
        } else if (item.discountType === 'FIXED' && item.discountValue > 0) {
            const maxDiscount = base;
            discountAmount = Math.min(item.discountValue, maxDiscount);
        }

        const lineTotal = base - discountAmount;

        return {
            ...item,
            quantity,
            discountAmount,
            lineTotal
        };
    };

    const updateItemQuantity = (index: number, value: string) => {
        const quantity = parseInt(value || '0', 10);
        if (Number.isNaN(quantity) || quantity <= 0) return;

        setItems(prev =>
            prev.map((item, i) => {
                if (i === index) {
                    if (quantity > item.maxStock) {
                        alert(`No puede superar el stock disponible (${item.maxStock}).`);
                        return recalculateLine({ ...item, quantity: item.maxStock });
                    }
                    return recalculateLine({ ...item, quantity });
                }
                return item;
            })
        );
    };

    const updateItemDiscountType = (index: number, type: DiscountType) => {
        setItems(prev =>
            prev.map((item, i) =>
                i === index
                    ? recalculateLine({
                          ...item,
                          discountType: type,
                          discountValue: 0
                      })
                    : item
            )
        );
    };

    const updateItemDiscountValue = (index: number, value: string) => {
        const parsed = parseFloat(value || '0');
        if (Number.isNaN(parsed) || parsed < 0) return;

        setItems(prev =>
            prev.map((item, i) =>
                i === index ? recalculateLine({ ...item, discountValue: parsed }) : item
            )
        );
    };

    const removeItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const updateItemMetadata = (index: number, changes: Partial<PartItem>) => {
        setItems(prev => prev.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
    };

    const totalBeforeDiscount = items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
    );
    const totalDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
    const totalAfterDiscount = items.filter(item => item.addsToCustomerTotal).reduce((sum, item) => sum + item.lineTotal, 0);

    const handleConfirmParts = () => {
        if (!selectedOrder) {
            alert('Seleccione una orden de servicio primero.');
            return;
        }
        if (items.length === 0) {
            alert('Agregue al menos un repuesto o insumo.');
            return;
        }
        setShowConfirmModal(true);
    };

    const executeConfirmParts = async () => {
        if (!selectedOrder) return;

        setConfirming(true);
        setSuccessMessage('');

        try {
            const payload = {
                items: items.map(i => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    discountType: i.discountType,
                    discountValue: i.discountValue,
                    lineType: i.lineType,
                    payer: i.payer,
                    addsToCustomerTotal: i.addsToCustomerTotal,
                    serviceType: i.serviceType,
                    maintenanceReviewMileage: i.maintenanceReviewMileage ? Number(i.maintenanceReviewMileage) : null,
                    technician: i.technician || null,
                    estimatedTimeHours: i.estimatedTimeHours ? Number(i.estimatedTimeHours) : null,
                    actualTimeHours: i.actualTimeHours ? Number(i.actualTimeHours) : null
                }))
            };

            const response = await api.post(`/ServiceOrders/${selectedOrder.id}/parts/confirm`, payload);
            const data = response.data;

            setItems([]);
            setShowConfirmModal(false);

            const messageParts = [];

            if (data.invoiceNumber) {
                messageParts.push(`Factura: ${data.invoiceNumber}`);
            }
            if (data.total) {
                messageParts.push(`Total repuestos: $${data.total.toFixed(2)}`);
            }

            setSuccessMessage(
                messageParts.length > 0
                    ? `Repuestos confirmados correctamente. ${messageParts.join(' • ')}`
                    : 'Repuestos confirmados correctamente.'
            );
        } catch (error: any) {
            console.error('Error al confirmar repuestos', error);
            const backendMessage = error.response?.data?.message || error.response?.data;
            const message =
                typeof backendMessage === 'string'
                    ? backendMessage
                    : 'No se pudieron confirmar los repuestos. Verifique stock y vuelva a intentar.';
            alert(message);
        } finally {
            setConfirming(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Repuestos e Insumos</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Seleccione repuestos desde el inventario y asócielos a la orden de servicio.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Buscar orden de servicio (cliente, placa o técnico)
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={orderSearch}
                            onChange={(e) => setOrderSearch(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ej: placa, nombre del cliente o técnico"
                        />
                        <button
                            type="button"
                            onClick={handleSearchOrders}
                            disabled={searchingOrders}
                            className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {searchingOrders ? 'Buscando...' : 'Buscar'}
                        </button>
                    </div>
                </div>

                {orderResults.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 border-b border-slate-200 text-sm font-semibold text-slate-700">
                            Resultados de búsqueda
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orden</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha ingreso</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placa</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                        <th className="px-4 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {orderResults.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                                                #{order.id}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                                                {new Date(order.intakeDateTime).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                                                {order.plate}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                                                {order.customerName}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSelectOrder(order)}
                                                    className="px-3 py-1 rounded-lg border border-blue-600 text-blue-600 text-xs font-semibold hover:bg-blue-50"
                                                >
                                                    Seleccionar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {selectedOrder && (
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                            <div className="font-semibold mb-1">Orden seleccionada</div>
                            <div>
                                #{selectedOrder.id} • {selectedOrder.customerName} • Placa {selectedOrder.plate}
                            </div>
                        </div>

                        {selectedOrder.status === 'FINALIZADA' && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                                <strong>Orden Finalizada:</strong> No es posible agregar o modificar repuestos en una orden finalizada.
                            </div>
                        )}

                        {selectedOrder.status !== 'FINALIZADA' && (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                                <div className="flex flex-col md:flex-row md:items-end gap-3">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Buscar repuesto o insumo
                                        </label>
                                        <input
                                            type="text"
                                            value={productSearch}
                                            onChange={(e) => setProductSearch(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Ej: nombre, SKU"
                                        />
                                    </div>
                                </div>

                                {productSearch.trim().length >= 2 && (
                                    <div className="bg-white border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
                                        <table className="min-w-full divide-y divide-gray-200 text-xs md:text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-medium text-gray-500">SKU</th>
                                                    <th className="px-3 py-2 text-left font-medium text-gray-500">Nombre</th>
                                                    <th className="px-3 py-2 text-right font-medium text-gray-500">Stock</th>
                                                    <th className="px-3 py-2 text-right font-medium text-gray-500">Precio</th>
                                                    <th className="px-3 py-2"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {loadingProducts && (
                                                    <tr>
                                                        <td colSpan={5} className="px-3 py-3 text-center text-gray-400">
                                                            Cargando productos...
                                                        </td>
                                                    </tr>
                                                )}
                                                {!loadingProducts && products.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-3 py-3 text-center text-gray-400">
                                                            No se encontraron productos.
                                                        </td>
                                                    </tr>
                                                )}
                                                {products.map((product) => (
                                                    <tr key={product.id} className="hover:bg-gray-50">
                                                        <td className="px-3 py-2 whitespace-nowrap text-gray-700">{product.sku}</td>
                                                        <td className="px-3 py-2 text-gray-700">{product.name}</td>
                                                        <td className={`px-3 py-2 text-right ${product.stockQuantity <= 0 ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                                                            {product.stockQuantity}
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-gray-700">
                                                            ${product.price.toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => addProductToItems(product)}
                                                                disabled={product.stockQuantity <= 0}
                                                                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                                                                    product.stockQuantity > 0
                                                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                                }`}
                                                            >
                                                                {product.stockQuantity > 0 ? 'Agregar' : 'Sin Stock'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-slate-800">
                                    Repuestos e insumos seleccionados
                                </h2>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-xs md:text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium text-gray-500">SKU</th>
                                            <th className="px-3 py-2 text-left font-medium text-gray-500">Producto</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-500">Cantidad</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-500">Precio</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-500">Tipo desc.</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-500">Valor desc.</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-500">Desc. $</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-500">Subtotal</th>
                                            <th className="px-3 py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {items.length === 0 && (
                                            <tr>
                                                <td colSpan={9} className="px-3 py-4 text-center text-gray-400">
                                                    No hay repuestos agregados.
                                                </td>
                                            </tr>
                                        )}
                                        {items.map((item, index) => (
                                            <tr key={`${item.productId}-${index}`} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                                                    {item.sku}
                                                </td>
                                                <td className="px-3 py-2 text-gray-700">
                                                    {item.productName}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={item.quantity}
                                                        onChange={(e) => updateItemQuantity(index, e.target.value)}
                                                        className="w-16 border border-gray-300 rounded px-2 py-1 text-right text-xs md:text-sm"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right text-gray-700">
                                                    ${item.unitPrice.toFixed(2)}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <select
                                                        value={item.discountType}
                                                        onChange={(e) => updateItemDiscountType(index, e.target.value as DiscountType)}
                                                        className="border border-gray-300 rounded px-2 py-1 text-xs md:text-sm"
                                                    >
                                                        <option value="NONE">Sin desc.</option>
                                                        <option value="PERCENT">%.</option>
                                                        <option value="FIXED">$</option>
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={item.discountValue || ''}
                                                        onChange={(e) => updateItemDiscountValue(index, e.target.value)}
                                                        className="w-20 border border-gray-300 rounded px-2 py-1 text-right text-xs md:text-sm"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right text-gray-700">
                                                    ${item.discountAmount.toFixed(2)}
                                                </td>
                                                <td className="px-3 py-2 text-right text-gray-700 font-semibold">
                                                    ${item.lineTotal.toFixed(2)}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="text-xs text-red-600 hover:text-red-800 font-semibold"
                                                    >
                                                        Quitar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {items.length > 0 && <div className="space-y-3 border-t border-slate-200 pt-4">
                                <h3 className="text-xs font-bold uppercase text-slate-600">DATOS MCH POR LÍNEA</h3>
                                {items.map((item, index) => <div key={`metadata-${item.productId}-${index}`} className="grid gap-3 border-b border-slate-100 pb-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="sm:col-span-2 lg:col-span-4 text-sm font-semibold text-slate-800">{item.sku} · {item.productName}</div>
                                    <label className="text-xs font-semibold text-slate-600">TIPO DE LÍNEA<select value={item.lineType} onChange={e => updateItemMetadata(index, { lineType: e.target.value as PartItem['lineType'] })} className="mt-1 w-full rounded border border-slate-300 px-2 py-2"><option value="REPUESTO">REPUESTO</option><option value="INSUMO">INSUMO</option></select></label>
                                    <label className="text-xs font-semibold text-slate-600">QUIÉN PAGA<select value={item.payer} onChange={e => updateItemMetadata(index, { payer: e.target.value as PartItem['payer'] })} className="mt-1 w-full rounded border border-slate-300 px-2 py-2"><option value="CLIENTE">CLIENTE</option><option value="FABRICA">FÁBRICA</option><option value="INTERNO">INTERNO</option></select></label>
                                    <label className="text-xs font-semibold text-slate-600">TIPO DE SERVICIO<select value={item.serviceType} onChange={e => updateItemMetadata(index, { serviceType: e.target.value as PartItem['serviceType'], maintenanceReviewMileage: e.target.value === 'PREVENTIVO' ? item.maintenanceReviewMileage : '' })} className="mt-1 w-full rounded border border-slate-300 px-2 py-2"><option value="PREVENTIVO">PREVENTIVO</option><option value="CORRECTIVO">CORRECTIVO</option><option value="GARANTIA">GARANTÍA</option><option value="RETRABAJO">RETRABAJO</option></select></label>
                                    <label className="text-xs font-semibold text-slate-600">REVISIÓN (KM)<input type="number" min="1" required={item.serviceType === 'PREVENTIVO'} disabled={item.serviceType !== 'PREVENTIVO'} value={item.maintenanceReviewMileage} onChange={e => updateItemMetadata(index, { maintenanceReviewMileage: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-2 disabled:bg-slate-100" /></label>
                                    <label className="text-xs font-semibold text-slate-600">TÉCNICO<input value={item.technician} onChange={e => updateItemMetadata(index, { technician: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-2" /></label>
                                    <label className="text-xs font-semibold text-slate-600">TIEMPO ESTIMADO<input type="number" min="0" step="0.25" value={item.estimatedTimeHours} onChange={e => updateItemMetadata(index, { estimatedTimeHours: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-2" /></label>
                                    <label className="text-xs font-semibold text-slate-600">TIEMPO REAL<input type="number" min="0" step="0.25" value={item.actualTimeHours} onChange={e => updateItemMetadata(index, { actualTimeHours: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-2" /></label>
                                    <label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={item.addsToCustomerTotal} onChange={e => updateItemMetadata(index, { addsToCustomerTotal: e.target.checked })} className="h-5 w-5 rounded text-blue-600" /> SUMA A FACTURA</label>
                                </div>)}
                            </div>}

                            <div className="flex flex-col md:flex-row md:justify-end gap-4 mt-4">
                                <div className="md:text-right text-sm space-y-1">
                                    <div className="text-gray-600">
                                        Total bruto:{' '}
                                        <span className="font-semibold text-gray-800">
                                            ${totalBeforeDiscount.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="text-gray-600">
                                        Descuento total:{' '}
                                        <span className="font-semibold text-rose-600">
                                            -${totalDiscount.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="text-gray-800 font-bold text-base">
                                        Total repuestos:{' '}
                                        <span>
                                            ${totalAfterDiscount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mt-4">
                                <div className="text-xs text-gray-500">
                                    Al confirmar se registrará la salida de inventario y la venta asociada a la orden.
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        type="button"
                                        onClick={handleConfirmParts}
                                        disabled={items.length === 0 || confirming || selectedOrder.status === 'FINALIZADA'}
                                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {confirming ? 'Confirmando...' : 'Confirmar repuestos'}
                                    </button>
                                </div>
                            </div>

                            {successMessage && (
                                <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                                    {successMessage}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white p-4 shadow-xl sm:p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-2">
                            Confirmar repuestos e insumos
                        </h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Se actualizará el inventario y se generará el registro de facturación para los repuestos seleccionados.
                        </p>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total bruto:</span>
                                <span className="font-semibold text-gray-800">
                                    ${totalBeforeDiscount.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Descuento total:</span>
                                <span className="font-semibold text-rose-600">
                                    -${totalDiscount.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-gray-800 font-semibold">Total repuestos:</span>
                                <span className="font-bold text-gray-900">
                                    ${totalAfterDiscount.toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={executeConfirmParts}
                                disabled={confirming}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {confirming ? 'Procesando...' : 'Confirmar y afectar inventario'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceOrderParts;

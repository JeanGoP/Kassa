import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { calculateNitVerificationDigit } from '../utils/nit';
import AddressBuilder from '../components/AddressBuilder';
import { Search, Plus, Minus, Trash2, CreditCard, ShoppingCart, User, X, Check, Printer, UserPlus, MapPin, Banknote, Landmark, WalletCards, FileText } from 'lucide-react';
import { clsx } from 'clsx';

interface Product {
    id: number;
    name: string;
    sku: string;
    price: number;
    stockQuantity: number;
    ivaRate: number;
    impoconsumoRate: number;
    priceIncludesIva: boolean;
    saleUnitId?: number;
    saleUnitCode?: string;
    allowsFractionalQuantity?: boolean;
}

interface CartItem extends Product {
    quantity: number;
    quotationDetailId?: number;
    maximumQuantity?: number;
    discountType: 'NONE' | 'PERCENT' | 'FIXED';
    discountValue: number;
}

interface Customer {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    taxId: string;
    identificationType: string;
}

interface NewCustomer {
    firstName1: string;
    firstName2: string;
    lastName1: string;
    lastName2: string;
    email: string;
    phone: string;
    address: string;
    taxId: string;
    identificationType: string;
}

const IDENTIFICATION_TYPES = [
    "RCN Registro Civil de Nacimiento",
    "TI Tarjeta de Identidad",
    "CC Cédula de Ciudadanía",
    "CD Cédula Digital",
    "CE Cédula de Extranjería",
    "PA Pasaporte",
    "PEP Permiso Especial de Permanencia",
    "PPT Permiso por Protección Temporal",
    "NUIP Número Único de Identificación Personal",
    "NIT Número de Identificación Tributaria"
];

interface SaleResult {
    saleId: number;
    invoiceNumber: string;
    date: string;
    totalAmount: number;
    paymentMethod: string;
    amountReceived: number;
    customerAdvanceApplied: number;
    customerAdvanceCreated: number;
    changeAmount: number;
    customerAdvanceBalance: number;
    customerName?: string;
    quotationId?: number;
    quotationNumber?: string;
    cufe?: string;
    qrCode?: string;
    items: {
        productName: string;
        quantity: number;
        unitPrice: number;
        subTotal: number;
    }[];
}

interface SourceQuotation {
    id: number;
    quotationNumber: string;
    requestedByName: string;
    customerId?: number | null;
    customerName?: string | null;
    status: 'PENDIENTE' | 'PARCIAL' | 'COMPLETADA';
    totalAmount: number;
    invoicedAmount: number;
    pendingAmount: number;
    details: {
        id: number;
        productId: number;
        productName: string;
        sku: string;
        unitPrice: number;
        pendingQuantity: number;
    }[];
}

const POS = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const quotationId = Number(searchParams.get('quotationId')) || null;
    // Products & Cart
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [sourceQuotation, setSourceQuotation] = useState<SourceQuotation | null>(null);
    const [quotationError, setQuotationError] = useState('');

    // Customers
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);

    // Checkout & Modals
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [amountPaid, setAmountPaid] = useState(0);
    const [customerAdvanceBalance, setCustomerAdvanceBalance] = useState(0);
    const [advanceToApply, setAdvanceToApply] = useState(0);
    const [saveExcessAsAdvance, setSaveExcessAsAdvance] = useState(false);
    const [lastSale, setLastSale] = useState<SaleResult | null>(null);
    const [processing, setProcessing] = useState(false);

    // Create Customer Modal
    const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
    const [showAddressBuilder, setShowAddressBuilder] = useState(false);
    const [personType, setPersonType] = useState<'Natural' | 'Juridica'>('Natural');
    const [newCustomer, setNewCustomer] = useState<NewCustomer>({
        firstName1: '',
        firstName2: '',
        lastName1: '',
        lastName2: '',
        email: '',
        phone: '',
        address: '',
        taxId: '',
        identificationType: ''
    });
    const [creatingCustomer, setCreatingCustomer] = useState(false);

    const { subTotal, taxAmount, total, totalDiscount } = cart.reduce((acc, item) => {
        const quantity = item.quantity;
        const price = item.price;
        const ivaRate = item.ivaRate || 0;
        const impoRate = item.impoconsumoRate || 0;
        const totalTaxRate = ivaRate + impoRate;
        const listedAmount = price * quantity;
        const discount = item.discountType === 'PERCENT'
            ? listedAmount * (Math.min(Math.max(item.discountValue, 0), 100) / 100)
            : item.discountType === 'FIXED' ? Math.min(Math.max(item.discountValue, 0), listedAmount) : 0;
        
        let itemSubTotal = 0;
        let itemTax = 0;
        let itemTotal = 0;

        if (item.priceIncludesIva) {
            // Price is the final price (includes tax)
            itemTotal = listedAmount - discount;
            // Base = Total / (1 + Rate)
            itemSubTotal = itemTotal / (1 + (totalTaxRate / 100));
            itemTax = itemTotal - itemSubTotal;
        } else {
            // Price is the base price (excludes tax)
            itemSubTotal = listedAmount - discount;
            itemTax = itemSubTotal * (totalTaxRate / 100);
            itemTotal = itemSubTotal + itemTax;
        }

        return {
            subTotal: acc.subTotal + itemSubTotal,
            taxAmount: acc.taxAmount + itemTax,
            total: acc.total + itemTotal,
            totalDiscount: acc.totalDiscount + discount
        };
    }, { subTotal: 0, taxAmount: 0, total: 0, totalDiscount: 0 });

    const roundedTotal = Number(total.toFixed(2));
    const appliedAdvance = Math.min(
        Math.max(0, advanceToApply),
        Math.max(0, customerAdvanceBalance),
        roundedTotal
    );
    const amountDue = Math.max(0, roundedTotal - appliedAdvance);
    const paymentExcess = Math.max(0, amountPaid - amountDue);
    const changeAmount = saveExcessAsAdvance && selectedCustomer ? 0 : paymentExcess;

    // --- Effects ---
    useEffect(() => {
        if (quotationId) return;

        const timer = setTimeout(() => {
            fetchProducts();
        }, 300);

        return () => clearTimeout(timer);
    }, [productSearch, quotationId]);

    // Update the tendered amount for electronic payments and applied advances.
    useEffect(() => {
        if (paymentMethod !== 'Cash') {
            setAmountPaid(amountDue);
        }
    }, [paymentMethod, amountDue]);

    useEffect(() => {
        let isCurrent = true;

        if (!selectedCustomer) {
            setCustomerAdvanceBalance(0);
            setAdvanceToApply(0);
            setSaveExcessAsAdvance(false);
            return;
        }

        setAdvanceToApply(0);
        setSaveExcessAsAdvance(false);
        api.get(`/CustomerAdvances/customer/${selectedCustomer.id}/balance`)
            .then(response => {
                if (isCurrent) setCustomerAdvanceBalance(Number(response.data?.balance) || 0);
            })
            .catch(error => {
                console.error('Error fetching customer advance balance', error);
                if (isCurrent) setCustomerAdvanceBalance(0);
            });

        return () => {
            isCurrent = false;
        };
    }, [selectedCustomer?.id]);

    useEffect(() => {
        if (customerSearch.length > 2) {
            const timer = setTimeout(() => {
                fetchCustomers();
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setCustomers([]);
        }
    }, [customerSearch]);

    useEffect(() => {
        let isCurrent = true;
        if (!quotationId) {
            setSourceQuotation(null);
            setQuotationError('');
            return;
        }

        const loadQuotation = async () => {
            setLoadingProducts(true);
            setQuotationError('');
            try {
                const [quotationResponse, productResponse] = await Promise.all([
                    api.get(`/quotations/${quotationId}`),
                    api.get('/sales/products', { params: { search: '' } })
                ]);
                if (!isCurrent) return;

                const quotation = quotationResponse.data as SourceQuotation;
                if (quotation.status === 'COMPLETADA') {
                    setSourceQuotation(quotation);
                    setCart([]);
                    setQuotationError('Esta cotización ya fue facturada completamente.');
                    return;
                }

                const branchProducts = productResponse.data as Product[];
                setProducts(branchProducts);
                setSourceQuotation(quotation);

                const unavailable: string[] = [];
                const quotedCart = quotation.details
                    .filter(detail => detail.pendingQuantity > 0)
                    .flatMap(detail => {
                        const product = branchProducts.find(candidate => candidate.id === detail.productId);
                        const available = Math.max(0, Number(product?.stockQuantity) || 0);
                        const quantity = Math.min(detail.pendingQuantity, available);
                        if (!product || quantity <= 0) {
                            unavailable.push(detail.productName);
                            return [];
                        }

                        return [{
                            ...product,
                            price: detail.unitPrice,
                            quantity,
                            quotationDetailId: detail.id,
                            maximumQuantity: detail.pendingQuantity,
                            discountType: 'NONE' as const,
                            discountValue: 0
                        }];
                    });

                setCart(quotedCart);
                if (unavailable.length > 0) {
                    setQuotationError(`Sin existencia en esta sucursal: ${unavailable.join(', ')}. Esas líneas permanecen pendientes.`);
                }

                if (quotation.customerId) {
                    const customerResponse = await api.get(`/customers/${quotation.customerId}`);
                    if (isCurrent) setSelectedCustomer(customerResponse.data);
                } else {
                    setSelectedCustomer(null);
                    setCustomerSearch(quotation.requestedByName);
                    setShowCustomerSearch(true);
                }
            } catch {
                if (!isCurrent) return;
                setSourceQuotation(null);
                setCart([]);
                setQuotationError('No se pudo preparar la cotización para facturar.');
            } finally {
                if (isCurrent) setLoadingProducts(false);
            }
        };

        loadQuotation();
        return () => {
            isCurrent = false;
        };
    }, [quotationId]);

    // --- Data Fetching ---
    const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
            const response = await api.get(`/sales/products?search=${productSearch}`);
            setProducts(response.data);
        } catch (error) {
            console.error("Error fetching products", error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await api.get(`/customers?search=${customerSearch}`);
            setCustomers(response.data);
        } catch (error) {
            console.error("Error fetching customers", error);
        }
    };

    // --- Cart Actions ---
    const addToCart = (product: Product) => {
        if (sourceQuotation) return;
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1, discountType: 'NONE', discountValue: 0 }];
        });
    };

    const updateQuantity = (id: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const maximum = Math.min(
                    item.maximumQuantity ?? Number.POSITIVE_INFINITY,
                    item.stockQuantity ?? Number.POSITIVE_INFINITY
                );
                const newQty = Math.min(maximum, Math.max(1, item.quantity + delta));
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (id: number) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    // --- Checkout Logic ---
    const handleInitiateCheckout = () => {
        if (cart.length === 0) return;
        if (sourceQuotation && !selectedCustomer) {
            alert('Selecciona o crea el cliente de la cotización antes de facturar.');
            setShowCustomerSearch(true);
            return;
        }
        setAdvanceToApply(0);
        setSaveExcessAsAdvance(false);
        setAmountPaid(roundedTotal);
        setShowPaymentModal(true);
    };

    const handleCreateCustomer = async () => {
        const isJuridica = personType === 'Juridica';

        if (isJuridica) {
            if (!newCustomer.firstName1) {
                alert("Razón Social es obligatoria");
                return;
            }
        } else {
            if (!newCustomer.firstName1 || !newCustomer.lastName1) {
                alert("Primer Nombre y Primer Apellido son obligatorios");
                return;
            }
        }

        setCreatingCustomer(true);
        try {
            const payload = {
                firstName: isJuridica 
                    ? newCustomer.firstName1.trim()
                    : `${newCustomer.firstName1} ${newCustomer.firstName2}`.trim(),
                lastName: isJuridica
                    ? "."
                    : `${newCustomer.lastName1} ${newCustomer.lastName2}`.trim(),
                email: newCustomer.email,
                phone: newCustomer.phone,
                address: newCustomer.address,
                taxId: newCustomer.taxId,
                identificationType: newCustomer.identificationType
            };

            const response = await api.post('/customers', payload);
            const createdCustomer = response.data;
            
            setCustomers([createdCustomer]);
            setSelectedCustomer(createdCustomer);
            setShowCreateCustomerModal(false);
            setCustomerSearch('');
            setPersonType('Natural');
            setNewCustomer({
                firstName1: '',
                firstName2: '',
                lastName1: '',
                lastName2: '',
                email: '',
                phone: '',
                address: '',
                taxId: '',
                identificationType: ''
            });
        } catch (error) {
            console.error("Error creating customer", error);
            alert("Error al crear el cliente.");
        } finally {
            setCreatingCustomer(false);
        }
    };

    const processSale = async () => {
        if (cart.length === 0) return;
        if (saveExcessAsAdvance && paymentExcess > 0 && !selectedCustomer) {
            alert('Selecciona un cliente para guardar el excedente como anticipo.');
            return;
        }
        
        setProcessing(true);
        try {
            const payload = {
                branchId: 0, // 0 lets the backend use the default branch
                customerId: selectedCustomer?.id || null,
                quotationId: sourceQuotation?.id || null,
                items: cart.map(item => ({
                    productId: item.id,
                    quotationDetailId: item.quotationDetailId || null,
                    quantity: item.quantity,
                    unitOfMeasureId: item.saleUnitId,
                    discountType: item.discountType,
                    discountValue: item.discountValue
                })),
                paymentMethod,
                amountReceived: amountPaid,
                advanceAmountToApply: appliedAdvance,
                createAdvanceFromExcess: saveExcessAsAdvance && paymentExcess > 0
            };

            const response = await api.post('/sales/checkout', payload);
            setLastSale(response.data);
            setCart([]);
            setSelectedCustomer(null);
            setSearchParams({}, { replace: true });
            setShowPaymentModal(false);
            setShowTicketModal(true);
            fetchProducts();
        } catch (error: any) {
            console.error("Error creating sale:", error);
            const errorMessage = error.response?.data || error.message || "Error desconocido";
            alert(`Error al procesar la venta: ${errorMessage}`);
        } finally {
            setProcessing(false);
        }
    };

    const handleRetryInvoice = async () => {
        if (!lastSale) return;
        setProcessing(true);
        try {
            const response = await api.post(`/sales/${lastSale.saleId}/emit-invoice`);
            setLastSale(response.data);
        } catch (error) {
            console.error("Error retrying invoice:", error);
            alert("Error al emitir factura");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-4 sm:p-2">
            {(sourceQuotation || quotationError) && (
                <section className="w-full flex-none rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-white p-2 text-blue-700"><FileText size={22} /></div>
                            <div>
                                <div className="font-extrabold text-slate-900">
                                    {sourceQuotation ? `Venta desde ${sourceQuotation.quotationNumber}` : 'Cotización no disponible'}
                                </div>
                                {sourceQuotation && (
                                    <p className="mt-1 text-sm text-slate-600">
                                        {sourceQuotation.requestedByName} · Estado {sourceQuotation.status} · Pendiente ${sourceQuotation.pendingAmount.toLocaleString('es-CO')}
                                    </p>
                                )}
                                {quotationError && <p className="mt-1 text-sm font-semibold text-amber-800">{quotationError}</p>}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setCart([]);
                                setSourceQuotation(null);
                                setQuotationError('');
                                setSearchParams({}, { replace: true });
                            }}
                            className="k-button-secondary w-full px-4 py-2 text-sm md:w-auto"
                        >
                            <X size={17} />
                            Cancelar conversión
                        </button>
                    </div>
                </section>
            )}
            <div className="flex min-h-[calc(100vh-96px)] flex-col gap-4 xl:h-[calc(100vh-96px)] xl:flex-row">
            {/* LEFT: Product Catalog */}
            <div className="k-card flex min-h-[520px] flex-1 flex-col overflow-hidden p-3 sm:p-4 xl:min-h-0">
                <div className="mb-4 relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar productos (Nombre o SKU)..." 
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 transition-all"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        disabled={Boolean(sourceQuotation)}
                    />
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2">
                    {loadingProducts ? (
                        <div className="flex justify-center items-center h-40 text-gray-400">Cargando productos...</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4">
                            {products.map(product => (
                                <div 
                                    key={product.id} 
                                    className={clsx(
                                        "group rounded-lg border border-slate-200 bg-white p-3 transition-all sm:p-4",
                                        sourceQuotation ? "cursor-default opacity-60" : "cursor-pointer hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
                                    )}
                                    onClick={() => addToCart(product)}
                                >
                                    <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-slate-50 text-gray-300 transition-colors group-hover:bg-blue-50 sm:h-28">
                                        <div className="text-center">
                                            <span className="text-2xl font-bold text-gray-200 group-hover:text-blue-200">IMG</span>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-gray-800 truncate" title={product.name}>{product.name}</h3>
                                    <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-base font-bold text-blue-600 sm:text-lg">${product.price.toFixed(2)}</span>
                                        <span className={clsx("k-badge", product.stockQuantity > 0 ? "k-badge-success" : "k-badge-danger")}>
                                            {product.stockQuantity} stock
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Cart & Checkout */}
            <div className="k-card flex w-full flex-col overflow-hidden xl:w-96 xl:shrink-0">
                {/* Customer Section */}
                <div className="p-4 bg-slate-50 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="font-bold text-slate-700 flex items-center text-sm uppercase tracking-wide">
                            <User size={16} className="mr-2" /> Cliente
                        </h2>
                        {selectedCustomer && !sourceQuotation?.customerId && (
                            <button onClick={() => setSelectedCustomer(null)} className="text-xs text-red-500 hover:text-red-700 flex items-center">
                                <X size={12} className="mr-1" /> Quitar
                            </button>
                        )}
                    </div>
                    
                    {!selectedCustomer ? (
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                className="w-full pl-3 pr-8 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={customerSearch}
                                onChange={(e) => {
                                    setCustomerSearch(e.target.value);
                                    setShowCustomerSearch(true);
                                }}
                                onFocus={() => setShowCustomerSearch(true)}
                            />
                            <Search size={16} className="absolute right-3 top-2.5 text-gray-400" />
                            
                            {/* Customer Dropdown */}
                            {showCustomerSearch && (
                                <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-lg mt-1 border border-gray-100 z-10 max-h-60 overflow-y-auto">
                                    {customers.length > 0 ? (
                                        customers.map(c => (
                                            <div 
                                                key={c.id}
                                                className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                onClick={() => {
                                                    setSelectedCustomer(c);
                                                    setShowCustomerSearch(false);
                                                    setCustomerSearch('');
                                                }}
                                            >
                                                <div className="font-bold text-sm text-gray-800">{c.firstName} {c.lastName}</div>
                                                <div className="text-xs text-gray-500">{c.taxId || 'Sin ID'}</div>
                                            </div>
                                        ))
                                    ) : (
                                        customerSearch.length > 2 && (
                                            <div className="p-3 text-sm text-gray-500 text-center">No se encontraron clientes</div>
                                        )
                                    )}
                                    
                                    <div 
                                        className="p-3 bg-blue-50 hover:bg-blue-100 cursor-pointer border-t border-gray-100 flex items-center justify-center text-blue-700 font-bold text-sm gap-2 sticky bottom-0"
                                        onClick={() => {
                                            setShowCustomerSearch(false);
                                            setShowCreateCustomerModal(true);
                                            // Pre-fill name if it looks like a name? Nah, keep it simple.
                                        }}
                                    >
                                        <UserPlus size={16} /> Crear Nuevo Cliente
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                            <div>
                                <div className="font-bold text-blue-900 text-sm">{selectedCustomer.firstName} {selectedCustomer.lastName}</div>
                                <div className="text-xs text-blue-600">
                                    {selectedCustomer.taxId} - {selectedCustomer.identificationType}
                                </div>
                            </div>
                            <div className="bg-blue-200 text-blue-700 rounded-full p-1">
                                <Check size={14} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Cart Header */}
                <div className="p-3 bg-white border-b flex items-center justify-between">
                    <h2 className="font-bold text-slate-700 flex items-center">
                        <ShoppingCart className="mr-2" size={20} /> Carrito ({cart.reduce((acc, item) => acc + item.quantity, 0)})
                    </h2>
                    {cart.length > 0 && !sourceQuotation && (
                        <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700 flex items-center">
                            <Trash2 size={12} className="mr-1" /> Vaciar
                        </button>
                    )}
                </div>
                
                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <ShoppingCart size={48} className="mb-2 opacity-20" />
                            <p>El carrito está vacío</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cart.map(item => (
                                <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="mr-2 min-w-0 flex-1">
                                            <h4 className="truncate text-sm font-medium text-gray-800">{item.name}</h4>
                                            <div className="mt-1 text-xs font-semibold text-blue-600">${item.price.toFixed(2)}</div>
                                            {item.maximumQuantity !== undefined && (
                                                <div className="mt-1 text-xs font-medium text-amber-700">Pendiente cotizado: {item.maximumQuantity}</div>
                                            )}
                                        </div>
                                        <div className="flex items-center rounded-lg bg-gray-100 p-1">
                                            <button onClick={() => updateQuantity(item.id, -1)} className="rounded p-1 text-gray-600 hover:bg-white"><Minus size={14} /></button>
                                            <input type="number" min={item.allowsFractionalQuantity ? 0.0001 : 1} max={item.maximumQuantity} step={item.allowsFractionalQuantity ? 0.0001 : 1} value={item.quantity} onChange={event => { const value = Number(event.target.value); const maximum = Math.min(item.maximumQuantity ?? Number.POSITIVE_INFINITY, item.stockQuantity ?? Number.POSITIVE_INFINITY); if (value > 0) setCart(previous => previous.map(row => row.id === item.id ? {...row, quantity: Math.min(value, maximum)} : row)); }} className="w-16 bg-transparent text-center text-sm font-bold outline-none" />
                                            <button disabled={item.quantity >= Math.min(item.maximumQuantity ?? Number.POSITIVE_INFINITY, item.stockQuantity ?? Number.POSITIVE_INFINITY)} onClick={() => updateQuantity(item.id, 1)} className="rounded p-1 text-gray-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"><Plus size={14} /></button>
                                        </div>
                                        <button onClick={() => removeFromCart(item.id)} className="rounded-lg p-2 text-gray-300 hover:bg-red-50 hover:text-red-500"><Trash2 size={16} /></button>
                                    </div>
                                    <div className="mt-3 grid grid-cols-[1fr_110px] gap-2 border-t border-slate-100 pt-3">
                                        <select value={item.discountType} onChange={event => setCart(previous => previous.map(row => row.id === item.id ? {...row, discountType: event.target.value as CartItem['discountType'], discountValue: 0} : row))} className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-bold">
                                            <option value="NONE">SIN DESCUENTO</option>
                                            <option value="PERCENT">DESCUENTO %</option>
                                            <option value="FIXED">DESCUENTO VALOR</option>
                                        </select>
                                        <input type="number" min="0" max={item.discountType === 'PERCENT' ? 100 : undefined} step="0.01" disabled={item.discountType === 'NONE'} value={item.discountValue || ''} onChange={event => setCart(previous => previous.map(row => row.id === item.id ? {...row, discountValue: Number(event.target.value)} : row))} className="h-9 rounded-lg border border-slate-200 px-2 text-right text-xs disabled:bg-slate-100" placeholder="0" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Totals & Action */}
                <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                    <div className="flex justify-between text-gray-500 text-sm mb-1">
                        <span>Subtotal:</span>
                        <span>${subTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-sm mb-3">
                        <span>Impuestos:</span>
                        <span>${taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="mb-3 flex justify-between text-sm font-semibold text-emerald-700">
                        <span>DESCUENTOS:</span>
                        <span>-${totalDiscount.toFixed(2)}</span>
                    </div>
                    <div className="mb-4 flex flex-wrap justify-between gap-2 border-t border-dashed border-gray-200 pt-3 text-2xl font-bold text-slate-800">
                        <span>Total:</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                    
                    <button 
                        onClick={handleInitiateCheckout}
                        disabled={cart.length === 0}
                        className="k-button-primary w-full py-4 text-lg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <CreditCard size={24} /> 
                        <span>Pagar ${total.toFixed(2)}</span>
                    </button>
                </div>
            </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="k-document max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto bg-white animate-in fade-in zoom-in duration-200">
                        <div className="k-panel-header flex items-center justify-between px-6 py-4">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center">
                                <CreditCard className="mr-2 text-blue-600" /> Método de Pago
                            </h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-4 sm:p-6">
                            <div className="mb-6 text-center">
                                <p className="mb-1 text-sm font-medium uppercase text-gray-500">Total de la factura</p>
                                <p className="break-words text-3xl font-extrabold text-slate-800 sm:text-4xl">${total.toFixed(2)}</p>
                            </div>

                            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {['Cash', 'Card', 'Transfer'].map(method => (
                                    <button
                                        key={method}
                                        onClick={() => setPaymentMethod(method)}
                                        className={clsx(
                                            "flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border-2 px-2 py-3 text-sm font-medium transition-all",
                                            paymentMethod === method 
                                                ? "border-blue-600 bg-blue-50 text-blue-700" 
                                                : "border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50"
                                        )}
                                    >
                                        {method === 'Cash' && <Banknote size={22} />}
                                        {method === 'Card' && <CreditCard size={22} />}
                                        {method === 'Transfer' && <Landmark size={22} />}
                                        {method === 'Cash' ? 'Efectivo' : method === 'Card' ? 'Tarjeta' : 'Transferencia'}
                                    </button>
                                ))}
                            </div>

                            <div className="mb-6 space-y-4">
                                {selectedCustomer && (
                                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <WalletCards className="text-blue-600" size={19} />
                                                Anticipo disponible
                                            </div>
                                            <span className="text-lg font-bold text-blue-700">${customerAdvanceBalance.toFixed(2)}</span>
                                        </div>
                                        {customerAdvanceBalance > 0 && (
                                            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-500">$</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={Math.min(customerAdvanceBalance, roundedTotal)}
                                                        step="0.01"
                                                        value={advanceToApply || ''}
                                                        onChange={(e) => {
                                                            const requested = parseFloat(e.target.value) || 0;
                                                            const validAmount = Math.min(Math.max(0, requested), customerAdvanceBalance, roundedTotal);
                                                            setAdvanceToApply(requested);
                                                            setAmountPaid(Math.max(0, roundedTotal - validAmount));
                                                        }}
                                                        onBlur={() => setAdvanceToApply(appliedAdvance)}
                                                        className="w-full rounded-lg border border-blue-200 bg-white py-2.5 pl-7 pr-3 font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                        aria-label="Valor del anticipo a aplicar"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const maximum = Math.min(customerAdvanceBalance, roundedTotal);
                                                        setAdvanceToApply(maximum);
                                                        setAmountPaid(Math.max(0, roundedTotal - maximum));
                                                    }}
                                                    className="k-button-secondary px-3 text-sm"
                                                >
                                                    Usar saldo
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {appliedAdvance > 0 && (
                                    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                                        <span className="font-medium text-slate-600">Pendiente por recibir</span>
                                        <span className="font-bold text-slate-900">${amountDue.toFixed(2)}</span>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Monto Recibido
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                        <input
                                            type="number"
                                            value={amountPaid || ''}
                                            onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                                            onFocus={(e) => e.target.select()}
                                            className="w-full pl-8 pr-4 py-3 text-2xl font-bold text-slate-800 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition-colors"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {selectedCustomer && paymentExcess > 0 && (
                                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                                        <input
                                            type="checkbox"
                                            checked={saveExcessAsAdvance}
                                            onChange={(e) => setSaveExcessAsAdvance(e.target.checked)}
                                            className="mt-0.5 h-5 w-5 accent-emerald-600"
                                        />
                                        <span>
                                            <span className="block font-semibold text-slate-800">Guardar excedente como anticipo</span>
                                            <span className="mt-1 block text-sm text-slate-600">
                                                ${paymentExcess.toFixed(2)} quedarán disponibles para futuras facturas de {selectedCustomer.firstName}.
                                            </span>
                                        </span>
                                    </label>
                                )}

                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                    <span className="font-medium text-slate-600">
                                        {saveExcessAsAdvance && paymentExcess > 0 ? 'Anticipo a favor' : 'Cambio'}
                                    </span>
                                    <span className={clsx("text-2xl font-bold", amountPaid >= amountDue ? "text-emerald-600" : "text-red-500")}>
                                        ${(saveExcessAsAdvance ? paymentExcess : changeAmount).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <button 
                                onClick={processSale}
                                disabled={processing || amountPaid < amountDue}
                                className="k-button-success w-full py-4 text-lg disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {processing ? (
                                    <span>Procesando...</span>
                                ) : (
                                    <>
                                        <Check size={24} /> Confirmar Pago
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ticket Modal */}
            {showTicketModal && lastSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="k-document max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-hidden bg-white animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center">
                                <Check className="mr-2 text-green-400" /> Venta Exitosa
                            </h3>
                            <button onClick={() => setShowTicketModal(false)} className="text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="max-h-[70vh] overflow-y-auto bg-gray-50 p-3 sm:p-6">
                            <div className="relative rounded-lg border border-gray-200 bg-white p-4 font-mono text-sm shadow-sm sm:p-6">
                                {/* Ticket Header */}
                                <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
                                    <h2 className="font-bold text-xl text-black">KASSA</h2>
                                    <p className="text-gray-500">Sucursal Principal</p>
                                    <p className="text-gray-500 mt-2">{new Date(lastSale.date).toLocaleString()}</p>
                                    <p className="font-bold mt-1">Ticket: {lastSale.invoiceNumber}</p>
                                    {lastSale.quotationNumber && (
                                        <p className="mt-1 font-bold text-blue-700">Cotización origen: {lastSale.quotationNumber}</p>
                                    )}
                                </div>
                                
                                {/* Customer Info */}
                                {lastSale.customerName && (
                                    <div className="mb-4 border-b border-dashed border-gray-300 pb-4">
                                        <p className="font-bold">Cliente:</p>
                                        <p>{lastSale.customerName}</p>
                                    </div>
                                )}

                                {/* Items */}
                                <div className="space-y-2 mb-4">
                                    {lastSale.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between gap-3">
                                            <span className="break-words">{item.quantity} x {item.productName}</span>
                                            <span className="shrink-0">${item.subTotal.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Totals */}
                                <div className="border-t border-dashed border-gray-300 pt-4">
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>TOTAL</span>
                                        <span>${lastSale.totalAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500 mt-2">
                                        <span>Pago ({lastSale.paymentMethod})</span>
                                        <span>${lastSale.amountReceived.toFixed(2)}</span>
                                    </div>
                                    {lastSale.customerAdvanceApplied > 0 && (
                                        <div className="flex justify-between text-blue-700">
                                            <span>Anticipo aplicado</span>
                                            <span>-${lastSale.customerAdvanceApplied.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {lastSale.customerAdvanceCreated > 0 && (
                                        <div className="flex justify-between font-semibold text-emerald-700">
                                            <span>Nuevo anticipo</span>
                                            <span>${lastSale.customerAdvanceCreated.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {lastSale.changeAmount > 0 && (
                                        <div className="flex justify-between text-gray-500">
                                            <span>Cambio</span>
                                            <span>${lastSale.changeAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {(lastSale.customerAdvanceApplied > 0 || lastSale.customerAdvanceCreated > 0) && (
                                        <div className="mt-2 flex justify-between border-t border-dashed border-gray-300 pt-2 font-bold">
                                            <span>Saldo de anticipos</span>
                                            <span>${lastSale.customerAdvanceBalance.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Electronic Invoicing */}
                                {lastSale.cufe && lastSale.qrCode ? (
                                    <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                                        <p className="text-xs font-bold text-gray-500 mb-2">Factura Electrónica</p>
                                        <div className="flex justify-center mb-2">
                                            <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(lastSale.qrCode)}`} 
                                                alt="QR Code" 
                                                className="w-24 h-24"
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 break-all leading-tight">CUFE: {lastSale.cufe}</p>
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

                        <div className="flex flex-col gap-3 border-t bg-white p-4 sm:flex-row">
                            <button 
                                onClick={() => window.print()} 
                                className="k-button-secondary flex-1 py-3"
                            >
                                <Printer size={20} /> Imprimir
                            </button>
                            <button 
                                onClick={() => setShowTicketModal(false)}
                                className="k-button-primary flex-1 py-3"
                            >
                                Nueva Venta
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Create Customer Modal */}
            {showCreateCustomerModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="k-document max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto bg-white animate-in fade-in zoom-in duration-200">
                        <div className="k-panel-header flex items-center justify-between px-6 py-4">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center">
                                <UserPlus className="mr-2 text-blue-600" /> Crear Cliente
                            </h3>
                            <button onClick={() => setShowCreateCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-4 sm:p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Persona</label>
                                    <div className="flex space-x-4 mt-2">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                value="Natural"
                                                checked={personType === 'Natural'}
                                                onChange={() => setPersonType('Natural')}
                                                className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                                            />
                                            <span className="text-gray-700">Natural</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                value="Juridica"
                                                checked={personType === 'Juridica'}
                                                onChange={() => setPersonType('Juridica')}
                                                className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                                            />
                                            <span className="text-gray-700">Jurídica</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Identificación</label>
                                        <select
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newCustomer.identificationType}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, identificationType: e.target.value })}
                                        >
                                            <option value="">Seleccione...</option>
                                            {IDENTIFICATION_TYPES.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Número de Identificación</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={newCustomer.taxId}
                                                onChange={(e) => setNewCustomer({ ...newCustomer, taxId: e.target.value })}
                                            />
                                            {newCustomer.identificationType.includes('NIT') && (
                                                <div className="w-20">
                                                    <input
                                                        type="text"
                                                        className="w-full p-2 border border-gray-300 rounded-lg text-center bg-gray-50 text-gray-500 outline-none"
                                                        value={calculateNitVerificationDigit(newCustomer.taxId)}
                                                        readOnly
                                                        title="Dígito de Verificación"
                                                        placeholder="DV"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {personType === 'Juridica' ? (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social *</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newCustomer.firstName1}
                                            onChange={(e) => setNewCustomer({...newCustomer, firstName1: e.target.value})}
                                            required
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Primer Nombre *</label>
                                                <input
                                                    type="text"
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={newCustomer.firstName1}
                                                    onChange={(e) => setNewCustomer({...newCustomer, firstName1: e.target.value})}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Nombre</label>
                                                <input
                                                    type="text"
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={newCustomer.firstName2}
                                                    onChange={(e) => setNewCustomer({...newCustomer, firstName2: e.target.value})}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Primer Apellido *</label>
                                                <input
                                                    type="text"
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={newCustomer.lastName1}
                                                    onChange={(e) => setNewCustomer({...newCustomer, lastName1: e.target.value})}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Apellido</label>
                                                <input
                                                    type="text"
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={newCustomer.lastName2}
                                                    onChange={(e) => setNewCustomer({...newCustomer, lastName2: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newCustomer.email}
                                            onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newCustomer.phone}
                                            onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                                            value={newCustomer.address}
                                            readOnly
                                            placeholder="Haga clic en el ícono para generar la dirección"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowAddressBuilder(true)}
                                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 rounded-lg border border-blue-200 transition-colors"
                                            title="Generador de Direcciones DIAN"
                                        >
                                            <MapPin size={20} />
                                        </button>
                                    </div>
                                    <AddressBuilder
                                        isOpen={showAddressBuilder}
                                        onClose={() => setShowAddressBuilder(false)}
                                        onConfirm={(addr) => setNewCustomer({...newCustomer, address: addr})}
                                        initialValue={newCustomer.address}
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleCreateCustomer}
                                disabled={creatingCustomer}
                                className="k-button-primary mt-6 w-full py-3 text-lg"
                            >
                                {creatingCustomer ? (
                                    <span>Guardando...</span>
                                ) : (
                                    <>
                                        <Check size={20} /> Guardar Cliente
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default POS;

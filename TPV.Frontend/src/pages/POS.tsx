import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Search, Plus, Minus, Trash2, CreditCard, ShoppingCart, User, X, Check, Printer, UserPlus } from 'lucide-react';
import { clsx } from 'clsx';

interface Product {
    id: number;
    name: string;
    sku: string;
    price: number;
    stockQuantity: number;
}

interface CartItem extends Product {
    quantity: number;
}

interface Customer {
    id: number;
    firstName: string;
    lastName: string;
    taxId?: string;
}

interface NewCustomer {
    firstName: string;
    lastName: string;
    taxId: string;
    email: string;
    phone: string;
    address: string;
}

interface SaleResult {
    saleId: number;
    invoiceNumber: string;
    date: string;
    totalAmount: number;
    paymentMethod: string;
    customerName?: string;
    items: {
        productName: string;
        quantity: number;
        unitPrice: number;
        subTotal: number;
    }[];
}

const POS = () => {
    // Products & Cart
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Customers
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);

    // Checkout & Modals
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [lastSale, setLastSale] = useState<SaleResult | null>(null);
    const [processing, setProcessing] = useState(false);

    // Create Customer Modal
    const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
    const [newCustomer, setNewCustomer] = useState<NewCustomer>({
        firstName: '',
        lastName: '',
        taxId: '',
        email: '',
        phone: '',
        address: ''
    });
    const [creatingCustomer, setCreatingCustomer] = useState(false);

    // --- Effects ---
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProducts();
        }, 300);
        return () => clearTimeout(timer);
    }, [productSearch]);

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
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (id: number) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // --- Checkout Logic ---
    const handleInitiateCheckout = () => {
        if (cart.length === 0) return;
        setShowPaymentModal(true);
    };

    const handleCreateCustomer = async () => {
        if (!newCustomer.firstName || !newCustomer.lastName) {
            alert("Nombre y Apellido son obligatorios");
            return;
        }

        setCreatingCustomer(true);
        try {
            const response = await api.post('/customers', newCustomer);
            const createdCustomer = response.data;
            
            setCustomers([createdCustomer]);
            setSelectedCustomer(createdCustomer);
            setShowCreateCustomerModal(false);
            setCustomerSearch('');
            setNewCustomer({
                firstName: '',
                lastName: '',
                taxId: '',
                email: '',
                phone: '',
                address: ''
            });
        } catch (error) {
            console.error("Error creating customer", error);
            alert("Error al crear el cliente.");
        } finally {
            setCreatingCustomer(false);
        }
    };

    const processSale = async () => {
        setProcessing(true);
        try {
            const saleData = {
                items: cart.map(item => ({ productId: item.id, quantity: item.quantity })),
                paymentMethod: paymentMethod,
                customerId: selectedCustomer?.id || null,
                branchId: 0 // Let backend decide default branch
            };
            
            const response = await api.post('/sales/checkout', saleData);
            setLastSale(response.data);
            
            // Success actions
            setCart([]);
            setSelectedCustomer(null);
            setCustomerSearch('');
            setShowPaymentModal(false);
            setShowTicketModal(true);
            fetchProducts(); // Refresh stock
            
        } catch (error: any) {
            console.error("Error processing sale", error);
            const errorMessage = typeof error.response?.data === 'string' 
                ? error.response.data 
                : "Verifique el stock o intente nuevamente.";
            alert(`Error al procesar la venta: ${errorMessage}`);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            {/* LEFT: Product Catalog */}
            <div className="flex-1 bg-white rounded-xl shadow-md p-4 flex flex-col overflow-hidden">
                <div className="mb-4 relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar productos (Nombre o SKU)..." 
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 transition-all"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                    />
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2">
                    {loadingProducts ? (
                        <div className="flex justify-center items-center h-40 text-gray-400">Cargando productos...</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {products.map(product => (
                                <div 
                                    key={product.id} 
                                    className="border border-gray-100 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all bg-white hover:border-blue-200 group"
                                    onClick={() => addToCart(product)}
                                >
                                    <div className="h-28 bg-slate-50 rounded-lg mb-3 flex items-center justify-center text-gray-300 group-hover:bg-blue-50 transition-colors">
                                        <div className="text-center">
                                            <span className="text-2xl font-bold text-gray-200 group-hover:text-blue-200">IMG</span>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-gray-800 truncate" title={product.name}>{product.name}</h3>
                                    <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-lg text-blue-600">${product.price.toFixed(2)}</span>
                                        <span className={clsx("text-xs px-2 py-1 rounded-full font-medium", product.stockQuantity > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
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
            <div className="w-96 bg-white rounded-xl shadow-md flex flex-col overflow-hidden border border-gray-100">
                {/* Customer Section */}
                <div className="p-4 bg-slate-50 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="font-bold text-slate-700 flex items-center text-sm uppercase tracking-wide">
                            <User size={16} className="mr-2" /> Cliente
                        </h2>
                        {selectedCustomer && (
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
                                <div className="text-xs text-blue-600">{selectedCustomer.taxId}</div>
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
                    {cart.length > 0 && (
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
                                <div key={item.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center group">
                                    <div className="flex-1 min-w-0 mr-3">
                                        <h4 className="font-medium text-gray-800 truncate text-sm">{item.name}</h4>
                                        <div className="flex items-center text-xs text-gray-500 mt-1">
                                            <span className="font-semibold text-blue-600">${item.price.toFixed(2)}</span>
                                            <span className="mx-1">x</span>
                                            <span>{item.quantity}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded shadow-sm transition-all text-gray-600"><Minus size={14} /></button>
                                        <span className="w-8 text-center text-sm font-bold text-gray-700">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded shadow-sm transition-all text-gray-600"><Plus size={14} /></button>
                                    </div>
                                    
                                    <button onClick={() => removeFromCart(item.id)} className="ml-2 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Totals & Action */}
                <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                    <div className="flex justify-between text-gray-500 text-sm mb-1">
                        <span>Subtotal:</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-sm mb-3">
                        <span>Impuestos (0%):</span>
                        <span>$0.00</span>
                    </div>
                    <div className="flex justify-between text-2xl font-bold text-slate-800 mb-4 pt-3 border-t border-dashed border-gray-200">
                        <span>Total:</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                    
                    <button 
                        onClick={handleInitiateCheckout}
                        disabled={cart.length === 0}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg shadow-blue-500/30 transition-all transform active:scale-95"
                    >
                        <CreditCard size={24} /> 
                        <span>PAGAR ${total.toFixed(2)}</span>
                    </button>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center">
                                <CreditCard className="mr-2 text-blue-600" /> Método de Pago
                            </h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <div className="text-center mb-8">
                                <p className="text-gray-500 text-sm uppercase tracking-wide mb-1">Total a Pagar</p>
                                <p className="text-4xl font-extrabold text-slate-800">${total.toFixed(2)}</p>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-8">
                                {['Cash', 'Card', 'Transfer'].map(method => (
                                    <button
                                        key={method}
                                        onClick={() => setPaymentMethod(method)}
                                        className={clsx(
                                            "py-3 px-2 rounded-xl border-2 font-medium text-sm transition-all flex flex-col items-center justify-center gap-2",
                                            paymentMethod === method 
                                                ? "border-blue-600 bg-blue-50 text-blue-700" 
                                                : "border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50"
                                        )}
                                    >
                                        {method === 'Cash' && <span className="text-2xl">💵</span>}
                                        {method === 'Card' && <span className="text-2xl">💳</span>}
                                        {method === 'Transfer' && <span className="text-2xl">🏦</span>}
                                        {method === 'Cash' ? 'Efectivo' : method === 'Card' ? 'Tarjeta' : 'Transferencia'}
                                    </button>
                                ))}
                            </div>

                            <button 
                                onClick={processSale}
                                disabled={processing}
                                className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 flex justify-center items-center gap-2 shadow-lg shadow-green-500/30 transition-all"
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center">
                                <Check className="mr-2 text-green-400" /> Venta Exitosa
                            </h3>
                            <button onClick={() => setShowTicketModal(false)} className="text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 bg-gray-50 max-h-[70vh] overflow-y-auto">
                            <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg text-sm font-mono relative">
                                {/* Ticket Header */}
                                <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
                                    <h2 className="font-bold text-xl text-black">KASSA</h2>
                                    <p className="text-gray-500">Sucursal Principal</p>
                                    <p className="text-gray-500 mt-2">{new Date(lastSale.date).toLocaleString()}</p>
                                    <p className="font-bold mt-1">Ticket: {lastSale.invoiceNumber}</p>
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
                                        <span>${lastSale.totalAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500 mt-2">
                                        <span>Pago ({lastSale.paymentMethod})</span>
                                        <span>${lastSale.totalAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                                
                                {/* Cut Line Visual */}
                                <div className="absolute -bottom-3 -left-2 -right-2 h-6 bg-gray-50 rounded-full"></div>
                            </div>
                        </div>

                        <div className="p-4 bg-white border-t flex gap-3">
                            <button 
                                onClick={() => window.print()} 
                                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 flex justify-center items-center gap-2"
                            >
                                <Printer size={20} /> Imprimir
                            </button>
                            <button 
                                onClick={() => setShowTicketModal(false)}
                                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 flex justify-center items-center gap-2"
                            >
                                Nuevo Venta
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Create Customer Modal */}
            {showCreateCustomerModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center">
                                <UserPlus className="mr-2 text-blue-600" /> Crear Cliente
                            </h3>
                            <button onClick={() => setShowCreateCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newCustomer.firstName}
                                            onChange={(e) => setNewCustomer({...newCustomer, firstName: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newCustomer.lastName}
                                            onChange={(e) => setNewCustomer({...newCustomer, lastName: e.target.value})}
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">DNI / CUIT</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newCustomer.taxId}
                                        onChange={(e) => setNewCustomer({...newCustomer, taxId: e.target.value})}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
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
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newCustomer.address}
                                        onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleCreateCustomer}
                                disabled={creatingCustomer}
                                className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700 flex justify-center items-center gap-2 shadow-lg shadow-blue-500/30 transition-all"
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

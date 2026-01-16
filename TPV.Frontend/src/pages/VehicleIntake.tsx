import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Search, X, UserPlus, Printer } from 'lucide-react';

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
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    taxId: string;
    identificationType: string;
}

const IDENTIFICATION_TYPES = [
    "(RCN) Registro Civil de Nacimiento",
    "(TI) Tarjeta de Identidad",
    "(CC) Cédula de Ciudadanía",
    "(CD) Cédula Digital",
    "(CE) Cédula de Extranjería",
    "(PA) Pasaporte",
    "(PEP) Permiso Especial de Permanencia",
    "(PPT) Permiso por Protección Temporal",
    "(NUIP) Número Único de Identificación Personal",
    "(NIT) Número de Identificación Tributaria"
];

const VehicleIntake = () => {
    const [formData, setFormData] = useState({
        plate: '',
        brand: '',
        model: '',
        year: '',
        mileage: '',
        intakeDateTime: '',
        fuelLevel: '',
        initialObservations: '',
        visualCondition: '',
        workshopManager: '',
    });

    // Customers State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);

    // Create Customer Modal State
    const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
    const [newCustomer, setNewCustomer] = useState<NewCustomer>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        taxId: '',
        identificationType: ''
    });
    const [creatingCustomer, setCreatingCustomer] = useState(false);
    const [lastServiceOrder, setLastServiceOrder] = useState<any | null>(null);
    const [orderSearch, setOrderSearch] = useState('');
    const [orderResults, setOrderResults] = useState<any[]>([]);
    const [searchingOrders, setSearchingOrders] = useState(false);

    // Effects
    useEffect(() => {
        // Fetch default branch manager
        const fetchBranchManager = async () => {
            try {
                const response = await api.get('/branches');
                if (response.data && response.data.length > 0) {
                    // Assuming first branch or defaulting to it
                    const branch = response.data[0];
                    if (branch.managerName) {
                        setFormData(prev => ({ ...prev, workshopManager: branch.managerName }));
                    }
                }
            } catch (error) {
                console.error("Error fetching branch info", error);
            }
        };
        fetchBranchManager();

        if (customerSearch.length > 2) {
            const timer = setTimeout(() => {
                fetchCustomers();
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setCustomers([]);
        }
    }, [customerSearch]);

    // Technicians State (no se asigna técnico en el ingreso inicial)

    const fetchCustomers = async () => {
        try {
            const response = await api.get(`/customers?search=${customerSearch}`);
            setCustomers(response.data);
        } catch (error) {
            console.error("Error fetching customers", error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer) {
            alert('Por favor seleccione un cliente.');
            return;
        }
        
        const intakeData = {
            ...formData,
            customerId: selectedCustomer.id,
            customerName: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
            status: "ABIERTA"
        };

        try {
            const response = await api.post('/ServiceOrders', intakeData);
            setLastServiceOrder(response.data);
            alert('Ingreso de vehículo registrado exitosamente.');
            // Reset form
            setFormData(prev => ({
                plate: '',
                brand: '',
                model: '',
                year: '',
                mileage: '',
                intakeDateTime: '',
                fuelLevel: '',
                initialObservations: '',
                visualCondition: '',
                workshopManager: prev.workshopManager
            }));
            setSelectedCustomer(null);
            setCustomerSearch('');
        } catch (error) {
            console.error('Error saving service order', error);
            alert('Error al registrar el ingreso.');
        }
    };

    const handlePrint = (orderToPrint = lastServiceOrder) => {
        if (!orderToPrint) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charSet="utf-8" />
    <title>Comprobante de ingreso de vehículo</title>
    <style>
        :root {
            --bg-page: #f3f4f6;
            --bg-card: #ffffff;
            --border-subtle: #e5e7eb;
            --text-main: #111827;
            --text-muted: #6b7280;
            --accent: #111827;
            --badge-open-bg: #ecfdf3;
            --badge-open-text: #166534;
            --badge-default-bg: #f3f4f6;
            --badge-default-text: #374151;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 32px 16px;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background-color: var(--bg-page);
            color: var(--text-main);
        }

        .page {
            max-width: 840px;
            margin: 0 auto;
            background-color: var(--bg-card);
            border-radius: 16px;
            box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
            padding: 28px 32px 30px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
        }

        .brand {
            font-size: 14px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--text-muted);
        }

        .title {
            font-size: 22px;
            font-weight: 700;
            margin-top: 4px;
            color: var(--accent);
        }

        .meta {
            text-align: right;
            font-size: 12px;
            color: var(--text-muted);
        }

        .meta-row {
            margin-bottom: 4px;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        .badge-open {
            background-color: var(--badge-open-bg);
            color: var(--badge-open-text);
        }

        .badge-default {
            background-color: var(--badge-default-bg);
            color: var(--badge-default-text);
        }

        .section {
            padding-top: 18px;
            margin-top: 18px;
            border-top: 1px solid var(--border-subtle);
        }

        .section-title {
            font-size: 12px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: var(--text-muted);
            margin-bottom: 10px;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px 24px;
            font-size: 13px;
        }

        .field-label {
            font-size: 11px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--text-muted);
            margin-bottom: 2px;
        }

        .field-value {
            font-size: 13px;
        }

        .field-value-strong {
            font-size: 14px;
            font-weight: 600;
        }

        .text-blocks {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px 24px;
            font-size: 13px;
        }

        .text-box {
            padding: 10px 0;
        }

        .text-content {
            margin-top: 4px;
            padding: 10px 12px;
            min-height: 64px;
            border-radius: 10px;
            border: 1px solid var(--border-subtle);
            background-color: #f9fafb;
            white-space: pre-wrap;
        }

        .footer {
            margin-top: 26px;
            font-size: 11px;
            color: var(--text-muted);
            display: flex;
            justify-content: space-between;
        }

        .footer-divider {
            height: 1px;
            background: linear-gradient(to right, transparent, var(--border-subtle), transparent);
            margin: 22px 0 12px;
        }

        @media print {
            body {
                background-color: #ffffff;
                padding: 0;
            }

            .page {
                box-shadow: none;
                border-radius: 0;
                max-width: 100%;
                padding: 20px 24px;
            }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <div>
                <div class="brand">Ingreso de vehículo</div>
                <div class="title">Comprobante de ingreso</div>
            </div>
            <div class="meta">
                <div class="meta-row">
                    <span class="badge ${orderToPrint.status === 'ABIERTA' ? 'badge-open' : 'badge-default'}">
                        ${orderToPrint.status || ''}
                    </span>
                </div>
                <div class="meta-row">
                    Ingreso: ${new Date(orderToPrint.intakeDateTime).toLocaleString()}
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Datos del cliente</div>
            <div class="grid">
                <div>
                    <div class="field-label">Nombre</div>
                    <div class="field-value-strong">${orderToPrint.customerName}</div>
                </div>
                <div>
                    <div class="field-label">Jefe de Taller</div>
                    <div class="field-value">${orderToPrint.workshopManager || ''}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Datos del vehículo</div>
            <div class="grid">
                <div>
                    <div class="field-label">Placa</div>
                    <div class="field-value-strong">${orderToPrint.plate}</div>
                </div>
                <div>
                    <div class="field-label">Marca / Modelo</div>
                    <div class="field-value">${orderToPrint.brand} ${orderToPrint.model}</div>
                </div>
                <div>
                    <div class="field-label">Año</div>
                    <div class="field-value">${orderToPrint.year}</div>
                </div>
                <div>
                    <div class="field-label">Kilometraje</div>
                    <div class="field-value">${orderToPrint.mileage}</div>
                </div>
                <div>
                    <div class="field-label">Nivel de combustible</div>
                    <div class="field-value">${orderToPrint.fuelLevel}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Detalles de ingreso</div>
            <div class="text-blocks">
                <div class="text-box">
                    <div class="field-label">Observaciones iniciales</div>
                    <div class="text-content">
                        ${orderToPrint.initialObservations || 'Sin observaciones registradas.'}
                    </div>
                </div>
                <div class="text-box">
                    <div class="field-label">Estado visual</div>
                    <div class="text-content">
                        ${orderToPrint.visualCondition || 'Sin descripción del estado visual.'}
                    </div>
                </div>
            </div>
        </div>

        <div class="footer-divider"></div>
        <div class="footer">
            <div>Este documento es solo informativo para el ingreso del vehículo.</div>
            <div>Generado por el sistema de taller</div>
        </div>
    </div>
</body>
</html>`;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
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
            alert('Error al buscar ingresos de vehículos.');
        } finally {
            setSearchingOrders(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6 relative">
            <h1 className="text-2xl font-bold mb-4 text-slate-800">Ingreso del Vehículo</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer Search Section */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                        {!selectedCustomer ? (
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Buscar cliente..."
                                    className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                                    <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-lg mt-1 border border-gray-100 z-50 max-h-60 overflow-y-auto">
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
                                            }}
                                        >
                                            <UserPlus size={16} /> Crear Nuevo Cliente
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 flex items-center justify-between h-[42px]">
                                <div>
                                    <div className="font-bold text-blue-900 text-sm">{selectedCustomer.firstName} {selectedCustomer.lastName}</div>
                                </div>
                                <button type="button" onClick={() => setSelectedCustomer(null)} className="text-red-500 hover:text-red-700 bg-white rounded-full p-1">
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jefe de Taller</label>
                        <input
                            type="text"
                            name="workshopManager"
                            value={formData.workshopManager}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                            placeholder="Nombre del encargado"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
                        <input
                            type="text"
                            name="plate"
                            value={formData.plate}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                        <input
                            type="text"
                            name="brand"
                            value={formData.brand}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                        <input
                            type="text"
                            name="model"
                            value={formData.model}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                        <input
                            type="number"
                            name="year"
                            value={formData.year}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kilometraje</label>
                        <input
                            type="number"
                            name="mileage"
                            value={formData.mileage}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora de ingreso</label>
                        <input
                            type="datetime-local"
                            name="intakeDateTime"
                            value={formData.intakeDateTime}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de combustible</label>
                        <select
                            name="fuelLevel"
                            value={formData.fuelLevel}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        >
                            <option value="">Seleccione...</option>
                            <option value="1/4">1/4</option>
                            <option value="1/2">1/2</option>
                            <option value="3/4">3/4</option>
                            <option value="Lleno">Lleno</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones iniciales</label>
                        <textarea
                            name="initialObservations"
                            value={formData.initialObservations}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-28 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Estado visual (golpes, rayones)</label>
                        <textarea
                            name="visualCondition"
                            value={formData.visualCondition}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-28 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center gap-4">
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Guardar ingreso
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            disabled={!lastServiceOrder}
                            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${lastServiceOrder ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                        >
                            Imprimir ingreso
                        </button>
                    </div>
                </div>
            </form>

            <div className="mt-8 border-t pt-6">
                <h2 className="text-lg font-semibold mb-4 text-slate-800">Buscar ingresos de vehículo</h2>
                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                    <input
                        type="text"
                        placeholder="Buscar por cliente, placa o técnico..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={handleSearchOrders}
                        className="px-6 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
                        disabled={searchingOrders}
                    >
                        {searchingOrders ? 'Buscando...' : 'Buscar ingresos'}
                    </button>
                </div>

                {orderResults.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha ingreso</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placa</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca/Modelo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {orderResults.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {new Date(order.intakeDateTime).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {order.plate}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {order.customerName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {order.brand} {order.model}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${order.status === 'ABIERTA' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <button
                                                onClick={() => handlePrint(order)}
                                                className="text-blue-600 hover:text-blue-900"
                                                title="Imprimir comprobante"
                                            >
                                                <Printer size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Customer Modal */}
            {showCreateCustomerModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center">
                                <UserPlus className="mr-2 text-blue-600" /> Nuevo Cliente
                            </h3>
                            <button onClick={() => setShowCreateCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre *</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newCustomer.firstName}
                                        onChange={e => setNewCustomer({...newCustomer, firstName: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Apellido *</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newCustomer.lastName}
                                        onChange={e => setNewCustomer({...newCustomer, lastName: e.target.value})}
                                    />
                                </div>
                            </div>
                            
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Identificación</label>
                                        <select
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newCustomer.identificationType}
                                            onChange={e => setNewCustomer({ ...newCustomer, identificationType: e.target.value })}
                                        >
                                            <option value="">Seleccione...</option>
                                            {IDENTIFICATION_TYPES.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número de Identificación</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newCustomer.taxId}
                                            onChange={e => setNewCustomer({ ...newCustomer, taxId: e.target.value })}
                                        />
                                    </div>
                                </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newCustomer.phone}
                                        onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                    <input 
                                        type="email" 
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newCustomer.email}
                                        onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección</label>
                                <textarea 
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
                                    value={newCustomer.address}
                                    onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                            <button 
                                onClick={() => setShowCreateCustomerModal(false)}
                                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleCreateCustomer}
                                disabled={creatingCustomer}
                                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {creatingCustomer ? 'Guardando...' : 'Guardar Cliente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VehicleIntake;

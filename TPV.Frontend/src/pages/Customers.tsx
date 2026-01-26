import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { calculateNitVerificationDigit } from '../utils/nit';
import AddressBuilder from '../components/AddressBuilder';
import { departments, cities } from '../utils/colombiaLocations';
import { Users, Plus, Edit, Trash, X, Search, MapPin } from 'lucide-react';

interface Customer {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    taxId: string;
    identificationType: string;
    department?: string;
    city?: string;
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

const Customers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [personType, setPersonType] = useState<'Natural' | 'Juridica'>('Natural');
    const [showAddressBuilder, setShowAddressBuilder] = useState(false);
    const [formData, setFormData] = useState<{
        firstName1: string;
        firstName2: string;
        lastName1: string;
        lastName2: string;
        email: string;
        phone: string;
        address: string;
        taxId: string;
        identificationType: string;
        department: string;
        city: string;
    }>({
        firstName1: '',
        firstName2: '',
        lastName1: '',
        lastName2: '',
        email: '',
        phone: '',
        address: '',
        taxId: '',
        identificationType: '',
        department: '',
        city: ''
    });

    useEffect(() => {
        fetchCustomers();
    }, [searchTerm]);

    const fetchCustomers = async () => {
        try {
            const response = await api.get(`/customers?search=${searchTerm}`);
            setCustomers(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckTaxId = async () => {
        if (!formData.taxId || formData.taxId.trim().length < 3) return;
        
        try {
            const response = await api.get(`/customers?search=${formData.taxId.trim()}`);
            if (response.data && response.data.length > 0) {
                // Check if exact match and exclude current customer if editing
                const match = response.data.find((c: Customer) => 
                    c.taxId === formData.taxId.trim() && 
                    (!currentCustomer || c.id !== currentCustomer.id)
                );
                
                if (match) {
                    alert(`Advertencia: Ya existe un cliente registrado con la identificación ${formData.taxId}.\nNombre: ${match.firstName} ${match.lastName}`);
                }
            }
        } catch (error) {
            console.error("Error checking taxId", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isJuridica = personType === 'Juridica';
            const payload = {
                firstName: isJuridica 
                    ? formData.firstName1.trim()
                    : `${formData.firstName1} ${formData.firstName2}`.trim(),
                lastName: isJuridica
                    ? "."
                    : `${formData.lastName1} ${formData.lastName2}`.trim(),
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                taxId: formData.taxId,
                identificationType: formData.identificationType
            };

            if (currentCustomer) {
                await api.put(`/customers/${currentCustomer.id}`, payload);
            } else {
                await api.post('/customers', payload);
            }
            fetchCustomers();
            handleCloseModal();
        } catch (error: any) {
            console.error(error);
            const errorMessage = error.response?.data?.detail || error.response?.data?.message || 'Error al guardar cliente';
            alert(errorMessage);
        }
    };

    const handleOpenModal = (customer?: Customer) => {
        if (customer) {
            // Determine person type from data. If lastName is '.', it's likely Juridica.
            // Or if ID type is NIT (though natural persons can have NIT too, in this system context NIT often implies business if used as such).
            // But checking lastName === '.' is the most reliable way given how we save it.
            const isJuridica = customer.lastName === '.';
            setPersonType(isJuridica ? 'Juridica' : 'Natural');

            let firstName1 = '';
            let firstName2 = '';
            let lastName1 = '';
            let lastName2 = '';

            if (isJuridica) {
                firstName1 = customer.firstName || '';
            } else {
                const firstParts = (customer.firstName || '').split(' ');
                const lastParts = (customer.lastName || '').split(' ');
                firstName1 = firstParts[0] || '';
                firstName2 = firstParts.slice(1).join(' ') || '';
                lastName1 = lastParts[0] || '';
                lastName2 = lastParts.slice(1).join(' ') || '';
            }

            setCurrentCustomer(customer);
            setFormData({
                firstName1,
                firstName2,
                lastName1,
                lastName2,
                email: customer.email || '',
                phone: customer.phone || '',
                address: customer.address || '',
                taxId: customer.taxId || '',
                identificationType: customer.identificationType || '',
                department: customer.department || '',
                city: customer.city || ''
            });
        } else {
            setCurrentCustomer(null);
            setPersonType('Natural');
            setFormData({
                firstName1: '',
                firstName2: '',
                lastName1: '',
                lastName2: '',
                email: '',
                phone: '',
                address: '',
                taxId: '',
                identificationType: '',
                department: '',
                city: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentCustomer(null);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Está seguro de eliminar este cliente?')) {
            try {
                await api.delete(`/customers/${id}`);
                fetchCustomers();
            } catch (error) {
                console.error(error);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-2xl flex items-center text-slate-800">
                    <Users className="mr-2" /> Clientes
                </h2>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-lg shadow-blue-500/30 transition-all"
                >
                    <Plus size={20} className="mr-1" /> Nuevo Cliente
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 p-4">
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o DNI..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold tracking-wider">
                            <tr>
                                <th className="p-4 border-b">Nombre</th>
                                <th className="p-4 border-b">Identificación</th>
                                <th className="p-4 border-b">Contacto</th>
                                <th className="p-4 border-b text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 divide-y divide-gray-100">
                            {customers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="p-4 font-medium">
                                        <div>{customer.firstName} {customer.lastName}</div>
                                        <div className="text-xs text-gray-400">{customer.address}</div>
                                    </td>
                                    <td className="p-4 text-sm">
                                        <div className="font-medium">{customer.taxId || '-'}</div>
                                        <div className="text-xs text-gray-500">{customer.identificationType}</div>
                                    </td>
                                    <td className="p-4 text-sm">
                                        <div>{customer.phone}</div>
                                        <div className="text-xs text-blue-500">{customer.email}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center space-x-2">
                                            <button 
                                                onClick={() => handleOpenModal(customer)}
                                                className="text-blue-600 hover:bg-blue-100 p-2 rounded-full transition-colors"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(customer.id)}
                                                className="text-red-600 hover:bg-red-100 p-2 rounded-full transition-colors"
                                            >
                                                <Trash size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {customers.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400">
                                        No se encontraron clientes.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">
                                {currentCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Identificación</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.identificationType}
                                        onChange={(e) => setFormData({...formData, identificationType: e.target.value})}
                                        required
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
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.taxId}
                                            onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                                            onBlur={handleCheckTaxId}
                                            required
                                        />
                                        {formData.identificationType.includes('NIT') && (
                                            <div className="w-20">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center bg-gray-50 text-gray-500 outline-none"
                                                    value={calculateNitVerificationDigit(formData.taxId)}
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social *</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.firstName1}
                                        onChange={(e) => setFormData({...formData, firstName1: e.target.value})}
                                        required
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Primer Nombre *</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.firstName1}
                                                onChange={(e) => setFormData({...formData, firstName1: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Nombre</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.firstName2}
                                                onChange={(e) => setFormData({...formData, firstName2: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Primer Apellido *</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.lastName1}
                                                onChange={(e) => setFormData({...formData, lastName1: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Apellido</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.lastName2}
                                                onChange={(e) => setFormData({...formData, lastName2: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.department}
                                        onChange={(e) => setFormData({...formData, department: e.target.value, city: ''})}
                                    >
                                        <option value="">Seleccione...</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.city}
                                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                                        disabled={!formData.department}
                                    >
                                        <option value="">Seleccione...</option>
                                        {cities.filter(c => c.departmentId === formData.department).map(city => (
                                            <option key={city.id} value={city.id}>{city.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                                            value={formData.address}
                                            readOnly
                                            placeholder="Use el generador"
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
                                        onConfirm={(addr) => setFormData({...formData, address: addr})}
                                        initialValue={formData.address}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input 
                                    type="email" 
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <button 
                                    type="button" 
                                    onClick={handleCloseModal}
                                    className="text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg mr-2 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-all"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;
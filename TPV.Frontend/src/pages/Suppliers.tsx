import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { calculateNitVerificationDigit } from '../utils/nit';
import AddressBuilder from '../components/AddressBuilder';
import { Users, Plus, Edit, Trash, X, MapPin } from 'lucide-react';

interface Supplier {
    id: number;
    name: string;
    contactName: string;
    phone: string;
    email: string;
    address: string;
    identificationType: string;
    taxId: string;
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

const Suppliers = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showAddressBuilder, setShowAddressBuilder] = useState(false);
    const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
    const [personType, setPersonType] = useState<'Natural' | 'Juridica'>('Natural');
    const [formData, setFormData] = useState({
        name1: '',
        name2: '',
        surname1: '',
        surname2: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
        identificationType: '',
        taxId: ''
    });

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const response = await api.get('/suppliers');
            setSuppliers(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckTaxId = () => {
        if (!formData.taxId || formData.taxId.trim().length < 3) return;
        
        const match = suppliers.find(s => 
            s.taxId === formData.taxId.trim() && 
            (!currentSupplier || s.id !== currentSupplier.id)
        );

        if (match) {
            alert(`Advertencia: Ya existe un proveedor registrado con la identificación ${formData.taxId}.\nNombre: ${match.name}`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isJuridica = personType === 'Juridica';
            // Logic to check if it was previously stored as names but now converting to Razón Social logic?
            // Actually, Supplier entity has 'name'. We map fields to 'name'.
            
            const payload = {
                name: isJuridica 
                    ? formData.name1.trim()
                    : `${formData.name1} ${formData.name2} ${formData.surname1} ${formData.surname2}`.trim().replace(/\s+/g, ' '),
                contactName: formData.contactName,
                phone: formData.phone,
                email: formData.email,
                address: formData.address,
                identificationType: formData.identificationType,
                taxId: formData.taxId
            };

            if (currentSupplier) {
                await api.put(`/suppliers/${currentSupplier.id}`, payload);
            } else {
                await api.post('/suppliers', payload);
            }
            fetchSuppliers();
            handleCloseModal();
        } catch (error: any) {
            console.error(error);
            const errorMessage = error.response?.data?.message || error.response?.data?.detail || "Error al guardar el proveedor.";
            alert(errorMessage);
        }
    };

    const handleOpenModal = (supplier?: Supplier) => {
        if (supplier) {
            // Check if it looks like a person or company
            // Heuristic: If it has only one "word" or if ID is NIT, it might be company.
            // But here we don't have separate fields for first/last name in backend for Supplier.
            // Supplier.cs has 'Name' only.
            // So we can default to 'Juridica' if it's NIT, 'Natural' otherwise?
            // Or maybe check if the name has spaces?
            // Let's stick to: NIT = Juridica, Others = Natural as a best guess for loading.
            // But a person can have NIT.
            // However, since we don't store "Person Type", we must guess.
            // If the user previously saved a "Natural" person with NIT, they entered names.
            // The 'Name' field would be "John Doe".
            // If it was "Juridica", 'Name' would be "Acme Corp".
            // If we assume NIT -> Juridica, then "John Doe" becomes Razón Social "John Doe". That's acceptable.
            // But if we want to split "John Doe" into fields, we need to know it's Natural.
            
            // Let's use the ID type heuristic for now, but user can change it.
            const isNit = (supplier.identificationType || '').includes('NIT');
            setPersonType(isNit ? 'Juridica' : 'Natural');

            let name1 = '', name2 = '', surname1 = '', surname2 = '';

            if (isNit) {
                // Treat whole name as Razón Social (name1)
                name1 = supplier.name || '';
            } else {
                const parts = (supplier.name || '').split(' ');
                // Simple distribution heuristic
                name1 = parts[0] || '';
                name2 = parts.length > 2 ? parts[1] : '';
                surname1 = parts.length > 2 ? parts[2] : (parts[1] || '');
                surname2 = parts.length > 3 ? parts.slice(3).join(' ') : '';
            }

            setCurrentSupplier(supplier);
            setFormData({
                name1,
                name2,
                surname1,
                surname2,
                contactName: supplier.contactName || '',
                phone: supplier.phone || '',
                email: supplier.email || '',
                address: supplier.address || '',
                identificationType: supplier.identificationType || '',
                taxId: supplier.taxId || ''
            });
        } else {
            setCurrentSupplier(null);
            setPersonType('Natural');
            setFormData({
                name1: '',
                name2: '',
                surname1: '',
                surname2: '',
                contactName: '',
                phone: '',
                email: '',
                address: '',
                identificationType: '',
                taxId: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentSupplier(null);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Está seguro de eliminar este proveedor?')) {
            try {
                await api.delete(`/suppliers/${id}`);
                fetchSuppliers();
            } catch (error) {
                console.error(error);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-2xl flex items-center text-slate-800">
                    <Users className="mr-2" /> Proveedores
                </h2>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-lg shadow-blue-500/30 transition-all"
                >
                    <Plus size={20} className="mr-1" /> Nuevo Proveedor
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold tracking-wider">
                            <tr>
                                <th className="p-4 border-b">Nombre</th>
                                <th className="p-4 border-b">Identificación</th>
                                <th className="p-4 border-b">Contacto</th>
                                <th className="p-4 border-b">Teléfono</th>
                                <th className="p-4 border-b">Email</th>
                                <th className="p-4 border-b text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 divide-y divide-gray-100">
                            {suppliers.map((item) => (
                                <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="p-4 font-medium">{item.name}</td>
                                    <td className="p-4 text-sm">
                                        <div className="font-medium">{item.taxId || '-'}</div>
                                        <div className="text-xs text-gray-500">{item.identificationType}</div>
                                    </td>
                                    <td className="p-4 text-sm">{item.contactName}</td>
                                    <td className="p-4 text-sm">{item.phone}</td>
                                    <td className="p-4 text-sm">{item.email}</td>
                                    <td className="p-4 flex justify-center space-x-2">
                                        <button 
                                            onClick={() => handleOpenModal(item)}
                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                        >
                                            <Trash size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {suppliers.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">
                                        No hay proveedores registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">
                                {currentSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
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
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social *</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.name1}
                                        onChange={(e) => setFormData({...formData, name1: e.target.value})}
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Primer Nombre *</label>
                                            <input 
                                                type="text" 
                                                required
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.name1}
                                                onChange={(e) => setFormData({...formData, name1: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Nombre</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.name2}
                                                onChange={(e) => setFormData({...formData, name2: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Primer Apellido *</label>
                                            <input 
                                                type="text" 
                                                required
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.surname1}
                                                onChange={(e) => setFormData({...formData, surname1: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Apellido</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.surname2}
                                                onChange={(e) => setFormData({...formData, surname2: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contacto (Persona de contacto adicional)</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={formData.contactName}
                                    onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input 
                                        type="email" 
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                                        value={formData.address}
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
                                    onConfirm={(addr) => setFormData({...formData, address: addr})}
                                    initialValue={formData.address}
                                />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button 
                                    type="button" 
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"
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

export default Suppliers;
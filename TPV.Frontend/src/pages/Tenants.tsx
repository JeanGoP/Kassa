import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Building2, Plus, Edit, Trash, X, Search } from 'lucide-react';
import Swal from 'sweetalert2';

interface Tenant {
    id: number;
    name: string;
    nit?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
}

const Tenants = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

    const [formData, setFormData] = useState<Partial<Tenant>>({
        name: '',
        nit: '',
        address: '',
        phone: '',
        email: '',
        logoUrl: ''
    });

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const response = await api.get('/tenants');
            setTenants(response.data);
        } catch (error) {
            console.error('Error fetching tenants:', error);
            Swal.fire('Error', 'No se pudieron cargar las empresas', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (tenant?: Tenant) => {
        if (tenant) {
            setEditingTenant(tenant);
            setFormData({
                name: tenant.name,
                nit: tenant.nit || '',
                address: tenant.address || '',
                phone: tenant.phone || '',
                email: tenant.email || '',
                logoUrl: tenant.logoUrl || ''
            });
        } else {
            setEditingTenant(null);
            setFormData({
                name: '',
                nit: '',
                address: '',
                phone: '',
                email: '',
                logoUrl: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTenant(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingTenant) {
                await api.put(`/tenants/${editingTenant.id}`, formData);
                Swal.fire('Actualizado', 'La empresa ha sido actualizada', 'success');
            } else {
                await api.post('/tenants', formData);
                Swal.fire('Creado', 'La empresa ha sido creada', 'success');
            }
            handleCloseModal();
            fetchTenants();
        } catch (error) {
            console.error('Error saving tenant:', error);
            Swal.fire('Error', 'No se pudo guardar la empresa', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esto",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/tenants/${id}`);
                Swal.fire('Eliminado', 'La empresa ha sido eliminada', 'success');
                fetchTenants();
            } catch (error) {
                console.error('Error deleting tenant:', error);
                Swal.fire('Error', 'No se pudo eliminar la empresa', 'error');
            }
        }
    };

    const filteredTenants = tenants.filter(tenant => 
        tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.nit?.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-2xl flex items-center text-slate-800">
                    <Building2 className="mr-2" /> Empresas (Tenants)
                </h2>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-lg shadow-blue-500/30 transition-all"
                >
                    <Plus size={20} className="mr-1" /> Nueva Empresa
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 p-4">
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o NIT..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-sm leading-normal">
                                <th className="p-3">Nombre</th>
                                <th className="p-3">NIT</th>
                                <th className="p-3">Teléfono</th>
                                <th className="p-3">Dirección</th>
                                <th className="p-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-600 text-sm font-light">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center">Cargando...</td>
                                </tr>
                            ) : filteredTenants.map((tenant) => (
                                <tr key={tenant.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="p-3 font-medium text-gray-800">{tenant.name}</td>
                                    <td className="p-3">{tenant.nit || '-'}</td>
                                    <td className="p-3">{tenant.phone || '-'}</td>
                                    <td className="p-3 truncate max-w-xs">{tenant.address || '-'}</td>
                                    <td className="p-3">
                                        <div className="flex justify-center space-x-2">
                                            <button 
                                                onClick={() => handleOpenModal(tenant)}
                                                className="text-blue-600 hover:bg-blue-100 p-2 rounded-full transition-colors"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(tenant.id)}
                                                className="text-red-600 hover:bg-red-100 p-2 rounded-full transition-colors"
                                            >
                                                <Trash size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredTenants.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">
                                        No se encontraron empresas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">
                                {editingTenant ? 'Editar Empresa' : 'Nueva Empresa'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        required
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
                                        <input 
                                            type="text" 
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            value={formData.nit}
                                            onChange={(e) => setFormData({...formData, nit: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                        <input 
                                            type="text" 
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input 
                                        type="email" 
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={formData.address}
                                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">URL Logo</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={formData.logoUrl}
                                        onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end space-x-3">
                                <button 
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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

export default Tenants;

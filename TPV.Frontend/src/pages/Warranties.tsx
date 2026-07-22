import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Search, Plus, Edit, Trash, X, Loader } from 'lucide-react';

interface Warranty {
    id: number;
    plate: string;
    customerName: string;
    type: string;
    description: string;
    startDate: string;
    endDate?: string;
    startMileage: number;
    limitMileage1?: number;
    limitMileage2?: number;
    limitMileage3?: number;
    termsAndConditions: string;
    status: string;
    isActive: boolean;
}

const Warranties = () => {
    const [warranties, setWarranties] = useState<Warranty[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentWarranty, setCurrentWarranty] = useState<Warranty | null>(null);
    const [formData, setFormData] = useState({
        plate: '',
        customerId: '',
        type: 'Mileage',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        startMileage: 0,
        limitMileage1: 0,
        limitMileage2: 0,
        limitMileage3: 0,
        termsAndConditions: '',
        status: 'Active'
    });

    useEffect(() => {
        fetchWarranties();
    }, [searchTerm]);

    const fetchWarranties = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/warranties?plate=${searchTerm.toUpperCase()}`);
            setWarranties(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                plate: formData.plate.toUpperCase(),
                customerId: formData.customerId ? parseInt(formData.customerId) : null,
                startMileage: Number(formData.startMileage),
                limitMileage1: formData.limitMileage1 ? Number(formData.limitMileage1) : null,
                limitMileage2: formData.limitMileage2 ? Number(formData.limitMileage2) : null,
                limitMileage3: formData.limitMileage3 ? Number(formData.limitMileage3) : null,
                endDate: formData.endDate || null
            };

            if (currentWarranty) {
                await api.put(`/warranties/${currentWarranty.id}`, payload);
            } else {
                await api.post('/warranties', payload);
            }
            fetchWarranties();
            handleCloseModal();
        } catch (error) {
            console.error(error);
            alert("Error al guardar la garantía");
        }
    };

    const handleOpenModal = (warranty?: Warranty) => {
        if (warranty) {
            setCurrentWarranty(warranty);
            setFormData({
                plate: warranty.plate,
                customerId: '', 
                type: warranty.type,
                description: warranty.description,
                startDate: warranty.startDate.split('T')[0],
                endDate: warranty.endDate ? warranty.endDate.split('T')[0] : '',
                startMileage: warranty.startMileage,
                limitMileage1: warranty.limitMileage1 || 0,
                limitMileage2: warranty.limitMileage2 || 0,
                limitMileage3: warranty.limitMileage3 || 0,
                termsAndConditions: warranty.termsAndConditions,
                status: warranty.status
            });
        } else {
            setCurrentWarranty(null);
            setFormData({
                plate: '',
                customerId: '',
                type: 'Mileage',
                description: '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: '',
                startMileage: 0,
                limitMileage1: 0,
                limitMileage2: 0,
                limitMileage3: 0,
                termsAndConditions: '',
                status: 'Active'
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentWarranty(null);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Está seguro de eliminar esta garantía?')) {
            try {
                await api.delete(`/warranties/${id}`);
                fetchWarranties();
            } catch (error) {
                console.error(error);
            }
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Gestión de Garantías</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                >
                    <Plus size={20} />
                    Nueva Garantía
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                    <div className="relative">
                        {loading ? (
                            <Loader className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={20} />
                        ) : (
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        )}
                        <input
                            type="text"
                            placeholder="Buscar por placa..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placa</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimiento</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {warranties.map((warranty) => (
                                <tr key={warranty.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-900">{warranty.plate}</td>
                                    <td className="px-6 py-4 text-slate-600">{warranty.type}</td>
                                    <td className="px-6 py-4 text-slate-600">{warranty.description}</td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {warranty.endDate ? new Date(warranty.endDate).toLocaleDateString() : 'N/A'}
                                        {warranty.limitMileage1 && ` / ${warranty.limitMileage1} km`}
                                        {warranty.limitMileage2 && ` / ${warranty.limitMileage2} km`}
                                        {warranty.limitMileage3 && ` / ${warranty.limitMileage3} km`}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            warranty.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {warranty.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => handleOpenModal(warranty)} className="text-blue-600 hover:text-blue-800">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(warranty.id)} className="text-red-600 hover:text-red-800">
                                            <Trash size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">
                                {currentWarranty ? 'Editar Garantía' : 'Nueva Garantía'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 uppercase"
                                        value={formData.plate}
                                        onChange={(e) => setFormData({...formData, plate: e.target.value.toUpperCase()})}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        value={formData.type}
                                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    >
                                        <option value="Mileage">Kilometraje</option>
                                        <option value="Time">Tiempo</option>
                                        <option value="Mixed">Mixta</option>
                                        <option value="Parts">Repuestos</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    placeholder="Ej. Garantía General, Motor, Batería"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                                    <input
                                        type="date"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Km Inicio</label>
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        value={formData.startMileage || ''}
                                        onChange={(e) => setFormData({...formData, startMileage: Number(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Km Límite 1</label>
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        value={formData.limitMileage1 || ''}
                                        onChange={(e) => setFormData({...formData, limitMileage1: Number(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Km Límite 2</label>
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        value={formData.limitMileage2 || ''}
                                        onChange={(e) => setFormData({...formData, limitMileage2: Number(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Km Límite 3</label>
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        value={formData.limitMileage3 || ''}
                                        onChange={(e) => setFormData({...formData, limitMileage3: Number(e.target.value)})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Términos y Condiciones</label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                                    value={formData.termsAndConditions}
                                    onChange={(e) => setFormData({...formData, termsAndConditions: e.target.value})}
                                    placeholder="Detalles de la cobertura..."
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Guardar Garantía
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Warranties;

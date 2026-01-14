import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Package, Plus, Edit, Trash, X, Search } from 'lucide-react';

interface Product {
    id: number;
    sku: string;
    name: string;
    description: string;
    price: number;
    cost: number;
    categoryId: number;
    categoryName?: string;
}

interface Category {
    id: number;
    name: string;
}

const Products = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        description: '',
        price: 0,
        cost: 0,
        categoryId: 0
    });

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await api.get('/products');
            setProducts(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get('/categories');
            setCategories(response.data);
            // Set default category if available and not set
            if (response.data.length > 0 && formData.categoryId === 0) {
                setFormData(prev => ({ ...prev, categoryId: response.data[0].id }));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (currentProduct) {
                await api.put(`/products/${currentProduct.id}`, { ...formData, id: currentProduct.id });
            } else {
                await api.post('/products', formData);
            }
            fetchProducts();
            handleCloseModal();
            } catch (error: any) {
                console.error(error);
                alert(`Error al guardar el producto: ${error.response?.data?.message || error.message}`);
            }
        };

    const handleOpenModal = (product?: Product) => {
        if (product) {
            setCurrentProduct(product);
            setFormData({
                sku: product.sku,
                name: product.name,
                description: product.description || '',
                price: product.price,
                cost: product.cost || 0,
                categoryId: product.categoryId
            });
        } else {
            setCurrentProduct(null);
            setFormData({
                sku: '',
                name: '',
                description: '',
                price: 0,
                cost: 0,
                categoryId: categories.length > 0 ? categories[0].id : 0
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentProduct(null);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Está seguro de eliminar este producto?')) {
            try {
                await api.delete(`/products/${id}`);
                fetchProducts();
            } catch (error) {
                console.error(error);
            }
        }
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const createCategory = async () => {
        const name = prompt("Nombre de la nueva categoría:");
        if (name) {
            try {
                const response = await api.post('/categories', { name, description: '' });
                await fetchCategories();
                if (response.data && response.data.id) {
                    setFormData(prev => ({ ...prev, categoryId: response.data.id }));
                }
            } catch (error) {
                alert("Error al crear categoría");
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-2xl flex items-center text-slate-800">
                    <Package className="mr-2" /> Productos
                </h2>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-lg shadow-blue-500/30 transition-all"
                >
                    <Plus size={20} className="mr-1" /> Nuevo Producto
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 p-4">
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o SKU..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold tracking-wider">
                            <tr>
                                <th className="p-4 border-b">SKU</th>
                                <th className="p-4 border-b">Nombre</th>
                                <th className="p-4 border-b">Categoría</th>
                                <th className="p-4 border-b text-right">Costo</th>
                                <th className="p-4 border-b text-right">Precio</th>
                                <th className="p-4 border-b text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 divide-y divide-gray-100">
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="p-4 font-mono text-sm">{product.sku}</td>
                                    <td className="p-4 font-medium">
                                        <div>{product.name}</div>
                                        <div className="text-xs text-gray-400">{product.description}</div>
                                    </td>
                                    <td className="p-4 text-sm">
                                        {categories.find(c => c.id === product.categoryId)?.name || '-'}
                                    </td>
                                    <td className="p-4 text-right font-medium text-gray-500">
                                        ${(product.cost || 0).toFixed(2)}
                                    </td>
                                    <td className="p-4 text-right font-bold text-slate-800">
                                        ${product.price.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center space-x-2">
                                            <button 
                                                onClick={() => handleOpenModal(product)}
                                                className="text-blue-600 hover:bg-blue-100 p-2 rounded-full transition-colors"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(product.id)}
                                                className="text-red-600 hover:bg-red-100 p-2 rounded-full transition-colors"
                                            >
                                                <Trash size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">
                                        No se encontraron productos.
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
                                {currentProduct ? 'Editar Producto' : 'Nuevo Producto'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.sku}
                                        onChange={(e) => setFormData({...formData, sku: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.cost}
                                        onChange={(e) => setFormData({...formData, cost: parseFloat(e.target.value)})}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.price}
                                        onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea 
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                                <div className="flex gap-2">
                                    <select 
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.categoryId}
                                        onChange={(e) => setFormData({...formData, categoryId: parseInt(e.target.value)})}
                                        required
                                    >
                                        <option value={0} disabled>Seleccione una categoría</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <button 
                                        type="button" 
                                        onClick={createCategory}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-lg transition-colors"
                                        title="Crear nueva categoría"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                                {categories.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1">
                                        No hay categorías. Haga clic en el botón + para crear una.
                                    </p>
                                )}
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

export default Products;

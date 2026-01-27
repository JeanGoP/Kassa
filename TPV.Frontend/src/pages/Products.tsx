import React, { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { Package, Plus, Edit, Trash, X, Search, ChevronDown, ChevronRight } from 'lucide-react';

interface Product {
    id: number;
    sku: string;
    name: string;
    description: string;
    price: number;
    cost: number;
    profitabilityPercentage?: number;
    ivaType: string;
    ivaRate: number;
    impoconsumoRate: number;
    priceIncludesIva: boolean;
    categoryId: number;
    categoryName?: string;
}

interface Category {
    id: number;
    name: string;
    parentId?: number;
    isPrimary?: boolean;
}

interface CategoryNode extends Category {
    children: CategoryNode[];
    level: number;
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
        profitabilityPercentage: 0,
        ivaType: 'Excluido',
        ivaRate: 0,
        impoconsumoRate: 0,
        priceIncludesIva: false,
        categoryId: 0
    });

    const [activeTab, setActiveTab] = useState('features');

    // New state for hierarchical category selector
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [tree, setTree] = useState<CategoryNode[]>([]);
    const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [hasTopOverflow, setHasTopOverflow] = useState(false);
    const [hasBottomOverflow, setHasBottomOverflow] = useState(false);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    // Build tree when categories change
    useEffect(() => {
        if (categories.length > 0) {
            setTree(buildTree(categories));
        }
    }, [categories]);

    // Update visual overflow indicators in category modal
    useEffect(() => {
        const container = scrollRef.current;
        if (!container || !isCategoryModalOpen) {
            setHasTopOverflow(false);
            setHasBottomOverflow(false);
            return;
        }

        const updateOverflow = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            setHasTopOverflow(scrollTop > 0);
            setHasBottomOverflow(scrollTop + clientHeight < scrollHeight - 1);
        };

        updateOverflow();
        container.addEventListener('scroll', updateOverflow);
        return () => {
            container.removeEventListener('scroll', updateOverflow);
        };
    }, [isCategoryModalOpen, tree]);

    const buildTree = (items: Category[]): CategoryNode[] => {
        const map = new Map<number, CategoryNode>();
        const roots: CategoryNode[] = [];

        // Initialize map
        items.forEach(c => {
            map.set(c.id, { ...c, children: [], level: 0 });
        });

        // Build hierarchy
        items.forEach(c => {
            const node = map.get(c.id);
            if (node) {
                if (c.parentId) {
                    const parent = map.get(c.parentId);
                    if (parent) {
                        parent.children.push(node);
                        node.level = parent.level + 1;
                    } else {
                        roots.push(node);
                    }
                } else {
                    roots.push(node);
                }
            }
        });
        
        // Sort
        const sortNodes = (nodes: CategoryNode[]) => {
             nodes.sort((a, b) => a.name.localeCompare(b.name));
             nodes.forEach(n => sortNodes(n.children));
        };
        sortNodes(roots);

        return roots;
    };

    const toggleExpand = (e: React.MouseEvent, categoryId: number) => {
        e.stopPropagation();
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
        }
        setExpandedNodes(newExpanded);
    };

    const handleSelectCategory = (category: CategoryNode) => {
        if (category.isPrimary) return;
        setFormData(prev => ({ ...prev, categoryId: category.id }));
        setIsCategoryModalOpen(false);
    };

    const renderCategoryNode = (node: CategoryNode) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        const isSelected = formData.categoryId === node.id;
        const baseClasses = 'flex items-center px-3 py-2 cursor-pointer transition-colors';
        const selectedClasses = isSelected
            ? ' bg-blue-50 text-blue-700 font-medium'
            : ' hover:bg-gray-50 text-gray-700';
        const primaryClasses = node.isPrimary ? ' opacity-70' : '';
        const className = `${baseClasses}${selectedClasses}${primaryClasses}`;
        const paddingLeft = `${node.level * 16 + 12}px`;

        return (
            <div key={node.id} className="select-none">
                <div 
                    className={className}
                    style={{ paddingLeft }}
                    onClick={() => handleSelectCategory(node)}
                >
                    {hasChildren ? (
                        <button 
                            type="button"
                            onClick={(e) => toggleExpand(e, node.id)}
                            className="p-1 mr-1 hover:bg-gray-200 rounded text-gray-500"
                        >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                    ) : (
                        <span className="w-6 mr-1"></span>
                    )}
                    
                    <span className={node.isPrimary ? 'font-semibold italic' : ''}>
                        {node.name}
                    </span>
                    
                    {isSelected && <span className="ml-auto text-blue-600 text-xs font-bold">✓</span>}
                </div>
                
                {hasChildren && isExpanded && (
                    <div className="border-l border-gray-100 ml-4">
                        {node.children.map(renderCategoryNode)}
                    </div>
                )}
            </div>
        );
    };

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
        setActiveTab('features');
        if (product) {
            setCurrentProduct(product);
            setFormData({
                sku: product.sku,
                name: product.name,
                description: product.description || '',
                price: product.price,
                cost: product.cost || 0,
                profitabilityPercentage: product.profitabilityPercentage || 0,
                ivaType: product.ivaType || 'Excluido',
                ivaRate: product.ivaRate || 0,
                impoconsumoRate: product.impoconsumoRate || 0,
                priceIncludesIva: product.priceIncludesIva,
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
                profitabilityPercentage: 0,
                ivaType: 'Excluido',
                ivaRate: 0,
                impoconsumoRate: 0,
                priceIncludesIva: false,
                categoryId: categories.length > 0 ? categories[0].id : 0
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentProduct(null);
    };

    // Logic for profitability
    const handleCostChange = (val: number) => {
        const newCost = val;
        let newPrice = formData.price;
        
        if (formData.profitabilityPercentage && formData.profitabilityPercentage > 0) {
            newPrice = newCost * (1 + formData.profitabilityPercentage / 100);
        }
        
        setFormData({ ...formData, cost: newCost, price: parseFloat(newPrice.toFixed(2)) });
    };

    const handleProfitabilityChange = (val: number) => {
        const profit = val;
        const newPrice = formData.cost * (1 + profit / 100);
        setFormData({ ...formData, profitabilityPercentage: profit, price: parseFloat(newPrice.toFixed(2)) });
    };

    const handlePriceChange = (val: number) => {
        // If price changes manually, we could update profitability or just leave it.
        // For now, let's update profitability to reflect the new margin
        let profit = 0;
        if (formData.cost > 0) {
            profit = ((val - formData.cost) / formData.cost) * 100;
        }
        setFormData({ ...formData, price: val, profitabilityPercentage: parseFloat(profit.toFixed(2)) });
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
                                    <td colSpan={6} className="p-8 text-center text-gray-400">
                                        No se encontraron productos.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal producto */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                            <h3 className="font-bold text-lg text-slate-800">
                                {currentProduct ? 'Editar Producto' : 'Nuevo Producto'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6">
                            {/* Tabs Navigation */}
                            <div className="flex border-b border-gray-200 mb-6">
                                <button
                                    type="button"
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'features' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setActiveTab('features')}
                                >
                                    Características
                                </button>
                                <button
                                    type="button"
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pricing' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setActiveTab('pricing')}
                                >
                                    Precios y Rentabilidad
                                </button>
                                <button
                                    type="button"
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'taxes' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setActiveTab('taxes')}
                                >
                                    Impuestos
                                </button>
                            </div>

                            <div className="min-h-[300px]">
                                {/* Features Tab */}
                                {activeTab === 'features' && (
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fadeIn">
                                        {/* SKU & Name */}
                                        <div className="md:col-span-3">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.sku}
                                                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="md:col-span-9">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.name}
                                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                required
                                            />
                                        </div>

                                        {/* Description */}
                                        <div className="md:col-span-12">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                            <textarea 
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                rows={4}
                                                value={formData.description}
                                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                            />
                                        </div>

                                        {/* Category */}
                                        <div className="md:col-span-12">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                                            <button
                                                type="button"
                                                onClick={() => setIsCategoryModalOpen(true)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-left bg-white focus:ring-2 focus:ring-blue-500 outline-none flex justify-between items-center"
                                            >
                                                <span className={formData.categoryId ? 'text-gray-900' : 'text-gray-400'}>
                                                    {categories.find(c => c.id === formData.categoryId)?.name || 'Seleccione una categoría'}
                                                </span>
                                                <ChevronDown size={16} className="text-gray-500" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Pricing Tab */}
                                {activeTab === 'pricing' && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                                            <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Cálculo de Precios</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                                                        <input 
                                                            type="number" 
                                                            step="0.01"
                                                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                            value={formData.cost}
                                                            onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rentabilidad (%)</label>
                                                    <div className="relative">
                                                        <input 
                                                            type="number" 
                                                            step="0.01"
                                                            className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                            value={formData.profitabilityPercentage}
                                                            onChange={(e) => handleProfitabilityChange(parseFloat(e.target.value) || 0)}
                                                            placeholder="Opcional"
                                                        />
                                                        <span className="absolute right-3 top-2 text-gray-500">%</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                                                        <input 
                                                            type="number" 
                                                            step="0.01"
                                                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                                                            value={formData.price}
                                                            onChange={(e) => handlePriceChange(parseFloat(e.target.value) || 0)}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-6 flex items-center bg-white p-3 rounded border border-gray-200">
                                                <input
                                                    id="priceIncludesIva"
                                                    type="checkbox"
                                                    className="h-5 w-5 text-blue-600 border-gray-300 rounded mr-3"
                                                    checked={formData.priceIncludesIva}
                                                    onChange={(e) => setFormData({ ...formData, priceIncludesIva: e.target.checked })}
                                                />
                                                <label htmlFor="priceIncludesIva" className="text-sm font-medium text-gray-700 cursor-pointer">
                                                    El precio de venta incluye IVA
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Taxes Tab */}
                                {activeTab === 'taxes' && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                                            <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Configuración de Impuestos</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de IVA</label>
                                                    <select 
                                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={formData.ivaType}
                                                        onChange={(e) => {
                                                            const newType = e.target.value;
                                                            setFormData({
                                                                ...formData, 
                                                                ivaType: newType,
                                                                ivaRate: (newType === 'Exento' || newType === 'Excluido') ? 0 : formData.ivaRate
                                                            });
                                                        }}
                                                    >
                                                        <option value="Excluido">Excluido</option>
                                                        <option value="Exento">Exento</option>
                                                        <option value="Gravado">Gravado (IVA)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa IVA (%)</label>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={formData.ivaRate}
                                                        onChange={(e) => setFormData({...formData, ivaRate: parseFloat(e.target.value)})}
                                                        disabled={formData.ivaType === 'Exento' || formData.ivaType === 'Excluido'}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Impuesto Consumo (%)</label>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={formData.impoconsumoRate}
                                                        onChange={(e) => setFormData({...formData, impoconsumoRate: parseFloat(e.target.value)})}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end pt-6 border-t border-gray-100 mt-6">
                                <button 
                                    type="button" 
                                    onClick={handleCloseModal}
                                    className="text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg mr-2 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-all font-medium"
                                >
                                    Guardar Producto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal selección de categoría */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">
                                Seleccionar categoría
                            </h3>
                            <button
                                onClick={() => setIsCategoryModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 p-4">
                            <p className="text-sm text-gray-500 mb-3">
                                Pulse sobre una categoría de detalle para asignarla al producto.
                            </p>
                            <div className="relative h-full">
                                {hasTopOverflow && (
                                    <div className="pointer-events-none absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent" />
                                )}
                                {hasBottomOverflow && (
                                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent" />
                                )}
                                <div
                                    ref={scrollRef}
                                    className="h-full max-h-[60vh] overflow-y-auto p-2 border border-gray-100 rounded-lg"
                                >
                                    {tree.length === 0 ? (
                                        <div className="p-2 text-sm text-gray-500">
                                            No hay categorías disponibles
                                        </div>
                                    ) : (
                                        tree.map(renderCategoryNode)
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsCategoryModalOpen(false)}
                                className="text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Products;

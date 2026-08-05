import React, { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { Package, Plus, Edit, Trash, X, Search, ChevronDown, ChevronRight } from 'lucide-react';

interface Product {
    id: number;
    sku: string;
    barcode?: string;
    name: string;
    description: string;
    type?: string;
    unitOfMeasure?: string;
    baseUnitId?: number;
    purchaseUnitId?: number;
    purchaseFactorToBase?: number;
    saleUnitId?: number;
    saleFactorToBase?: number;
    allowsFractionalQuantity?: boolean;
    price: number;
    profitabilityPercentage?: number;
    ivaType: string;
    ivaRate: number;
    impoconsumoRate: number;
    priceIncludesIva: boolean;
    brandId?: number;
    brandName?: string;
    categoryId: number;
    categoryName?: string;
}

interface Category {
    id: number;
    name: string;
    parentId?: number;
    isPrimary?: boolean;
}
interface Brand { id: number; name: string; }
interface UnitOfMeasure { id: number; code: string; name: string; symbol: string; allowsDecimals: boolean; }

interface CategoryNode extends Category {
    children: CategoryNode[];
    level: number;
}

const Products = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [units, setUnits] = useState<UnitOfMeasure[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        sku: '',
        barcode: '',
        name: '',
        description: '',
        type: 'Producto',
        unitOfMeasure: 'UND',
        baseUnitId: 0,
        purchaseUnitId: 0,
        purchaseFactorToBase: 1,
        saleUnitId: 0,
        saleFactorToBase: 1,
        allowsFractionalQuantity: false,
        price: 0,
        profitabilityPercentage: 0,
        ivaType: 'Excluido',
        ivaRate: 0,
        impoconsumoRate: 0,
        priceIncludesIva: false,
        brandId: 0,
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
        api.get<Brand[]>('/vehiclecatalogs/brands').then(response => setBrands(response.data)).catch(console.error);
        api.get<UnitOfMeasure[]>('/inventory/units').then(response => {
            setUnits(response.data);
            const defaultUnit = response.data.find(unit => unit.code === 'UND') || response.data[0];
            if (defaultUnit) {
                setFormData(prev => ({
                    ...prev,
                    baseUnitId: prev.baseUnitId || defaultUnit.id,
                    purchaseUnitId: prev.purchaseUnitId || defaultUnit.id,
                    saleUnitId: prev.saleUnitId || defaultUnit.id
                }));
            }
        }).catch(console.error);
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
                await api.put(`/products/${currentProduct.id}`, { ...formData, id: currentProduct.id, unitOfMeasure: units.find(u => u.id === formData.baseUnitId)?.code || 'UND' });
            } else {
                await api.post('/products', { ...formData, unitOfMeasure: units.find(u => u.id === formData.baseUnitId)?.code || 'UND' });
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
                barcode: product.barcode || '',
                name: product.name,
                description: product.description || '',
                type: product.type || 'Producto',
                unitOfMeasure: product.unitOfMeasure || 'UND',
                baseUnitId: product.baseUnitId || 0,
                purchaseUnitId: product.purchaseUnitId || product.baseUnitId || 0,
                purchaseFactorToBase: product.purchaseFactorToBase || 1,
                saleUnitId: product.saleUnitId || product.baseUnitId || 0,
                saleFactorToBase: product.saleFactorToBase || 1,
                allowsFractionalQuantity: product.allowsFractionalQuantity || false,
                price: product.price,
                profitabilityPercentage: product.profitabilityPercentage || 0,
                ivaType: product.ivaType || 'Excluido',
                ivaRate: product.ivaRate || 0,
                impoconsumoRate: product.impoconsumoRate || 0,
                priceIncludesIva: product.priceIncludesIva,
                brandId: product.brandId || 0,
                categoryId: product.categoryId
            });
        } else {
            setCurrentProduct(null);
            const defaultUnitId = units.find(unit => unit.code === 'UND')?.id || units[0]?.id || 0;
            setFormData({
                sku: '',
                barcode: '',
                name: '',
                description: '',
                type: 'Producto',
                unitOfMeasure: 'UND',
                baseUnitId: defaultUnitId,
                purchaseUnitId: defaultUnitId,
                purchaseFactorToBase: 1,
                saleUnitId: defaultUnitId,
                saleFactorToBase: 1,
                allowsFractionalQuantity: false,
                price: 0,
                profitabilityPercentage: 0,
                ivaType: 'Excluido',
                ivaRate: 0,
                impoconsumoRate: 0,
                priceIncludesIva: false,
                brandId: 0,
                categoryId: categories.length > 0 ? categories[0].id : 0
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentProduct(null);
    };

    // Simplified handlers without cost dependency
    const handleProfitabilityChange = (val: number) => {
         setFormData({ ...formData, profitabilityPercentage: val });
    };
    const handlePriceChange = (val: number) => {
         setFormData({ ...formData, price: val });
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
        <div className="k-page">
            <div className="k-page-header flex-col sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                        <Package size={24} />
                    </div>
                    <div>
                        <h2 className="k-page-title">Productos</h2>
                        <p className="k-page-subtitle">Administra repuestos, servicios, precios e impuestos.</p>
                    </div>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="k-button-primary w-full px-4 py-2 text-sm sm:w-auto"
                >
                    <Plus size={20} className="mr-1" /> Nuevo Producto
                </button>
            </div>

            <div className="k-card overflow-hidden p-4">
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
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold tracking-wider">
                            <tr>
                                <th className="p-4 border-b">SKU</th>
                                <th className="p-4 border-b">Nombre</th>
                                <th className="p-4 border-b">Marca</th>
                                <th className="p-4 border-b">Categoría</th>
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
                                    <td className="p-4 text-sm">{product.brandName || 'SIN MARCA'}</td>
                                    <td className="p-4 text-sm">
                                        {categories.find(c => c.id === product.categoryId)?.name || '-'}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="k-document max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto bg-white">
                        <div className="k-panel-header sticky top-0 z-10 flex items-center justify-between px-6 py-4">
                            <h3 className="font-bold text-lg text-slate-800">
                                {currentProduct ? 'Editar Producto' : 'Nuevo Producto'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6">
                            {/* Tabs Navigation */}
                            <div className="mb-6 flex overflow-x-auto border-b border-gray-200">
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
                                    Precios
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
                                        {/* Type, SKU, Barcode & Name */}
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                            <select 
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.type}
                                                onChange={(e) => setFormData({...formData, type: e.target.value})}
                                            >
                                                <option value="Producto">Producto</option>
                                                <option value="Servicio">Servicio</option>
                                            </select>
                                        </div>
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
                                        <div className="md:col-span-3">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Código de Barras</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.barcode}
                                                onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                                                placeholder="EAN / UPC"
                                            />
                                        </div>
                                        <div className="md:col-span-4">
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

                                        {/* Category & Unit of Measure */}
                                        <div className="md:col-span-4">
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
                                        <div className="md:col-span-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">MARCA</label>
                                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={formData.brandId} onChange={(e) => setFormData({...formData, brandId: Number(e.target.value)})}>
                                                <option value={0}>SIN MARCA</option>{brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">UNIDAD BASE</label>
                                            <select
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                value={formData.baseUnitId}
                                                onChange={(e) => {
                                                    const id = Number(e.target.value);
                                                    setFormData({...formData, baseUnitId: id, unitOfMeasure: units.find(unit => unit.id === id)?.code || 'UND'});
                                                }}
                                            >
                                                {units.map(unit => <option key={unit.id} value={unit.id}>{unit.name} ({unit.code})</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">UNIDAD DE COMPRA</label>
                                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={formData.purchaseUnitId} onChange={(e) => setFormData({...formData, purchaseUnitId: Number(e.target.value)})}>
                                                {units.map(unit => <option key={unit.id} value={unit.id}>{unit.name} ({unit.code})</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">UNIDADES BASE POR COMPRA</label>
                                            <input type="number" min="0.000001" step="0.000001" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={formData.purchaseFactorToBase} onChange={(e) => setFormData({...formData, purchaseFactorToBase: Number(e.target.value)})} />
                                        </div>
                                        <div className="md:col-span-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">UNIDAD DE VENTA O CONSUMO</label>
                                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={formData.saleUnitId} onChange={(e) => setFormData({...formData, saleUnitId: Number(e.target.value)})}>
                                                {units.map(unit => <option key={unit.id} value={unit.id}>{unit.name} ({unit.code})</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">UNIDADES BASE POR VENTA</label>
                                            <input type="number" min="0.000001" step="0.000001" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={formData.saleFactorToBase} onChange={(e) => setFormData({...formData, saleFactorToBase: Number(e.target.value)})} />
                                        </div>
                                        <label className="md:col-span-4 flex items-center gap-3 rounded border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700">
                                            <input type="checkbox" checked={formData.allowsFractionalQuantity} onChange={(e) => setFormData({...formData, allowsFractionalQuantity: e.target.checked})} />
                                            ADMITE FRACCIONAMIENTO
                                        </label>
                                    </div>
                                )}

                                {/* Pricing Tab */}
                                {activeTab === 'pricing' && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                                            <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Cálculo de Precios</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rentabilidad (%)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2 text-gray-500">%</span>
                                                        <input 
                                                            type="number" 
                                                            step="0.01"
                                                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                                                            value={formData.profitabilityPercentage || ''}
                                                            onChange={(e) => handleProfitabilityChange(parseFloat(e.target.value) || 0)}
                                                        />
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
                                                            value={formData.price || ''}
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
                                                        value={formData.ivaRate || ''}
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
                                                        value={formData.impoconsumoRate || ''}
                                                        onChange={(e) => setFormData({...formData, impoconsumoRate: parseFloat(e.target.value)})}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
                                <button 
                                    type="button" 
                                    onClick={handleCloseModal}
                                    className="k-button-secondary px-4 py-2 text-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="k-button-primary px-6 py-2 text-sm"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="k-document flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden bg-white">
                        <div className="k-panel-header flex items-center justify-between px-6 py-4">
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
                                className="k-button-secondary px-4 py-2 text-sm"
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

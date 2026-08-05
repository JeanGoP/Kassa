import React, { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { Package, Plus, Edit, Trash, X, Search, ChevronDown, ChevronRight, Link2, Boxes } from 'lucide-react';

interface ProductApplicability {
    vehicleModelId: number;
    brandName?: string;
    modelCode?: string;
    modelName?: string;
    sourceType: string;
}

interface ProductReferenceRelation {
    relatedProductId: number;
    relatedReference?: string;
    relatedDescription?: string;
    relationType: string;
    sourceType: string;
    effectiveFrom?: string | null;
}

interface ProductKitComponent {
    componentProductId: number;
    componentReference?: string;
    componentDescription?: string;
    quantity: number;
    unitOfMeasureId: number;
    unitCode?: string;
}

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
    catalogStatus?: string;
    originType?: string;
    isOfficialCatalog?: boolean;
    manufacturer?: string;
    referenceType?: string;
    minimumOrderQuantity?: number;
    orderMultiple?: number;
    weightKg?: number | null;
    lengthCm?: number | null;
    widthCm?: number | null;
    heightCm?: number | null;
    leadTimeDays?: number | null;
    reorderPoint?: number;
    minimumStock?: number;
    maximumStock?: number;
    categoryId: number;
    categoryName?: string;
    applicabilities?: ProductApplicability[];
    referenceRelations?: ProductReferenceRelation[];
    kitComponents?: ProductKitComponent[];
}

interface Category {
    id: number;
    name: string;
    parentId?: number;
    isPrimary?: boolean;
}
interface Brand { id: number; name: string; }
interface UnitOfMeasure { id: number; code: string; name: string; symbol: string; allowsDecimals: boolean; }
interface VehicleModel { id: number; brandId: number; brandName: string; code: string; name: string; }

interface ProductForm {
    sku: string; barcode: string; name: string; description: string; type: string; unitOfMeasure: string;
    baseUnitId: number; purchaseUnitId: number; purchaseFactorToBase: number; saleUnitId: number;
    saleFactorToBase: number; allowsFractionalQuantity: boolean; price: number; profitabilityPercentage: number;
    ivaType: string; ivaRate: number; impoconsumoRate: number; priceIncludesIva: boolean; brandId: number;
    categoryId: number; catalogStatus: string; originType: string; isOfficialCatalog: boolean;
    manufacturer: string; referenceType: string; minimumOrderQuantity: number; orderMultiple: number;
    weightKg: number; lengthCm: number; widthCm: number; heightCm: number; leadTimeDays: number;
    reorderPoint: number; minimumStock: number; maximumStock: number;
    applicabilities: ProductApplicability[]; referenceRelations: ProductReferenceRelation[]; kitComponents: ProductKitComponent[];
}

const createEmptyForm = (unitId = 0, categoryId = 0): ProductForm => ({
    sku: '', barcode: '', name: '', description: '', type: 'Producto', unitOfMeasure: 'UND',
    baseUnitId: unitId, purchaseUnitId: unitId, purchaseFactorToBase: 1, saleUnitId: unitId,
    saleFactorToBase: 1, allowsFractionalQuantity: false, price: 0, profitabilityPercentage: 0,
    ivaType: 'Excluido', ivaRate: 0, impoconsumoRate: 0, priceIncludesIva: false, brandId: 0,
    categoryId, catalogStatus: 'ACTIVO', originType: 'GENERICO', isOfficialCatalog: false,
    manufacturer: '', referenceType: 'SIMPLE', minimumOrderQuantity: 0, orderMultiple: 0,
    weightKg: 0, lengthCm: 0, widthCm: 0, heightCm: 0, leadTimeDays: 0,
    reorderPoint: 0, minimumStock: 0, maximumStock: 0,
    applicabilities: [], referenceRelations: [], kitComponents: []
});

interface CategoryNode extends Category {
    children: CategoryNode[];
    level: number;
}

const Products = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [units, setUnits] = useState<UnitOfMeasure[]>([]);
    const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState<ProductForm>(() => createEmptyForm());
    const [applicabilityModelId, setApplicabilityModelId] = useState(0);
    const [applicabilitySource, setApplicabilitySource] = useState('CATALOGO_OFICIAL');
    const [relatedProductId, setRelatedProductId] = useState(0);
    const [relationType, setRelationType] = useState('INTERCAMBIABLE');
    const [relationSource, setRelationSource] = useState('CATALOGO_OFICIAL');
    const [relationEffectiveFrom, setRelationEffectiveFrom] = useState('');
    const [componentProductId, setComponentProductId] = useState(0);
    const [componentQuantity, setComponentQuantity] = useState(1);
    const [componentUnitId, setComponentUnitId] = useState(0);

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
        api.get<VehicleModel[]>('/vehiclecatalogs/models').then(response => setVehicleModels(response.data)).catch(console.error);
        api.get<UnitOfMeasure[]>('/inventory/units').then(response => {
            setUnits(response.data);
            const defaultUnit = response.data.find(unit => unit.code === 'UND') || response.data[0];
            if (defaultUnit) {
                setComponentUnitId(defaultUnit.id);
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
                categoryId: product.categoryId,
                catalogStatus: product.catalogStatus || 'NO_CLASIFICADO',
                originType: product.originType || 'NO_CLASIFICADO',
                isOfficialCatalog: product.isOfficialCatalog || false,
                manufacturer: product.manufacturer || '',
                referenceType: product.referenceType || 'SIMPLE',
                minimumOrderQuantity: product.minimumOrderQuantity || 0,
                orderMultiple: product.orderMultiple || 0,
                weightKg: product.weightKg || 0,
                lengthCm: product.lengthCm || 0,
                widthCm: product.widthCm || 0,
                heightCm: product.heightCm || 0,
                leadTimeDays: product.leadTimeDays || 0,
                reorderPoint: product.reorderPoint || 0,
                minimumStock: product.minimumStock || 0,
                maximumStock: product.maximumStock || 0,
                applicabilities: product.applicabilities || [],
                referenceRelations: product.referenceRelations || [],
                kitComponents: product.kitComponents || []
            });
        } else {
            setCurrentProduct(null);
            const defaultUnitId = units.find(unit => unit.code === 'UND')?.id || units[0]?.id || 0;
            setFormData(createEmptyForm(defaultUnitId, categories.length > 0 ? categories[0].id : 0));
        }
        setApplicabilityModelId(0);
        setRelatedProductId(0);
        setRelationEffectiveFrom('');
        setComponentProductId(0);
        setComponentQuantity(1);
        setComponentUnitId(units.find(unit => unit.code === 'UND')?.id || units[0]?.id || 0);
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

    const addApplicability = () => {
        const model = vehicleModels.find(item => item.id === applicabilityModelId);
        if (!model || formData.applicabilities.some(item => item.vehicleModelId === model.id)) return;
        setFormData({
            ...formData,
            applicabilities: [...formData.applicabilities, {
                vehicleModelId: model.id,
                brandName: model.brandName,
                modelCode: model.code,
                modelName: model.name,
                sourceType: applicabilitySource
            }]
        });
        setApplicabilityModelId(0);
    };

    const addReferenceRelation = () => {
        const related = products.find(item => item.id === relatedProductId);
        if (!related || related.id === currentProduct?.id || formData.referenceRelations.some(item =>
            item.relatedProductId === related.id && item.relationType === relationType)) return;
        if (relationType === 'SUSTITUYE_A' && !relationEffectiveFrom) {
            alert('INDIQUE LA FECHA DE VIGENCIA DE LA SUSTITUCIÓN');
            return;
        }
        setFormData({
            ...formData,
            referenceRelations: [...formData.referenceRelations, {
                relatedProductId: related.id,
                relatedReference: related.sku,
                relatedDescription: related.name,
                relationType,
                sourceType: relationSource,
                effectiveFrom: relationType === 'SUSTITUYE_A' ? relationEffectiveFrom : null
            }]
        });
        setRelatedProductId(0);
        setRelationEffectiveFrom('');
    };

    const addKitComponent = () => {
        const component = products.find(item => item.id === componentProductId);
        const unit = units.find(item => item.id === componentUnitId);
        if (!component || !unit || component.id === currentProduct?.id || componentQuantity <= 0 ||
            formData.kitComponents.some(item => item.componentProductId === component.id)) return;
        setFormData({
            ...formData,
            kitComponents: [...formData.kitComponents, {
                componentProductId: component.id,
                componentReference: component.sku,
                componentDescription: component.name,
                quantity: componentQuantity,
                unitOfMeasureId: unit.id,
                unitCode: unit.code
            }]
        });
        setComponentProductId(0);
        setComponentQuantity(1);
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
                    <div className="k-document max-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-y-auto bg-white">
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
                                <button
                                    type="button"
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'catalog' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setActiveTab('catalog')}
                                >
                                    Catálogo
                                </button>
                                <button
                                    type="button"
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'applicability' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setActiveTab('applicability')}
                                >
                                    Aplicabilidad
                                </button>
                                <button
                                    type="button"
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'relations' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setActiveTab('relations')}
                                >
                                    Referencias
                                </button>
                                <button
                                    type="button"
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'logistics' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setActiveTab('logistics')}
                                >
                                    Kit y reposición
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

                                {activeTab === 'catalog' && (
                                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 animate-fadeIn">
                                        <label className="space-y-1">
                                            <span className="text-sm font-bold text-slate-700">ESTADO DEL ARTÍCULO</span>
                                            <select className="w-full rounded border border-slate-300 px-3 py-2" value={formData.catalogStatus} onChange={e => setFormData({...formData, catalogStatus: e.target.value})}>
                                                <option value="ACTIVO">ACTIVO</option>
                                                <option value="DESCONTINUADO">DESCONTINUADO</option>
                                                <option value="BLOQUEADO">BLOQUEADO</option>
                                            </select>
                                        </label>
                                        <label className="space-y-1">
                                            <span className="text-sm font-bold text-slate-700">TIPO DE ARTÍCULO</span>
                                            <select className="w-full rounded border border-slate-300 px-3 py-2" value={formData.originType} onChange={e => setFormData({...formData, originType: e.target.value})}>
                                                <option value="ORIGINAL">ORIGINAL</option>
                                                <option value="HOMOLOGO">HOMÓLOGO</option>
                                                <option value="GENERICO">GENÉRICO</option>
                                                <option value="NO_CLASIFICADO">PENDIENTE DE CLASIFICAR</option>
                                                <option value="NO_APLICA">NO APLICA</option>
                                            </select>
                                        </label>
                                        <label className="space-y-1">
                                            <span className="text-sm font-bold text-slate-700">TIPO DE REFERENCIA</span>
                                            <select className="w-full rounded border border-slate-300 px-3 py-2" value={formData.referenceType} onChange={e => setFormData({...formData, referenceType: e.target.value, kitComponents: e.target.value === 'SIMPLE' ? [] : formData.kitComponents})}>
                                                <option value="SIMPLE">SIMPLE</option>
                                                <option value="KIT">KIT</option>
                                            </select>
                                        </label>
                                        <label className="space-y-1 md:col-span-2">
                                            <span className="text-sm font-bold text-slate-700">FABRICANTE</span>
                                            <input className="w-full rounded border border-slate-300 px-3 py-2 uppercase" value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value.toUpperCase()})} />
                                        </label>
                                        <label className="flex items-center gap-3 border-y border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
                                            <input type="checkbox" checked={formData.isOfficialCatalog} onChange={e => setFormData({...formData, isOfficialCatalog: e.target.checked})} />
                                            EN LISTA OFICIAL VIGENTE
                                        </label>
                                    </div>
                                )}

                                {activeTab === 'applicability' && (
                                    <div className="space-y-5 animate-fadeIn">
                                        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_220px_44px]">
                                            <label className="space-y-1">
                                                <span className="text-sm font-bold text-slate-700">MODELO APLICABLE</span>
                                                <select className="w-full rounded border border-slate-300 px-3 py-2" value={applicabilityModelId} onChange={e => setApplicabilityModelId(Number(e.target.value))}>
                                                    <option value={0}>SELECCIONE MODELO</option>
                                                    {vehicleModels.filter(model => !formData.applicabilities.some(item => item.vehicleModelId === model.id)).map(model => <option key={model.id} value={model.id}>{model.brandName} | {model.code} - {model.name}</option>)}
                                                </select>
                                            </label>
                                            <label className="space-y-1">
                                                <span className="text-sm font-bold text-slate-700">ORIGEN</span>
                                                <select className="w-full rounded border border-slate-300 px-3 py-2" value={applicabilitySource} onChange={e => setApplicabilitySource(e.target.value)}>
                                                    <option value="CATALOGO_OFICIAL">CATÁLOGO OFICIAL</option>
                                                    <option value="OTRA_FUENTE">OTRA FUENTE</option>
                                                </select>
                                            </label>
                                            <button type="button" onClick={addApplicability} className="k-button-primary flex h-10 items-center justify-center" title="AGREGAR MODELO"><Plus size={18} /></button>
                                        </div>
                                        <div className="overflow-x-auto border-y border-slate-200">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="p-3">MARCA</th><th className="p-3">MODELO</th><th className="p-3">ORIGEN</th><th className="w-12 p-3"></th></tr></thead>
                                                <tbody>{formData.applicabilities.map(item => <tr key={item.vehicleModelId} className="border-t border-slate-100"><td className="p-3">{item.brandName}</td><td className="p-3">{item.modelCode} - {item.modelName}</td><td className="p-3">{item.sourceType.replaceAll('_', ' ')}</td><td className="p-3"><button type="button" onClick={() => setFormData({...formData, applicabilities: formData.applicabilities.filter(row => row.vehicleModelId !== item.vehicleModelId)})} className="text-red-600" title="QUITAR"><X size={17} /></button></td></tr>)}</tbody>
                                            </table>
                                            {formData.applicabilities.length === 0 && <div className="p-6 text-center text-sm text-slate-400">SIN MODELOS ASOCIADOS</div>}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'relations' && (
                                    <div className="space-y-5 animate-fadeIn">
                                        <div className="grid grid-cols-1 items-end gap-3 lg:grid-cols-[minmax(0,1fr)_170px_190px_160px_44px]">
                                            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">ARTÍCULO RELACIONADO</span><select className="w-full rounded border border-slate-300 px-3 py-2" value={relatedProductId} onChange={e => setRelatedProductId(Number(e.target.value))}><option value={0}>SELECCIONE REFERENCIA</option>{products.filter(product => product.id !== currentProduct?.id).map(product => <option key={product.id} value={product.id}>{product.sku} - {product.name}</option>)}</select></label>
                                            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">RELACIÓN</span><select className="w-full rounded border border-slate-300 px-3 py-2" value={relationType} onChange={e => setRelationType(e.target.value)}><option value="INTERCAMBIABLE">INTERCAMBIABLE</option><option value="SUSTITUYE_A">SUSTITUYE A</option></select></label>
                                            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">ORIGEN</span><select className="w-full rounded border border-slate-300 px-3 py-2" value={relationSource} onChange={e => setRelationSource(e.target.value)}><option value="CATALOGO_OFICIAL">CATÁLOGO OFICIAL</option><option value="OTRA_FUENTE">OTRA FUENTE</option></select></label>
                                            <label className="space-y-1"><span className="text-sm font-bold text-slate-700">VIGENTE DESDE</span><input type="date" disabled={relationType !== 'SUSTITUYE_A'} className="w-full rounded border border-slate-300 px-3 py-2 disabled:bg-slate-100" value={relationEffectiveFrom} onChange={e => setRelationEffectiveFrom(e.target.value)} /></label>
                                            <button type="button" onClick={addReferenceRelation} className="k-button-primary flex h-10 items-center justify-center" title="AGREGAR RELACIÓN"><Link2 size={18} /></button>
                                        </div>
                                        <div className="overflow-x-auto border-y border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="p-3">REFERENCIA</th><th className="p-3">RELACIÓN</th><th className="p-3">ORIGEN</th><th className="p-3">VIGENCIA</th><th className="w-12 p-3"></th></tr></thead><tbody>{formData.referenceRelations.map((item, index) => <tr key={`${item.relatedProductId}-${item.relationType}`} className="border-t border-slate-100"><td className="p-3">{item.relatedReference} - {item.relatedDescription}</td><td className="p-3">{item.relationType.replaceAll('_', ' ')}</td><td className="p-3">{item.sourceType.replaceAll('_', ' ')}</td><td className="p-3">{item.effectiveFrom ? new Date(item.effectiveFrom).toLocaleDateString('es-CO') : '-'}</td><td className="p-3"><button type="button" onClick={() => setFormData({...formData, referenceRelations: formData.referenceRelations.filter((_, rowIndex) => rowIndex !== index)})} className="text-red-600" title="QUITAR"><X size={17} /></button></td></tr>)}</tbody></table>{formData.referenceRelations.length === 0 && <div className="p-6 text-center text-sm text-slate-400">SIN EQUIVALENCIAS NI SUSTITUCIONES</div>}</div>
                                    </div>
                                )}

                                {activeTab === 'logistics' && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                            <label className="space-y-1"><span className="text-xs font-bold text-slate-600">PEDIDO MÍNIMO</span><input type="number" min="0" step="0.0001" className="w-full rounded border p-2" value={formData.minimumOrderQuantity} onChange={e => setFormData({...formData, minimumOrderQuantity: Number(e.target.value)})} /></label>
                                            <label className="space-y-1"><span className="text-xs font-bold text-slate-600">MÚLTIPLO DE PEDIDO</span><input type="number" min="0" step="0.0001" className="w-full rounded border p-2" value={formData.orderMultiple} onChange={e => setFormData({...formData, orderMultiple: Number(e.target.value)})} /></label>
                                            <label className="space-y-1"><span className="text-xs font-bold text-slate-600">REPOSICIÓN (DÍAS)</span><input type="number" min="0" step="1" className="w-full rounded border p-2" value={formData.leadTimeDays} onChange={e => setFormData({...formData, leadTimeDays: Number(e.target.value)})} /></label>
                                            <label className="space-y-1"><span className="text-xs font-bold text-slate-600">PUNTO DE REORDEN</span><input type="number" min="0" step="0.0001" className="w-full rounded border p-2" value={formData.reorderPoint} onChange={e => setFormData({...formData, reorderPoint: Number(e.target.value)})} /></label>
                                            <label className="space-y-1"><span className="text-xs font-bold text-slate-600">INVENTARIO MÍNIMO</span><input type="number" min="0" step="0.0001" className="w-full rounded border p-2" value={formData.minimumStock} onChange={e => setFormData({...formData, minimumStock: Number(e.target.value)})} /></label>
                                            <label className="space-y-1"><span className="text-xs font-bold text-slate-600">INVENTARIO MÁXIMO</span><input type="number" min="0" step="0.0001" className="w-full rounded border p-2" value={formData.maximumStock} onChange={e => setFormData({...formData, maximumStock: Number(e.target.value)})} /></label>
                                            <label className="space-y-1"><span className="text-xs font-bold text-slate-600">PESO (KG)</span><input type="number" min="0" step="0.0001" className="w-full rounded border p-2" value={formData.weightKg} onChange={e => setFormData({...formData, weightKg: Number(e.target.value)})} /></label>
                                            <div className="grid grid-cols-3 gap-2"><label className="space-y-1"><span className="text-xs font-bold text-slate-600">LARGO</span><input type="number" min="0" step="0.01" className="w-full rounded border p-2" value={formData.lengthCm} onChange={e => setFormData({...formData, lengthCm: Number(e.target.value)})} /></label><label className="space-y-1"><span className="text-xs font-bold text-slate-600">ANCHO</span><input type="number" min="0" step="0.01" className="w-full rounded border p-2" value={formData.widthCm} onChange={e => setFormData({...formData, widthCm: Number(e.target.value)})} /></label><label className="space-y-1"><span className="text-xs font-bold text-slate-600">ALTO</span><input type="number" min="0" step="0.01" className="w-full rounded border p-2" value={formData.heightCm} onChange={e => setFormData({...formData, heightCm: Number(e.target.value)})} /></label></div>
                                        </div>
                                        {formData.referenceType === 'KIT' && <div className="space-y-4 border-t border-slate-200 pt-5">
                                            <div className="flex items-center gap-2 font-bold text-slate-800"><Boxes size={19} /> COMPOSICIÓN DEL KIT</div>
                                            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_130px_180px_44px]"><label className="space-y-1"><span className="text-xs font-bold text-slate-600">COMPONENTE</span><select className="w-full rounded border p-2" value={componentProductId} onChange={e => setComponentProductId(Number(e.target.value))}><option value={0}>SELECCIONE ARTÍCULO</option>{products.filter(product => product.id !== currentProduct?.id).map(product => <option key={product.id} value={product.id}>{product.sku} - {product.name}</option>)}</select></label><label className="space-y-1"><span className="text-xs font-bold text-slate-600">CANTIDAD</span><input type="number" min="0.0001" step="0.0001" className="w-full rounded border p-2" value={componentQuantity} onChange={e => setComponentQuantity(Number(e.target.value))} /></label><label className="space-y-1"><span className="text-xs font-bold text-slate-600">UNIDAD</span><select className="w-full rounded border p-2" value={componentUnitId} onChange={e => setComponentUnitId(Number(e.target.value))}>{units.map(unit => <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>)}</select></label><button type="button" onClick={addKitComponent} className="k-button-primary flex h-10 items-center justify-center" title="AGREGAR COMPONENTE"><Plus size={18} /></button></div>
                                            <div className="overflow-x-auto border-y border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="p-3">COMPONENTE</th><th className="p-3">CANTIDAD</th><th className="w-12 p-3"></th></tr></thead><tbody>{formData.kitComponents.map(item => <tr key={item.componentProductId} className="border-t"><td className="p-3">{item.componentReference} - {item.componentDescription}</td><td className="p-3">{item.quantity} {item.unitCode}</td><td className="p-3"><button type="button" onClick={() => setFormData({...formData, kitComponents: formData.kitComponents.filter(row => row.componentProductId !== item.componentProductId)})} className="text-red-600" title="QUITAR"><X size={17} /></button></td></tr>)}</tbody></table></div>
                                        </div>}
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

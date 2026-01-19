import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { FolderTree, Plus, Edit, Trash, X, ChevronDown, ChevronRight } from 'lucide-react';

interface Category {
    id: number;
    name: string;
    description: string;
    isPrimary: boolean;
    level: number;
    parentId?: number | null;
}

interface CategoryNode extends Category {
    children: CategoryNode[];
}

const Categories = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [tree, setTree] = useState<CategoryNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        parentId: null as number | null,
        isPrimary: true
    });
    const [expandedIds, setExpandedIds] = useState<number[]>([]);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await api.get('/categories');
            const data: Category[] = res.data.map((c: any) => ({
                id: c.id ?? c.Id,
                name: c.name ?? c.Name,
                description: c.description ?? c.Description ?? '',
                isPrimary: c.isPrimary ?? c.IsPrimary ?? false,
                level: c.level ?? c.Level ?? 1,
                parentId: c.parentId ?? c.ParentId ?? null
            }));
            setCategories(data);
            const builtTree = buildTree(data);
            setTree(builtTree);
            setExpandedIds(builtTree.map(n => n.id));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const buildTree = (items: Category[]): CategoryNode[] => {
        const map = new Map<number, CategoryNode>();
        const roots: CategoryNode[] = [];

        items.forEach(c => {
            map.set(c.id, { ...c, children: [] });
        });

        map.forEach(node => {
            if (node.parentId) {
                const parent = map.get(node.parentId);
                if (parent) {
                    parent.children.push(node);
                } else {
                    roots.push(node);
                }
            } else {
                roots.push(node);
            }
        });

        const sortNodes = (nodes: CategoryNode[]) => {
            nodes.sort((a, b) => {
                if (a.level !== b.level) return a.level - b.level;
                return a.name.localeCompare(b.name);
            });
            nodes.forEach(n => sortNodes(n.children));
        };

        sortNodes(roots);
        return roots;
    };

    const handleOpenModal = (category?: Category) => {
        if (category) {
            setCurrentCategory(category);
            setFormData({
                name: category.name,
                description: category.description || '',
                parentId: category.parentId ?? null,
                isPrimary: category.isPrimary
            });
        } else {
            setCurrentCategory(null);
            setFormData({
                name: '',
                description: '',
                parentId: null,
                isPrimary: true
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentCategory(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Send payload with PascalCase to ensure backend binding works correctly
            const payload = {
                Name: formData.name,
                Description: formData.description,
                ParentId: formData.parentId,
                IsPrimary: formData.isPrimary
            };

            if (currentCategory) {
                await api.put(`/categories/${currentCategory.id}`, payload);
            } else {
                await api.post('/categories', payload);
            }

            // Ensure the parent is expanded so the new/edited child is visible
            if (formData.parentId) {
                setExpandedIds(prev => 
                    prev.includes(formData.parentId!) ? prev : [...prev, formData.parentId!]
                );
            }

            await fetchCategories();
            handleCloseModal();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data || 'Error al guardar la categoría');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Está seguro de eliminar esta categoría?')) return;
        try {
            await api.delete(`/categories/${id}`);
            await fetchCategories();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data || 'No se pudo eliminar la categoría');
        }
    };

    const toggleExpand = (id: number) => {
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const renderNode = (node: CategoryNode) => {
        const isExpanded = expandedIds.includes(node.id);
        const hasChildren = node.children.length > 0;

        return (
            <div key={node.id}>
                <div className="flex items-center justify-between py-1">
                    <div className="flex items-center">
                        {hasChildren ? (
                            <button
                                onClick={() => toggleExpand(node.id)}
                                className="mr-1 text-slate-500 hover:text-slate-800"
                            >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                        ) : (
                            <span className="w-4 mr-1" />
                        )}
                        <span className="text-sm font-medium">
                            {node.name}
                            {node.isPrimary && (
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                    Principal
                                </span>
                            )}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() =>
                                handleOpenModal({
                                    id: node.id,
                                    name: node.name,
                                    description: node.description,
                                    isPrimary: node.isPrimary,
                                    level: node.level,
                                    parentId: node.parentId
                                })
                            }
                            className="text-blue-600 hover:bg-blue-50 p-1 rounded-full"
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            onClick={() => handleDelete(node.id)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded-full"
                        >
                            <Trash size={16} />
                        </button>
                    </div>
                </div>
                {hasChildren && isExpanded && (
                    <div className="pl-6 border-l border-slate-200 ml-2">
                        {node.children.map(child => renderNode(child))}
                    </div>
                )}
            </div>
        );
    };

    const renderParentOptions = () => {
        const flat: Category[] = [];
        const visit = (nodes: CategoryNode[]) => {
            nodes.forEach(n => {
                flat.push(n);
                visit(n.children);
            });
        };
        visit(tree);

        return (
            <>
                <option value="">Sin padre (raíz)</option>
                {flat.map(c => (
                    <option key={c.id} value={c.id}>
                        {'-'.repeat(Math.max(0, c.level - 1))} {c.name}
                    </option>
                ))}
            </>
        );
    };

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-2xl flex items-center text-slate-800">
                    <FolderTree className="mr-2" /> Categorías
                </h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-lg shadow-blue-500/30 transition-all"
                >
                    <Plus size={20} className="mr-1" /> Nueva Categoría
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-md border border-slate-100 p-4">
                    <h3 className="font-semibold text-slate-800 mb-3">Árbol de categorías</h3>
                    {tree.length === 0 ? (
                        <div className="text-sm text-slate-400">No hay categorías registradas.</div>
                    ) : (
                        <div className="space-y-1">
                            {tree.map(node => renderNode(node))}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-md border border-slate-100 p-4">
                    <h3 className="font-semibold text-slate-800 mb-3">
                        {currentCategory ? 'Editar categoría' : 'Nueva categoría'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nombre de categoría
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Descripción
                            </label>
                            <textarea
                                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                rows={3}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Categoría padre
                            </label>
                            <select
                                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                value={formData.parentId ?? ''}
                                onChange={e =>
                                    setFormData({
                                        ...formData,
                                        parentId: e.target.value ? Number(e.target.value) : null
                                    })
                                }
                            >
                                {renderParentOptions()}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                id="isPrimary"
                                type="checkbox"
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                checked={formData.isPrimary}
                                onChange={e =>
                                    setFormData({ ...formData, isPrimary: e.target.checked })
                                }
                            />
                            <label htmlFor="isPrimary" className="text-sm text-slate-700">
                                Categoría principal
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center"
                            >
                                <X size={18} className="mr-1" /> Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-colors flex items-center"
                            >
                                Guardar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Categories;

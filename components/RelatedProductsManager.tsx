import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Search, Link as LinkIcon, RefreshCw, AlertCircle, Info, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    getAdminProductRelations,
    addAdminProductRelation,
    removeAdminProductRelation,
    ProductRelation,
    getProducts,
    Product
} from '@/lib/api';

interface Props {
    productId: string;
}

const RELATION_TYPES = [
    { value: 'similar', label: 'Similar (You May Also Like)' },
    { value: 'pairs_with', label: 'Pairs With (Perfect Pairings)' }
];

export default function RelatedProductsManager({ productId }: Props) {
    const [relations, setRelations] = useState<ProductRelation[]>([]);
    const [loading, setLoading] = useState(true);

    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Add form state
    const [selectedTargetId, setSelectedTargetId] = useState('');
    const [selectedType, setSelectedType] = useState('pairs_with');
    const [isBidirectional, setIsBidirectional] = useState(true);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        loadData();
    }, [productId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [relData, prodData] = await Promise.all([
                getAdminProductRelations(productId),
                getProducts()
            ]);
            setRelations(relData || []);
            // Exclude early the current product
            setAllProducts((prodData || []).filter(p => p.product_id !== productId));
        } catch (error) {
            console.error(error);
            toast.error('Failed to load related products');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRelation = async () => {
        if (!selectedTargetId) {
            toast.error('Please select a product');
            return;
        }

        setAdding(true);
        try {
            const res = await addAdminProductRelation(productId, {
                target_product_id: selectedTargetId,
                relation_type: selectedType,
                is_bidirectional: isBidirectional
            });

            if (res.success) {
                toast.success('Relation added successfully');
                setSelectedTargetId('');
                await loadData(); // Reload to get the new relation with details
            } else {
                toast.error(res.message || 'Failed to add relation');
            }
        } catch (error) {
            console.error(error);
            toast.error('An unexpected error occurred');
        } finally {
            setAdding(false);
        }
    };

    const handleRemoveRelation = async (relationId: string) => {
        if (!window.confirm('Are you sure you want to remove this relation?')) return;

        try {
            const res = await removeAdminProductRelation(relationId);
            if (res.success) {
                toast.success('Relation removed');
                setRelations(prev => prev.filter(r => r.relation_id !== relationId));
            } else {
                toast.error(res.message || 'Failed to remove relation');
            }
        } catch (error) {
            console.error(error);
            toast.error('An unexpected error occurred');
        }
    };

    const filteredProducts = allProducts
        .filter(p => {
            // Further exclude products that are already related in the current list
            // (Optional: this stops admins from adding "pairs_with" twice, though DB handles unique constraints)
            const exists = relations.some(r => r.product_id === p.product_id && r.relation_type === selectedType);
            if (exists) return false;

            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return p.product_name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
        })
        .slice(0, 50); // Limit results for UI performance

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Adding new relation */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="font-serif text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <LinkIcon className="w-5 h-5 mr-2 text-purple-600" />
                    Add Related Product
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                    <div className="lg:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search Product</label>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or SKU..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    <div className="lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Product</label>
                        <select
                            value={selectedTargetId}
                            onChange={(e) => setSelectedTargetId(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        >
                            <option value="">-- Select Product --</option>
                            {filteredProducts.map(p => (
                                <option key={p.product_id} value={p.product_id}>
                                    {p.product_name} ({p.sku})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Relation Type</label>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        >
                            {RELATION_TYPES.map(rt => (
                                <option key={rt.value} value={rt.value}>{rt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="lg:col-span-2">
                        <button
                            onClick={handleAddRelation}
                            disabled={!selectedTargetId || adding}
                            className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                        >
                            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                            Add link
                        </button>
                    </div>
                </div>

                <div className="mt-4 flex items-center">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isBidirectional}
                            onChange={(e) => setIsBidirectional(e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-sm text-gray-600 flex items-center">
                            Bidirectional link
                            <span className="ml-1 text-xs text-gray-400" title="If checked, this product will also show up on the target product's page">
                                <Info className="w-3 h-3 inline" />
                            </span>
                        </span>
                    </label>
                </div>
            </div>

            {/* List of existing relations */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-serif font-semibold text-gray-900">Current Relationships</h3>
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        {relations.length} Links
                    </span>
                </div>

                {relations.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <RefreshCw className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                        <p>No related products configured yet.</p>
                        <p className="text-sm mt-1">Use the form above to add manual product links.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {relations.map(rel => (
                            <div key={rel.relation_id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
                                        {rel.thumbnail_url ? (
                                            <img src={rel.thumbnail_url} alt={rel.product_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="w-6 h-6 text-gray-300" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900 flex items-center gap-2">
                                            {rel.product_name}
                                        </div>
                                        <div className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                                            <span>SKU: {rel.sku}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                            <span className="flex items-center gap-1.5 text-purple-600 font-medium">
                                                <div className="px-2 py-0.5 rounded bg-purple-100 text-xs">
                                                    {RELATION_TYPES.find(rt => rt.value === rel.relation_type)?.label || rel.relation_type}
                                                </div>
                                            </span>
                                            {rel.is_bidirectional && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Bidirectional</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveRelation(rel.relation_id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                    title="Remove link"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 border border-blue-100">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">How Related Products Work</p>
                    <p className="opacity-90">
                        Products linked here explicitly override the storefront's algorithm.
                        "Similar" products typically show up in "You May Also Like",
                        while "Pairs With" are injected into the special "Perfect Pairings" section.
                        If no manual links exist, the storefront falls back to algorithmic sorting.
                    </p>
                </div>
            </div>
        </div>
    );
}

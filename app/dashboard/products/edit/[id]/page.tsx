'use client';

import React, { useState, useEffect, use, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCategories, createCategory } from '@/lib/api/category';
import { updateProduct } from '@/lib/api/product';
import { getProduct, uploadProductImage, deleteProductImage, updateProductImage } from '@/lib/api';
import { Category } from '@/types/category';
import { ArrowLeft, ArrowRight, Check, X, Plus, Trash2, ChevronDown, ChevronUp, AlertCircle, Info, Package, Layers, Star, ImageIcon, Maximize2, Loader2, Film, Search, Weight, Droplets, Hash, Zap, Utensils } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import CountryPicker from '@/components/CountryPicker';
import SeoEditor from '@/components/SeoEditor';
import type { SeoData } from '@/lib/api/seo';

// ÔöÇÔöÇÔöÇ Constants ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
type AttributeType = 'Volume' | 'Pack' | 'Flavor' | 'Vintage';
const PREDEFINED_PACKS = ['Single', 'Pack of 2', 'Pack of 4', 'Pack of 6', 'Pack of 12', 'Case'];
const PREDEFINED_UNITS = ['ml', 'L'];

/** Convert a File to a base64 data-URI string */
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

const STEPS = [
    { id: 1, label: 'General Info', icon: Info },
    { id: 2, label: 'Define Variants', icon: Package },
    { id: 3, label: 'Variants', icon: Layers },
    { id: 4, label: 'SEO', icon: Search },
];

// Countries are now provided by CountryPicker component (197 countries with flags)

// ÔöÇÔöÇÔöÇ Types ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
interface VariantRow {
    variant_id?: string;
    weight?: string;
    volume?: string;
    count?: string;
    strength?: string;
    flavor?: string;
    pack?: string;
    combo?: string;
    variant_name: string;
    sku: string;
    price: number;
    cost_price: number;
    stock: number;
    shelf_life: string;
    length_cm: string;
    width_cm: string;
    height_cm: string;
    images: { preview: string; file?: File; asset_id?: string; alt_text?: string }[];
    videos: { preview: string; file?: File; asset_id?: string; alt_text?: string }[];
    defaultImageIndex: number;
    sale_price: string;
    sale_start_date: string;
    sale_start_time: string;
    sale_end_date: string;
    sale_end_time: string;
    isDefault: boolean;
    isActive: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<div className="p-8 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-burgundy" /></div>}>
            <EditProductContent params={params} />
        </Suspense>
    );
}

function EditProductContent({ params }: { params: Promise<{ id: string }> }) {
    const { id: urlId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Parse step from URL or default to 1
    const initialStep = parseInt(searchParams.get('step') || '1', 10);
    const [currentStep, setCurrentStep] = useState(initialStep >= 1 && initialStep <= 4 ? initialStep : 1);

    const [loading, setLoading] = useState(true); // start true — loading product data
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [productStatus, setProductStatus] = useState<string>('');
    const [productSlug, setProductSlug] = useState<string>('');
    const [dbProductId, setDbProductId] = useState<string>('');
    const [categories, setCategories] = useState<Category[]>([]);

    const id = dbProductId || urlId;



    // ÔöÇÔöÇÔöÇ Step 1: General Info State ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const [form, setForm] = useState({
        product_name: '',
        brand: '',
        category_id: '',
        sub_category_id: '',
        country_of_origin: '',
        form_type: '',
        specialities: [] as string[],        intended_use: '',
        description: '',
        available_from_date: '',
        available_from_time: '',
        available_until_date: '',
        available_until_time: '',
    });

    // ÔöÇÔöÇÔöÇ Step 2: Define Variants State ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const [dimConfigs, setDimConfigs] = useState({
        weight: { active: false, values: [] as string[] },
        volume: { active: false, values: [] as string[] },
        count: { active: false, values: [] as string[] },
        strength: { active: false, values: [] as string[] },
        flavor: { active: false, values: [] as string[] },
        pack: { active: false, values: [] as string[] },
        combo: { active: false, values: [] as string[] },
    });
    const [dimInputs, setDimInputs] = useState({
        weight: '', volume: '', count: '', strength: '', flavor: '', pack: '', combo: ''
    });
    const [weightUnit, setWeightUnit] = useState('g');
    const [volUnit, setVolUnit] = useState('ml');
    const [countUnit, setCountUnit] = useState('Tablets');
    const [strengthUnit, setStrengthUnit] = useState('mg');

    // ÔöÇÔöÇÔöÇ Step 3: Variants Table State ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const [autoGenerate, setAutoGenerate] = useState(false);
    const [variants, setVariants] = useState<VariantRow[]>([
        { pack: '', volume: '', variant_name: '', sku: '', price: 0, cost_price: 0, stock: 0, shelf_life: '', length_cm: '', width_cm: '', height_cm: '', images: [], videos: [], defaultImageIndex: 0, sale_price: '', sale_start_date: '', sale_start_time: '', sale_end_date: '', sale_end_time: '', isDefault: false, isActive: true }
    ]);
    const [expandedVariantIndex, setExpandedVariantIndex] = useState<number | null>(null);
    const [sharedImages, setSharedImages] = useState(false);

    // ─── Step 4: SEO State ──────────────────────────────────────────────
    const [seoData, setSeoData] = useState<SeoData>({});

    // ─── Category / Subcategory creation overlay state ─────
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
    const [newCatForm, setNewCatForm] = useState({ name: '', slug: '', description: '' });
    const [newSubCatForm, setNewSubCatForm] = useState({ name: '', slug: '', description: '', parent_id: '' });
    const [catCreating, setCatCreating] = useState(false);
    const [subCatCreating, setSubCatCreating] = useState(false);

    // ─── Fetch categories ─────────────────────────────────
    const refreshCategories = async () => {
        const cats = await getCategories();
        setCategories(cats);
        return cats;
    };

    // ─── Fetch product data on mount and pre-populate form ────────────────────
    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            const [product, cats] = await Promise.all([getProduct(urlId), getCategories()]);
            if (cancelled) return;
            setCategories(cats);

            if (!product) {
                toast.error('Product not found');
                setLoading(false);
                return;
            }

            setProductSlug((product as any).slug || '');
            setDbProductId((product as any).product_id || urlId);

            // ── Step 1: General Info ──
            const productCatId = product.category_id || '';
            const catObj = cats.find(c => c.category_id === productCatId);
            
            let finalCatId = '';
            let finalSubCatId = '';
            
            if (catObj) {
                if (catObj.parent_id) {
                    finalCatId = catObj.parent_id;
                    finalSubCatId = catObj.category_id;
                } else {
                    finalCatId = catObj.category_id;
                    finalSubCatId = '';
                }
            }

            setForm({
                product_name: product.product_name || '',
                brand: product.brand || '',
                category_id: finalCatId,
                sub_category_id: finalSubCatId,
                country_of_origin: product.country_of_origin || (product as any).specifications?.country_of_origin || '',
                form_type: (product as any).form || '',
                specialities: (product as any).specialities || [],

                intended_use: product.intended_use || '',
                description: product.description || '',
                available_from_date: (product as any).available_from ? new Date((product as any).available_from).toISOString().split('T')[0] : '',
                available_from_time: (product as any).available_from ? new Date((product as any).available_from).toISOString().split('T')[1].substring(0, 5) : '',
                available_until_date: (product as any).available_until ? new Date((product as any).available_until).toISOString().split('T')[0] : '',
                available_until_time: (product as any).available_until ? new Date((product as any).available_until).toISOString().split('T')[1].substring(0, 5) : '',
            });

            // Track product status so we can conditionally show "Save as Draft"
            setProductStatus(product.status || 'active');

            // ── Step 2 & 3: Variants ──
            if (Array.isArray(product.variants) && product.variants.length > 0) {
                const newDimConfigs = {
                    weight: { active: false, values: [] as string[] },
                    volume: { active: false, values: [] as string[] },
                    count: { active: false, values: [] as string[] },
                    strength: { active: false, values: [] as string[] },
                    flavor: { active: false, values: [] as string[] },
                    pack: { active: false, values: [] as string[] },
                    combo: { active: false, values: [] as string[] },
                };

                const mappedVariants: VariantRow[] = product.variants.map((v: any, index: number) => {
                    // Legacy field mapping
                    let volStr = v.volume || '';
                    if (!volStr && v.size_label) volStr = v.size_label;
                    if (!volStr && v.volume_ml) {
                        volStr = v.volume_ml >= 1000 ? `${v.volume_ml / 1000} L` : `${v.volume_ml} ml`;
                    }

                    let pkStr = v.pack || '';
                    if (!pkStr && v.pack_quantity && v.pack_quantity > 1) pkStr = `Pack of ${v.pack_quantity}`;
                    else if (!pkStr && v.pack_quantity === 1) pkStr = 'Single';

                    // Parse sale date/time
                    let sale_start_date = '';
                    let sale_start_time = '';
                    let sale_end_date = '';
                    let sale_end_time = '';
                    if (v.sale_start) {
                        const d = new Date(v.sale_start);
                        sale_start_date = d.toISOString().slice(0, 10);
                        sale_start_time = d.toISOString().slice(11, 16);
                    }
                    if (v.sale_end) {
                        const d = new Date(v.sale_end);
                        sale_end_date = d.toISOString().slice(0, 10);
                        sale_end_time = d.toISOString().slice(11, 16);
                    }

                    // Metadata mapping for all dimensions
                    const dims: (keyof typeof newDimConfigs)[] = ['weight', 'volume', 'count', 'strength', 'flavor', 'pack', 'combo'];
                    
                    // Specific mapping for new database fields
                    let weightStr = v.weight || '';
                    if (!weightStr && v.weight_g) {
                        weightStr = v.weight_g >= 1000 ? `${v.weight_g / 1000} kg` : `${v.weight_g} g`;
                    }

                    let countStr = v.count || '';
                    if (!countStr && v.units_count) {
                        countStr = `${v.units_count} ${v.form_factor || ''}`.trim();
                    }

                    let strengthStr = v.strength || '';
                    if (v.strength_unit && !strengthStr.includes(v.strength_unit)) {
                        strengthStr = `${v.strength} ${v.strength_unit}`.trim();
                    }

                    let comboStr = v.combo || '';
                    if (!comboStr && v.is_combo != null) {
                        comboStr = v.is_combo ? 'Yes' : 'No';
                    }

                    dims.forEach(d => {
                        let val = '';
                        if (d === 'weight') val = weightStr;
                        else if (d === 'volume') val = volStr;
                        else if (d === 'count') val = countStr;
                        else if (d === 'strength') val = strengthStr;
                        else if (d === 'pack') val = pkStr;
                        else if (d === 'combo') val = comboStr;
                        else val = v[d] || '';

                        if (val) {
                            newDimConfigs[d].active = true;
                            if (!newDimConfigs[d].values.includes(val)) newDimConfigs[d].values.push(val);
                        }
                    });

                    const vName = v.variant_name || '';

                    // Assets
                    const allAssets: any[] = (product as any).assets || [];
                    const existingImages = allAssets
                        .filter((a: any) => {
                            const mt = (a.media_type || a.mime_type || '').toLowerCase();
                            return !mt.startsWith('video') && (a.variant_id === v.variant_id || (!a.variant_id && index === 0));
                        })
                        .map((a: any) => ({ preview: a.base64_data || a.asset_url, asset_id: a.asset_id, alt_text: a.alt_text || '' }))
                        .filter(img => img.preview);

                    const existingVideos = allAssets
                        .filter((a: any) => {
                            const mt = (a.media_type || a.mime_type || '').toLowerCase();
                            return mt.startsWith('video') && (a.variant_id === v.variant_id || (!a.variant_id && index === 0));
                        })
                        .map((a: any) => ({ preview: a.base64_data || a.asset_url, asset_id: a.asset_id }))
                        .filter(vid => vid.preview);

                    return {
                        variant_id: v.variant_id || undefined,
                        weight: weightStr,
                        volume: volStr,
                        count: countStr,
                        strength: strengthStr,
                        flavor: v.flavor || '',
                        pack: pkStr,
                        combo: comboStr,
                        variant_name: vName,
                        sku: v.variant_sku || v.sku || '',
                        price: Number(v.price) || 0,
                        cost_price: Number(v.cost_price) || 0,
                        stock: Number(v.stock_quantity ?? v.stock) || 0,
                        shelf_life: v.shelf_life_months != null ? String(v.shelf_life_months) : (v.shelf_life || ''),
                        length_cm: v.length_cm != null ? String(v.length_cm) : '',
                        width_cm: v.width_cm != null ? String(v.width_cm) : '',
                        height_cm: v.height_cm != null ? String(v.height_cm) : '',
                        images: existingImages,
                        videos: existingVideos,
                        defaultImageIndex: 0,
                        sale_price: v.sale_price != null ? String(v.sale_price) : '',
                        sale_start_date,
                        sale_start_time,
                        sale_end_date,
                        sale_end_time,
                        isDefault: v.is_default || false,
                        isActive: v.is_active !== false,
                    };
                });

                setVariants(mappedVariants);
                setDimConfigs(newDimConfigs);
            }

            setLoading(false);
        }
        load();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlId]);

    const parentCategories = categories.filter(c => !c.parent_id);
    const selectedParent = categories.find(c => !c.parent_id && c.category_id === form.category_id);
    const subCategories = selectedParent
        ? categories.filter(c => c.parent_id === selectedParent.category_id)
        : [];

    // ÔöÇÔöÇÔöÇ Form helpers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

    const handleCategoryChange = (value: string) => {
        update('category_id', value);
        update('sub_category_id', '');
    };

    const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // ─── Create Category handler ─────────────────────────
    const handleCreateCategory = async () => {
        if (!newCatForm.name.trim()) { toast.error('Category name is required'); return; }
        setCatCreating(true);
        try {
            const slug = newCatForm.slug.trim() || autoSlug(newCatForm.name);
            const res = await createCategory({
                name: newCatForm.name.trim(),
                slug,
                description: newCatForm.description.trim() || undefined,
            });
            if (res.success) {
                toast.success(`Category "${newCatForm.name}" created!`);
                const cats = await refreshCategories();
                update('category_id', res.category?.category_id || '');
                update('sub_category_id', '');
                setNewCatForm({ name: '', slug: '', description: '' });
                setShowCategoryModal(false);
            } else {
                toast.error(res.error || 'Failed to create category');
            }
        } catch { toast.error('Network error'); } finally { setCatCreating(false); }
    };

    // ─── Create Subcategory handler ───────────────────────
    const handleCreateSubcategory = async () => {
        if (!newSubCatForm.name.trim()) { toast.error('Subcategory name is required'); return; }
        if (!newSubCatForm.parent_id) { toast.error('Please select a parent category'); return; }
        setSubCatCreating(true);
        try {
            const slug = newSubCatForm.slug.trim() || autoSlug(newSubCatForm.name);
            const res = await createCategory({
                name: newSubCatForm.name.trim(),
                slug,
                description: newSubCatForm.description.trim() || undefined,
                parent_id: newSubCatForm.parent_id,
            });
            if (res.success) {
                toast.success(`Subcategory "${newSubCatForm.name}" created!`);
                await refreshCategories();
                update('sub_category_id', res.category?.category_id || '');
                setNewSubCatForm({ name: '', slug: '', description: '', parent_id: '' });
                setShowSubcategoryModal(false);
            } else {
                toast.error(res.error || 'Failed to create subcategory');
            }
        } catch { toast.error('Network error'); } finally { setSubCatCreating(false); }
    };

    // ÔöÇÔöÇÔöÇ Step 2: Volume helpers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const toggleDimensionActive = (dim: keyof typeof dimConfigs) => {
        setDimConfigs(prev => {
            const isActivating = !prev[dim].active;
            const next = { ...prev };
            
            if (isActivating) {
                if (dim === 'weight') {
                    next.volume = { ...next.volume, active: false };
                } else if (dim === 'volume') {
                    next.weight = { ...next.weight, active: false };
                }
            }
            
            next[dim] = { ...next[dim], active: isActivating };
            return next;
        });
    };

    const addDimensionValue = (dim: keyof typeof dimConfigs) => {
        const val = dimInputs[dim].trim();
        if (!val && dim !== 'combo') return;
        
        let finalVal = val;
        if (dim === 'weight') finalVal = `${val} ${weightUnit}`;
        else if (dim === 'volume') finalVal = `${val} ${volUnit}`;
        else if (dim === 'count') finalVal = `${val} ${countUnit}`;
        else if (dim === 'strength') finalVal = `${val} ${strengthUnit}`;
        else if (dim === 'combo') finalVal = val.toLowerCase() === 'yes' || val === 'true' ? 'Yes' : 'No';

        if (!dimConfigs[dim].values.includes(finalVal)) {
            setDimConfigs(prev => ({
                ...prev,
                [dim]: { ...prev[dim], values: [...prev[dim].values, finalVal] }
            }));
        }
        setDimInputs(prev => ({ ...prev, [dim]: '' }));
    };

    const removeDimensionValue = (dim: keyof typeof dimConfigs, val: string) => {
        setDimConfigs(prev => ({
            ...prev,
            [dim]: { ...prev[dim], values: prev[dim].values.filter(v => v !== val) }
        }));
    };

    const generateCombinations = () => {
        const activeDims = Object.entries(dimConfigs).filter(([_, c]) => c.active);
        if (activeDims.length === 0) {
            toast.error('Please select at least one dimension');
            return;
        }

        let configs = [{}];
        activeDims.forEach(([id, config]) => {
            const nextConfigs: any[] = [];
            configs.forEach(existing => {
                config.values.forEach(val => {
                    nextConfigs.push({ ...existing, [id]: val });
                });
            });
            configs = nextConfigs;
        });

        const newVariants: VariantRow[] = configs.map(config => {
            const nameParts = activeDims.map(([id]) => (config as any)[id]).filter(Boolean);
            return {
                ...variants[0], // Copy first variant's shared properties
                ...config,
                variant_name: nameParts.join(' / '),
                sku: '',
                variant_id: undefined,
                images: sharedImages ? variants[0].images : [],
                videos: sharedImages ? variants[0].videos : [],
                isDefault: false
            };
        });

        setVariants(newVariants);
        toast.success(`Generated ${newVariants.length} variants`);
    };

    const handleAutoGenerateToggle = (val: boolean) => {
        setAutoGenerate(val);
        if (val) generateCombinations();
    };

    // ÔöÇÔöÇÔöÇ Variant table helpers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const updateVariant = (index: number, field: keyof VariantRow, value: any) => {
        setVariants(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const addVariantRow = () => {
        const anyActiveDim = Object.values(dimConfigs).some(d => d.active);
        const newVariant: any = {
            variant_name: '', sku: '', price: 0, cost_price: 0, stock: 0,
            shelf_life: '', length_cm: '', width_cm: '', height_cm: '', weight_kg: '',
            images: [], videos: [], defaultImageIndex: 0,
            sale_price: '', sale_start_date: '', sale_start_time: '', sale_end_date: '', sale_end_time: '',
            isDefault: false,
            isActive: true
        };

        // Pre-fill fields that only have ONE value
        if (anyActiveDim) {
            Object.entries(dimConfigs).forEach(([key, config]) => {
                if (config.active && config.values.length === 1) {
                    newVariant[key] = config.values[0];
                } else {
                    newVariant[key] = '';
                }
            });
        }

        setVariants(prev => [...prev, newVariant as VariantRow]);
    };

    const setDefaultVariant = (index: number) => {
        setVariants(prev => prev.map((v, i) => ({ ...v, isDefault: i === index })));
    };

    // ÔöÇÔöÇÔöÇ Variant image helpers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const handleVariantImageAdd = (vIdx: number, files: FileList | null) => {
        if (!files) return;
        const newImgs: { preview: string; file: File }[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) { toast.error(`${file.name} is not an image`); continue; }
            if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} exceeds 5MB`); continue; }
            newImgs.push({ preview: URL.createObjectURL(file), file });
        }
        setVariants(prev => {
            const updated = [...prev];
            updated[vIdx] = { ...updated[vIdx], images: [...updated[vIdx].images, ...newImgs] };
            return updated;
        });
    };

    const handleVariantImageAltChange = (vIdx: number, imgIdx: number, altText: string) => {
        setVariants(prev => {
            const updated = [...prev];
            const imgs = [...updated[vIdx].images];
            imgs[imgIdx] = { ...imgs[imgIdx], alt_text: altText };
            updated[vIdx] = { ...updated[vIdx], images: imgs };
            return updated;
        });
    };

    const removeVariantImage = async (vIdx: number, imgIdx: number) => {
        const img = variants[vIdx].images[imgIdx];
        // If this is a server-side image with an asset_id, delete it via API
        if (img.asset_id) {
            const deleted = await deleteProductImage(id, img.asset_id);
            if (!deleted) {
                toast.error('Failed to delete image from server');
                return;
            }
            toast.success('Image deleted');
        }
        setVariants(prev => {
            const updated = [...prev];
            const imgs = [...updated[vIdx].images];
            // Only revoke object URLs for locally-created previews (items with file)
            if (imgs[imgIdx].file) URL.revokeObjectURL(imgs[imgIdx].preview);
            imgs.splice(imgIdx, 1);
            const def = updated[vIdx].defaultImageIndex >= imgs.length ? 0 : updated[vIdx].defaultImageIndex;
            updated[vIdx] = { ...updated[vIdx], images: imgs, defaultImageIndex: def };
            return updated;
        });
    };

    const setDefaultImage = (vIdx: number, imgIdx: number) => {
        setVariants(prev => {
            const updated = [...prev];
            updated[vIdx] = { ...updated[vIdx], defaultImageIndex: imgIdx };
            return updated;
        });
    };

    const reorderVariantImages = (vIdx: number, fromIdx: number, toIdx: number) => {
        if (fromIdx === toIdx) return;
        setVariants(prev => {
            const updated = [...prev];
            const imgs = [...updated[vIdx].images];
            const [moved] = imgs.splice(fromIdx, 1);
            imgs.splice(toIdx, 0, moved);
            // Position 0 is always default after reorder
            updated[vIdx] = { ...updated[vIdx], images: imgs, defaultImageIndex: 0 };
            return updated;
        });
    };

    // ─── Variant video helpers ─────────────────────────────────────────────────
    const handleVariantVideoAdd = (vIdx: number, files: FileList | null) => {
        if (!files) return;
        const newVids: { preview: string; file: File }[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('video/')) { toast.error(`${file.name} is not a video`); continue; }
            if (file.size > 50 * 1024 * 1024) { toast.error(`${file.name} exceeds 50MB`); continue; }
            newVids.push({ preview: URL.createObjectURL(file), file });
        }
        setVariants(prev => {
            const updated = [...prev];
            updated[vIdx] = { ...updated[vIdx], videos: [...updated[vIdx].videos, ...newVids] };
            return updated;
        });
    };

    const removeVariantVideo = async (vIdx: number, vidIdx: number) => {
        const vid = variants[vIdx].videos[vidIdx];
        // If this is a server-side video with an asset_id, delete it via API
        if (vid.asset_id) {
            const deleted = await deleteProductImage(id, vid.asset_id);
            if (!deleted) {
                toast.error('Failed to delete video from server');
                return;
            }
            toast.success('Video deleted');
        }
        setVariants(prev => {
            const updated = [...prev];
            const vids = [...updated[vIdx].videos];
            // Only revoke object URLs for locally-created previews (items with file)
            if (vids[vidIdx].file) URL.revokeObjectURL(vids[vidIdx].preview);
            vids.splice(vidIdx, 1);
            updated[vIdx] = { ...updated[vIdx], videos: vids };
            return updated;
        });
    };

    const removeVariantRow = (index: number) => {
        if (variants.length <= 1) {
            toast.error('At least one variant row is required');
            return;
        }
        setVariants(prev => {
            const wasDefault = prev[index].isDefault;
            const filtered = prev.filter((_, i) => i !== index);
            if (wasDefault && filtered.length > 0) {
                filtered[0].isDefault = true;
            }
            return filtered;
        });
        if (expandedVariantIndex === index) setExpandedVariantIndex(null);
        else if (expandedVariantIndex !== null && expandedVariantIndex > index) setExpandedVariantIndex(expandedVariantIndex - 1);
    };

    const toggleExpandVariant = (index: number) => {
        setExpandedVariantIndex(prev => prev === index ? null : index);
    };

    // ÔöÇÔöÇÔöÇ Step navigation ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const goNext = () => {
        if (currentStep === 1) {
            if (!form.product_name.trim()) {
                toast.error('Product Name is required');
                return;
            }
        }
        if (currentStep === 2) {
            const anyActiveDim = Object.values(dimConfigs).some(d => d.active);
            if (!anyActiveDim) {
                toast.error('Please select at least one variant dimension');
                return;
            }
            // Pre-fill the initial blank row with single-option values
            setVariants(prev => prev.map(v => {
                const updated = { ...v };
                Object.entries(dimConfigs).forEach(([key, config]) => {
                    if (config.active && config.values.length === 1 && !(updated as any)[key]) {
                        (updated as any)[key] = config.values[0];
                    }
                });
                return updated;
            }));
        }
        if (currentStep < STEPS.length) setCurrentStep(prev => prev + 1);
    };

    const goBack = () => {
        if (currentStep > 1) setCurrentStep(prev => prev - 1);
    };

    // ─── Save as Draft (only for draft products) ──────────────────────────────
    const handleSaveAsDraft = async () => {
        if (!form.product_name.trim()) {
            toast.error('Product Name is required to save a draft');
            return;
        }
        const draftSku = (variants.find(v => v.isDefault) ?? variants[0]).sku.trim()
            || `DRAFT-${Date.now()}`;

        const draftPayload = {
            product_name: form.product_name.trim(),
            brand: form.brand.trim() || undefined,
            category_id: form.category_id || undefined,
            sub_category_id: form.sub_category_id || undefined,
            country_of_origin: form.country_of_origin || undefined,
            description: form.description.trim() || undefined,
            intended_use: form.intended_use.trim() || undefined,
            form: form.form_type || undefined,
            specialities: form.specialities,

            sku: draftSku,
            status: 'draft',
            specifications: {
                country_of_origin: form.country_of_origin || undefined,
            },
            variants: variants
                .filter(v => v.sku.trim() || v.variant_name.trim())
                .map(v => {
                    const activeDimensions = Object.entries(dimConfigs)
                        .filter(([_, config]) => config.active)
                        .map(([id]) => (v as any)[id])
                        .filter(Boolean);
                    const combinedName = v.variant_name || activeDimensions.join(' ');

                    // Parse formatted strings for DB fields
                    let weight_g = undefined;
                    if (v.weight) {
                        const [val, unit] = v.weight.split(' ');
                        weight_g = unit === 'kg' ? parseFloat(val) * 1000 : parseFloat(val);
                    }

                    let units_count = undefined;
                    let form_factor = undefined;
                    if (v.count) {
                        const parts = v.count.split(' ');
                        units_count = parseInt(parts[0]);
                        form_factor = parts.slice(1).join(' ');
                    }

                    let strength = undefined;
                    let strength_unit = undefined;
                    if (v.strength) {
                        const parts = v.strength.split(' ');
                        strength = parts[0];
                        strength_unit = parts.slice(1).join(' ');
                    }

                    return {
                        variant_id: v.variant_id || undefined,
                        sku: v.sku.trim() || `${draftSku}-V${Math.random().toString(36).slice(2, 6)}`,
                        variant_name: combinedName || 'Draft Variant',
                        price: Number(v.price) || 0,
                        stock: Number(v.stock) || 0,
                        cost_price: v.cost_price ? Number(v.cost_price) : undefined,
                        volume: v.volume || undefined,
                        pack: v.pack || undefined,
                        isDefault: v.isDefault,
                        isActive: v.isActive,
                        // Sale Management
                        sale_price: v.sale_price || undefined,
                        sale_start_date: v.sale_start_date || undefined,
                        sale_start_time: v.sale_start_time || undefined,
                        sale_end_date: v.sale_end_date || undefined,
                        sale_end_time: v.sale_end_time || undefined,
                        // Dimensions + shelf life
                        length_cm: v.length_cm || undefined,
                        width_cm: v.width_cm || undefined,
                        height_cm: v.height_cm || undefined,
                        shelf_life: v.shelf_life || undefined,
                        // New fields
                        weight_g,
                        units_count,
                        form_factor,
                        strength,
                        strength_unit,
                        flavor: v.flavor || undefined,
                        is_combo: v.combo === 'Yes',
                    };
                }),
            available_from: form.available_from_date ? new Date(`${form.available_from_date}T${form.available_from_time || '00:00'}`).toISOString() : undefined,
            available_until: form.available_until_date ? new Date(`${form.available_until_date}T${form.available_until_time || '23:59'}`).toISOString() : undefined,
            seo: Object.values(seoData).some(v => v) ? seoData : undefined,
        };

        setLoading(true);
        try {
            const result = await updateProduct(id, draftPayload as any);
            if (result.success) {
                // ── Re-fetch product to get DB-assigned variant_ids after syncVariants ──
                let dbVariants: any[] = [];
                try {
                    const refreshed = await getProduct(id, true);
                    if (refreshed?.variants?.length) {
                        dbVariants = refreshed.variants;
                    }
                } catch (e) {
                    console.warn('[handleSaveAsDraft] Could not re-fetch variants for variant_id mapping:', e);
                }

                // ── Upload any NEW images & videos added during editing ──
                const variantsToUpload = sharedImages ? [variants[0]] : variants;
                let totalAssets = 0;
                let uploadedAssets = 0;

                for (const v of variantsToUpload) {
                    totalAssets += v.images.filter((img: any) => img.file).length + v.videos.filter((vid: any) => vid.file).length;
                }

                if (totalAssets > 0) {
                    toast.loading(`Uploading ${totalAssets} new asset(s)...`, { id: 'asset-upload' });
                }

                for (const v of variantsToUpload) {
                    const dbVariant = dbVariants.find(dv => dv.variant_sku === v.sku) || null;
                    const variantId = v.variant_id || dbVariant?.variant_id || undefined;

                    // Upload images
                    for (let imgIdx = 0; imgIdx < v.images.length; imgIdx++) {
                        const img = v.images[imgIdx] as any;
                        if (img.file) {
                            try {
                                const base64 = await fileToBase64(img.file);
                                const uploadResult = await uploadProductImage(id, base64, {
                                    file_name: img.file.name,
                                    is_primary: imgIdx === 0,
                                    sort_order: imgIdx,
                                    media_type: 'image',
                                    variant_id: variantId,
                                    alt_text: img.alt_text
                                });
                                if (uploadResult.success) uploadedAssets++;
                            } catch (e) { console.error(e); }
                        } else if (img.asset_id) {
                            try {
                                await updateProductImage(id, img.asset_id, { alt_text: img.alt_text, is_primary: imgIdx === 0, sort_order: imgIdx, variant_id: variantId });
                            } catch (e) { console.error(e); }
                        }
                    }

                    // Upload videos
                    for (let vidIdx = 0; vidIdx < v.videos.length; vidIdx++) {
                        const vid = v.videos[vidIdx] as any;
                        if (vid.file) {
                            try {
                                const base64 = await fileToBase64(vid.file);
                                const uploadResult = await uploadProductImage(id, base64, {
                                    file_name: vid.file.name,
                                    is_primary: false,
                                    sort_order: 100 + vidIdx,
                                    media_type: 'video',
                                    variant_id: variantId,
                                });
                                if (uploadResult.success) uploadedAssets++;
                            } catch (e) { console.error(e); }
                        } else if (vid.asset_id) {
                            try {
                                await updateProductImage(id, vid.asset_id, { is_primary: false, sort_order: 100 + vidIdx, variant_id: variantId });
                            } catch (e) { console.error(e); }
                        }
                    }
                }

                if (totalAssets > 0) {
                    toast.success(`Uploaded ${uploadedAssets}/${totalAssets} asset(s)`, { id: 'asset-upload' });
                }

                toast.success('Draft saved!');
                router.push('/dashboard/products');
            } else {
                toast.error(result.error || 'Failed to save draft');
            }
        } catch (err) {
            console.error('[handleSaveAsDraft] Error:', err);
            toast.error('Something went wrong saving draft');
        } finally {
            setLoading(false);
        }
    };


    // ÔöÇÔöÇÔöÇ Submit ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const handleSubmit = async () => {
        // ÔöÇÔöÇ Validation ÔöÇÔöÇ
        if (!form.product_name.trim()) {
            toast.error('Product Name is required');
            return;
        }
        // (Auto-generate name if blank)
        const hasEmptySku = variants.some(v => !v.sku.trim());
        if (hasEmptySku) {
            toast.error('All variants must have a SKU');
            return;
        }
        const skuList = variants.map(v => v.sku);
        if (new Set(skuList).size !== skuList.length) {
            toast.error('Variant SKUs must be unique');
            return;
        }

        // ÔöÇÔöÇ Build payload ÔöÇÔöÇ
        const payload = {
            // Core product table fields
            product_name: form.product_name.trim(),
            brand: form.brand.trim() || undefined,
            category_id: form.category_id || undefined,
            sub_category_id: form.sub_category_id || undefined,
            country_of_origin: form.country_of_origin || undefined,
            description: form.description.trim() || undefined,
            intended_use: form.intended_use.trim() || undefined,
            form: form.form_type || undefined,
            specialities: form.specialities.length > 0 ? form.specialities : undefined,
            status: productStatus === 'draft' ? 'active' : undefined,
            // SKU from the default variant (required by products table unique constraint)
            sku: (variants.find(v => v.isDefault) ?? variants[0]).sku.trim(),

            // Country of origin + Dimensions + Shelf Life -> product_specifications
            specifications: {
                country_of_origin: form.country_of_origin || undefined,
            },

            // Full variants array ÔÇö backend maps these to product_variants rows
                    variants: variants.map(v => {
                        const activeDimensions = Object.entries(dimConfigs)
                            .filter(([_, config]) => config.active)
                            .map(([id]) => (v as any)[id])
                            .filter(Boolean);
                        const combinedName = v.variant_name || activeDimensions.join(' ');

                        // Parse formatted strings for DB fields
                        let weight_g = null;
                        if (v.weight) {
                            const [val, unit] = v.weight.split(' ');
                            weight_g = unit === 'kg' ? parseFloat(val) * 1000 : parseFloat(val);
                        }

                        let units_count = null;
                        let form_factor = null;
                        if (v.count) {
                            const parts = v.count.split(' ');
                            units_count = parseInt(parts[0]);
                            form_factor = parts.slice(1).join(' ');
                        }

                        let strength = undefined;
                        let strength_unit = undefined;
                        if (v.strength) {
                            const parts = v.strength.split(' ');
                            strength = parts[0];
                            strength_unit = parts.slice(1).join(' ');
                        }

                        return {
                            variant_id: v.variant_id || undefined,
                            sku: v.sku.trim(),
                            variant_name: combinedName.trim(),
                            price: Number(v.price) || 0,
                            stock: Number(v.stock) || 0,
                            cost_price: v.cost_price ? Number(v.cost_price) : undefined,
                            volume: v.volume || undefined,
                            pack: v.pack || undefined,
                            isDefault: v.isDefault,
                            isActive: v.isActive,
                            // Sale Management
                            sale_price: v.sale_price || undefined,
                            sale_start_date: v.sale_start_date || undefined,
                            sale_start_time: v.sale_start_time || undefined,
                            sale_end_date: v.sale_end_date || undefined,
                            sale_end_time: v.sale_end_time || undefined,
                            // Dimensions + shelf life
                            length_cm: v.length_cm || undefined,
                            width_cm: v.width_cm || undefined,
                            height_cm: v.height_cm || undefined,
                            shelf_life: v.shelf_life || undefined,
                            // New fields
                            weight_g: weight_g,
                            units_count: units_count,
                            form_factor: form_factor,
                            strength: strength,
                            strength_unit: strength_unit,
                            flavor: v.flavor || undefined,
                            is_combo: v.combo === 'Yes',
                        };
                    }),
            available_from: form.available_from_date ? new Date(`${form.available_from_date}T${form.available_from_time || '00:00'}`).toISOString() : undefined,
            available_until: form.available_until_date ? new Date(`${form.available_until_date}T${form.available_until_time || '23:59'}`).toISOString() : undefined,

            // SEO metadata (saved via seo.controller on the backend)
            seo: Object.values(seoData).some(v => v) ? seoData : undefined,
        };

        setLoading(true);
        try {
            const result = await updateProduct(id, payload as any);
            console.log('[handleSubmit] updateProduct result:', JSON.stringify(result, null, 2));

            if (result.success) {
                // ── Re-fetch product to get DB-assigned variant_ids after syncVariants ──
                let dbVariants: any[] = [];
                try {
                    const refreshed = await getProduct(id, true);
                    if (refreshed?.variants?.length) {
                        dbVariants = refreshed.variants;
                    }
                } catch (e) {
                    console.warn('[handleSubmit] Could not re-fetch variants for variant_id mapping:', e);
                }

                // ── Upload any NEW images & videos added during editing ──
                const variantsToUpload = sharedImages ? [variants[0]] : variants;
                let totalAssets = 0;
                let uploadedAssets = 0;

                // Only count assets that have real File objects (newly added, not existing)
                for (const v of variantsToUpload) {
                    totalAssets += v.images.filter(img => img.file).length + v.videos.filter(vid => vid.file).length;
                }

                if (totalAssets > 0) {
                    toast.loading(`Uploading ${totalAssets} new asset(s)...`, { id: 'asset-upload' });
                }

                for (const v of variantsToUpload) {
                    // Match this local variant to its DB variant by SKU to get variant_id
                    const dbVariant = dbVariants.find(dv => dv.variant_sku === v.sku) || null;
                    const variantId = v.variant_id || dbVariant?.variant_id || undefined;

                    // Upload images
                    for (let imgIdx = 0; imgIdx < v.images.length; imgIdx++) {
                        const img = v.images[imgIdx];
                        if (img.file) {
                            try {
                                const base64 = await fileToBase64(img.file);
                                const uploadResult = await uploadProductImage(id, base64, {
                                    file_name: img.file.name,
                                    is_primary: imgIdx === 0,
                                    sort_order: imgIdx,
                                    media_type: 'image',
                                    variant_id: variantId,
                                    alt_text: img.alt_text
                                });
                                if (uploadResult.success) uploadedAssets++;
                                else console.error('[Upload] Image failed:', img.file.name);
                            } catch (e) {
                                console.error('[Upload] Image error:', img.file.name, e);
                            }
                        } else if (img.asset_id) {
                            // Existing image — update metadata
                            try {
                                await updateProductImage(id, img.asset_id, {
                                    alt_text: img.alt_text,
                                    is_primary: imgIdx === 0,
                                    sort_order: imgIdx,
                                    variant_id: variantId
                                });
                            } catch (e) {
                                console.error('[Update] Image metadata error:', e);
                            }
                        }
                    }

                    // Upload videos
                    for (let vidIdx = 0; vidIdx < v.videos.length; vidIdx++) {
                        const vid = v.videos[vidIdx];
                        if (vid.file) {
                            try {
                                const base64 = await fileToBase64(vid.file);
                                const uploadResult = await uploadProductImage(id, base64, {
                                    file_name: vid.file.name,
                                    is_primary: false,
                                    sort_order: 100 + vidIdx,
                                    media_type: 'video',
                                    variant_id: variantId,
                                });
                                if (uploadResult.success) uploadedAssets++;
                                else console.error('[Upload] Video failed:', vid.file.name);
                            } catch (e) {
                                console.error('[Upload] Video error:', vid.file.name, e);
                            }
                        } else if (vid.asset_id) {
                            // Existing video — update metadata
                            try {
                                await updateProductImage(id, vid.asset_id, {
                                    is_primary: false,
                                    sort_order: 100 + vidIdx,
                                    variant_id: variantId
                                });
                            } catch (e) {
                                console.error('[Update] Video metadata error:', e);
                            }
                        }
                    }
                }

                if (totalAssets > 0) {
                    toast.success(`Uploaded ${uploadedAssets}/${totalAssets} asset(s)`, { id: 'asset-upload' });
                }

                toast.success('Product updated successfully!');
                router.push('/dashboard/products');
            } else {
                toast.error(result.error || 'Failed to update product');
            }
        } catch (err) {
            console.error('[handleSubmit] Unexpected error:', err);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const duplicateSkus = variants.map(v => v.sku).filter((sku, i, arr) => sku && arr.indexOf(sku) !== i);
    const activeDims = useMemo(() => Object.entries(dimConfigs).filter(([_, c]) => c.active), [dimConfigs]);

    // Show loading skeleton while product is being fetched initially
    if (loading && variants.length === 1 && !variants[0].sku && !form.product_name) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
                <p className="text-sm text-text-secondary">Loading product data...</p>
            </div>
        );
    }

    // ÔöÇÔöÇÔöÇ Render ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    return (
        <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full overflow-x-hidden">
                {/* ÔöÇÔöÇ Header ÔöÇÔöÇ */}
                <div className="flex items-center gap-3 mb-6">
                    <Link href="/dashboard/products" className="rounded-lg border border-border p-2 hover:bg-gold/[0.06] hover:border-gold/20 transition-all duration-300">
                        <ArrowLeft className="h-4 w-4 text-text-muted" />
                    </Link>
                    <div>
                        <h1 className="font-serif text-2xl font-bold text-gold-soft">Edit Product</h1>
                        <p className="text-sm text-text-secondary">Update details for this product</p>
                    </div>
                </div>

                {/* ÔöÇÔöÇ Main Layout: Sidebar + Content ÔöÇÔöÇ */}
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* ÔöÇÔöÇ Left Sidebar: Step Navigation ÔöÇÔöÇ */}
                    <div className="w-full lg:w-64 flex-shrink-0">
                        <div className="rounded-xl border border-border bg-card-bg p-2 sticky top-6">
                            <nav className="flex flex-col gap-1">
                                {STEPS.map((step) => {
                                    const isCompleted = currentStep > step.id;
                                    const isActive = currentStep === step.id;
                                    const Icon = step.icon;
                                    return (
                                        <button
                                            key={step.id}
                                            type="button"
                                            onClick={() => {
                                                if (step.id < currentStep) {
                                                    setCurrentStep(step.id);
                                                } else if (step.id > currentStep) {
                                                    if (currentStep === 1 && !form.product_name.trim()) {
                                                        toast.error('Product Name is required');
                                                        return;
                                                    }
                                                    const anyActiveDim = Object.values(dimConfigs).some(d => d.active);
                                                    if (currentStep === 2 && !anyActiveDim && step.id > 2) {
                                                        toast.error('Please select at least one variant dimension');
                                                        return;
                                                    }
                                                    setCurrentStep(step.id);
                                                }
                                            }}
                                            className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${isActive
                                                ? 'bg-gold/[0.08] text-gold-soft border border-gold/20'
                                                : isCompleted
                                                    ? 'text-gold-soft hover:bg-gold/[0.04] border border-transparent'
                                                    : 'text-text-secondary hover:bg-white/[0.02] border border-transparent'
                                                }`}
                                        >
                                            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${isCompleted
                                                ? 'bg-gold text-white'
                                                : isActive
                                                    ? 'bg-[#3A1F0B] border-2 border-gold text-gold'
                                                    : 'bg-white/5 border border-border text-text-muted'
                                                }`}>
                                                {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
                                            </div>
                                            {step.label}
                                        </button>
                                    );
                                })}
                            </nav>

                            {/* ÔöÇÔöÇ Sidebar progress indicator ÔöÇÔöÇ */}
                            <div className="mt-4 mx-4 mb-2">
                                <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gold rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-text-muted mt-1.5 text-center">
                                    Step {currentStep} of {STEPS.length}
                                </p>
                            </div>

                            {/* ─── Actions ─── */}
                            <div className="mt-4 px-2 space-y-3 pb-2">
                                {/* Save as Draft — only visible for draft products */}
                                {productStatus === 'draft' && (
                                    <button
                                        type="button"
                                        onClick={handleSaveAsDraft}
                                        disabled={loading}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gold/20 px-4 py-2.5 text-sm font-semibold text-gold-soft hover:bg-gold/[0.06] transition-all duration-300 disabled:opacity-50"
                                    >
                                        {loading ? 'Saving...' : 'Save as Draft'}
                                    </button>
                                )}

                                {currentStep < 4 ? (
                                    <button
                                        type="button"
                                        onClick={goNext}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-[#E8D8B9] hover:bg-primary-light border border-gold/10 transition-all duration-300 shadow-lg shadow-primary/10"
                                    >
                                        Next
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-[#E8D8B9] hover:bg-primary-light border border-gold/10 transition-all duration-300 shadow-lg shadow-primary/10 disabled:opacity-50"
                                    >
                                        <Check className="h-4 w-4" />
                                        {loading ? 'Saving...' : productStatus === 'draft' ? 'Publish Product' : 'Save Changes'}
                                    </button>
                                )}

                                {currentStep > 1 ? (
                                    <button
                                        type="button"
                                        onClick={goBack}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-gold hover:border-gold/30 transition-all duration-300"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back
                                    </button>
                                ) : (
                                    <Link
                                        href="/dashboard/products"
                                        className="flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-gold hover:border-gold/30 transition-all duration-300"
                                    >
                                        Cancel
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ÔöÇÔöÇ Right Content Area ÔöÇÔöÇ */}
                    <div className="flex-1 min-w-0 rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-6 sm:p-8 min-h-[500px]">

                        {/* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ STEP 1: GENERAL INFO ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */}
                        {currentStep === 1 && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div className="border-b border-border pb-3">
                                    <h3 className="font-serif text-lg font-semibold text-gold-soft">General Information</h3>
                                    <p className="text-xs text-text-secondary mt-1">Basic product details and classification</p>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    {/* Product Name - full width */}
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Product Name *</label>
                                        <input
                                            type="text"
                                            value={form.product_name}
                                            onChange={e => update('product_name', e.target.value)}
                                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all"
                                            placeholder="e.g. Ashwagandha Prowess"
                                            required
                                        />
                                    </div>

                                    {/* Brand */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Brand</label>
                                        <input
                                            type="text"
                                            value={form.brand}
                                            onChange={e => update('brand', e.target.value)}
                                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all"
                                            placeholder="Vedashi"
                                        />
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Category</label>
                                        <select
                                            value={form.category_id}
                                            onChange={e => handleCategoryChange(e.target.value)}
                                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 bg-white text-gray-900 transition-all"
                                        >
                                            <option value="">Select category</option>
                                            {parentCategories.map(cat => (
                                                <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => { setNewCatForm({ name: '', slug: '', description: '' }); setShowCategoryModal(true); }}
                                            className="mt-1.5 flex items-center gap-1 text-xs font-medium text-gold hover:text-gold-soft transition-colors"
                                        >
                                            <Plus className="h-3 w-3" /> Add New Category
                                        </button>
                                    </div>

                                    {/* Subcategory */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Subcategory</label>
                                        <select
                                            value={form.sub_category_id}
                                            onChange={e => update('sub_category_id', e.target.value)}
                                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 bg-white text-gray-900 transition-all"
                                            disabled={!form.category_id || subCategories.length === 0}
                                        >
                                            <option value="">
                                                {!form.category_id ? 'Select a category first' : subCategories.length === 0 ? 'No subcategories' : 'Select subcategory'}
                                            </option>
                                            {subCategories.map(cat => (
                                                <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                                            ))}
                                        </select>
                                        {form.category_id && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const parentId = selectedParent?.category_id || '';
                                                    setNewSubCatForm({ name: '', slug: '', description: '', parent_id: parentId });
                                                    setShowSubcategoryModal(true);
                                                }}
                                                className="mt-1.5 flex items-center gap-1 text-xs font-medium text-gold hover:text-gold-soft transition-colors"
                                            >
                                                <Plus className="h-3 w-3" /> Add New Subcategory
                                            </button>
                                        )}
                                    </div>

                                    {/* Country of Origin */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Country of Origin</label>
                                        <CountryPicker
                                            value={form.country_of_origin}
                                            onChange={val => update('country_of_origin', val)}
                                        />
                                    </div>


                                    {/* Form Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Form</label>
                                        <select
                                            value={form.form_type}
                                            onChange={e => update('form_type', e.target.value)}
                                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 bg-white text-gray-900 transition-all"
                                        >
                                            <option value="">Select form</option>
                                            {['Capsules', 'Tablets', 'Powder', 'Syrup', 'Oil', 'Churna'].map(f => (
                                                <option key={f} value={f}>{f}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Specialities */}
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Specialities</label>
                                        <div className="flex flex-wrap gap-3">
                                            {['Drug Free', 'Allergen Free', '100% Natural', 'Vegan', 'Ayurvedic', 'No Added Sugar'].map(spec => {
                                                const isSelected = form.specialities.includes(spec);
                                                return (
                                                    <label key={spec} className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'border-gold bg-gold/10' : 'border-border bg-white/5 hover:border-gold/40'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={e => {
                                                                if (e.target.checked) update('specialities', [...form.specialities, spec]);
                                                                else update('specialities', form.specialities.filter(s => s !== spec));
                                                            }}
                                                            className="w-4 h-4 rounded text-gold focus:ring-gold"
                                                        />
                                                        <span className="text-sm font-medium text-text-primary">{spec}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>                                    {/* Intended Use - full width */}
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Intended Use</label>
                                        <input
                                            type="text"
                                            value={form.intended_use}
                                            onChange={e => update('intended_use', e.target.value)}
                                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all"
                                            placeholder="A daily supplement for stress relief..."
                                        />
                                    </div>

                                    {/* Description - full width */}
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Description</label>
                                        <textarea
                                            value={form.description}
                                            onChange={e => update('description', e.target.value)}
                                            rows={4}
                                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 resize-none transition-all"
                                            placeholder="Describe the product's health benefits, ingredients, and usage instructions..."
                                        />
                                    </div>

                                    {/* Product Availability Scheduling */}
                                    <div className="sm:col-span-2 mt-4 pt-4 border-t border-border">
                                        <h4 className="font-serif font-semibold text-gold-soft mb-4 text-sm flex items-center gap-2">
                                            <AlertCircle size={16} /> Product Availability Scheduling
                                        </h4>
                                        <p className="text-xs text-text-secondary mb-4 max-w-2xl">
                                            Set specific dates and times for when this product goes on sale or becomes hidden. Leave blank for immediate and indefinite availability. Products with a future start date will appear as "Coming Soon".
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            {/* Available From */}
                                            <div className="p-4 rounded-xl border border-border bg-white/[0.02]">
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="block text-sm font-medium text-text-primary">Available From (Start Date)</label>
                                                    {(form.available_from_date || form.available_from_time) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => { update('available_from_date', ''); update('available_from_time', ''); }}
                                                            className="text-xs text-text-muted hover:text-danger transition-colors cursor-pointer"
                                                        >
                                                            Clear
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 mb-1 border-border border rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-gold/20 focus-within:border-gold/40 transition-all bg-white">
                                                    <input
                                                        type="date"
                                                        value={form.available_from_date}
                                                        onChange={e => update('available_from_date', e.target.value)}
                                                        className="w-[60%] px-3 py-2 text-sm focus:outline-none border-r border-border"
                                                    />
                                                    <input
                                                        type="time"
                                                        value={form.available_from_time}
                                                        onChange={e => update('available_from_time', e.target.value)}
                                                        className="w-[40%] px-3 py-2 text-sm focus:outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Available Until */}
                                            <div className="p-4 rounded-xl border border-border bg-white/[0.02]">
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="block text-sm font-medium text-text-primary">Available Until (End Date)</label>
                                                    {(form.available_until_date || form.available_until_time) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => { update('available_until_date', ''); update('available_until_time', ''); }}
                                                            className="text-xs text-text-muted hover:text-danger transition-colors cursor-pointer"
                                                        >
                                                            Clear
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 mb-1 border-border border rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-gold/20 focus-within:border-gold/40 transition-all bg-white">
                                                    <input
                                                        type="date"
                                                        value={form.available_until_date}
                                                        onChange={e => update('available_until_date', e.target.value)}
                                                        className="w-[60%] px-3 py-2 text-sm focus:outline-none border-r border-border"
                                                    />
                                                    <input
                                                        type="time"
                                                        value={form.available_until_time}
                                                        onChange={e => update('available_until_time', e.target.value)}
                                                        className="w-[40%] px-3 py-2 text-sm focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ STEP 2: DEFINE VARIANTS ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */}
                        {currentStep === 2 && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div className="border-b border-border pb-3">
                                    <h3 className="font-serif text-lg font-semibold text-gold-soft">Define Variants</h3>
                                    <p className="text-xs text-text-secondary mt-1">Select variant types and add their values</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Dimension Selection */}
                                    <div className="space-y-4">
                                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Select Variant Types</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {Object.entries(dimConfigs).map(([key, config]) => {
                                                const Icon = key === 'weight' ? Weight : key === 'volume' ? Droplets : key === 'count' ? Hash : key === 'strength' ? Zap : key === 'flavor' ? Utensils : key === 'pack' ? Package : Layers;
                                                return (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => toggleDimensionActive(key as keyof typeof dimConfigs)}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left ${config.active
                                                            ? 'bg-gold/[0.08] border-gold/40 text-gold-soft shadow-sm shadow-gold/10'
                                                            : 'bg-white/[0.02] border-border text-text-secondary hover:border-gold/20 hover:text-text-primary'
                                                            }`}
                                                    >
                                                        <Icon className={`h-4 w-4 ${config.active ? 'text-gold' : 'text-text-muted'}`} />
                                                        <span className="text-sm font-medium capitalize">{key}</span>
                                                        {config.active && <Check className="h-3.5 w-3.5 ml-auto text-gold" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Active Dimension Values */}
                                    <div className="space-y-6">
                                        {Object.entries(dimConfigs).filter(([_, c]) => c.active).map(([key, config]) => (
                                            <div key={key} className="bg-white/[0.03] border border-border rounded-xl p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-serif text-sm font-semibold text-text-primary capitalize">BY {key}</h4>
                                                    <span className="text-[10px] text-text-muted bg-white/5 px-2 py-0.5 rounded-full">{config.values.length} values</span>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {config.values.map(val => (
                                                        <div key={val} className="flex items-center gap-1.5 bg-gold/[0.08] border border-gold/20 text-gold-soft px-2.5 py-1 rounded-lg text-xs font-medium">
                                                            {val}
                                                            <button type="button" onClick={() => removeDimensionValue(key as keyof typeof dimConfigs, val)} className="p-0.5 hover:bg-gold/20 rounded transition-colors">
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex gap-2">
                                                    {key === 'weight' ? (
                                                        <div className="flex flex-1 gap-2">
                                                            <input
                                                                type="number"
                                                                placeholder="e.g. 500"
                                                                value={dimInputs.weight}
                                                                onChange={e => setDimInputs(prev => ({ ...prev, weight: e.target.value }))}
                                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDimensionValue('weight'))}
                                                                className="flex-1 bg-transparent border border-border rounded-lg px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none transition-colors"
                                                            />
                                                            <select
                                                                value={weightUnit}
                                                                onChange={e => setWeightUnit(e.target.value)}
                                                                className="bg-card-bg border border-border rounded-lg px-2 py-1.5 text-xs focus:border-gold/40 focus:outline-none"
                                                            >
                                                                {['g', 'kg', 'mg'].map(u => <option key={u} value={u}>{u}</option>)}
                                                            </select>
                                                        </div>
                                                    ) : key === 'volume' ? (
                                                        <div className="flex flex-1 gap-2">
                                                            <input
                                                                type="number"
                                                                placeholder="e.g. 750"
                                                                value={dimInputs.volume}
                                                                onChange={e => setDimInputs(prev => ({ ...prev, volume: e.target.value }))}
                                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDimensionValue('volume'))}
                                                                className="flex-1 bg-transparent border border-border rounded-lg px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none transition-colors"
                                                            />
                                                            <select
                                                                value={volUnit}
                                                                onChange={e => setVolUnit(e.target.value)}
                                                                className="bg-card-bg border border-border rounded-lg px-2 py-1.5 text-xs focus:border-gold/40 focus:outline-none"
                                                            >
                                                                {['ml', 'L'].map(u => <option key={u} value={u}>{u}</option>)}
                                                            </select>
                                                        </div>
                                                    ) : key === 'count' ? (
                                                        <div className="flex flex-1 gap-2">
                                                            <input
                                                                type="number"
                                                                placeholder="e.g. 60"
                                                                value={dimInputs.count}
                                                                onChange={e => setDimInputs(prev => ({ ...prev, count: e.target.value }))}
                                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDimensionValue('count'))}
                                                                className="flex-1 bg-transparent border border-border rounded-lg px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none transition-colors"
                                                            />
                                                            <select
                                                                value={countUnit}
                                                                onChange={e => setCountUnit(e.target.value)}
                                                                className="bg-card-bg border border-border rounded-lg px-2 py-1.5 text-xs focus:border-gold/40 focus:outline-none"
                                                            >
                                                                {['Sachets', 'Tablets', 'Capsules'].map(u => <option key={u} value={u}>{u}</option>)}
                                                            </select>
                                                        </div>
                                                    ) : key === 'strength' ? (
                                                        <div className="flex flex-1 gap-2">
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. 500"
                                                                value={dimInputs.strength}
                                                                onChange={e => setDimInputs(prev => ({ ...prev, strength: e.target.value }))}
                                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDimensionValue('strength'))}
                                                                className="flex-1 bg-transparent border border-border rounded-lg px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none transition-colors"
                                                            />
                                                            <select
                                                                value={strengthUnit}
                                                                onChange={e => setStrengthUnit(e.target.value)}
                                                                className="bg-card-bg border border-border rounded-lg px-2 py-1.5 text-xs focus:border-gold/40 focus:outline-none"
                                                            >
                                                                {['mg', 'IU'].map(u => <option key={u} value={u}>{u}</option>)}
                                                            </select>
                                                        </div>
                                                    ) : key === 'pack' ? (
                                                        <input
                                                            type="number"
                                                            placeholder="e.g. 1"
                                                            value={dimInputs.pack}
                                                            onChange={e => setDimInputs(prev => ({ ...prev, pack: e.target.value }))}
                                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDimensionValue('pack'))}
                                                            className="flex-1 bg-transparent border border-border rounded-lg px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none transition-colors"
                                                        />
                                                    ) : key === 'combo' ? (
                                                        <div className="flex flex-1 items-center gap-3">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={dimInputs.combo === 'yes'}
                                                                    onChange={e => setDimInputs(prev => ({ ...prev, combo: e.target.checked ? 'yes' : 'no' }))}
                                                                    className="w-4 h-4 rounded border-border text-gold focus:ring-gold"
                                                                />
                                                                <span className="text-sm text-text-primary">Is Combo?</span>
                                                            </label>
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            placeholder={`Add ${key} value...`}
                                                            value={dimInputs[key as keyof typeof dimInputs]}
                                                            onChange={e => setDimInputs(prev => ({ ...prev, [key]: e.target.value }))}
                                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDimensionValue(key as keyof typeof dimConfigs))}
                                                            className="flex-1 bg-transparent border border-border rounded-lg px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none transition-colors"
                                                        />
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => addDimensionValue(key as keyof typeof dimConfigs)}
                                                        className="px-4 py-1.5 bg-gold/10 text-gold hover:bg-gold/20 rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {Object.values(dimConfigs).every(d => !d.active) && (
                                            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-2xl bg-white/[0.01]">
                                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                                    <Plus className="h-6 w-6 text-text-muted" />
                                                </div>
                                                <p className="text-sm font-medium text-text-secondary">No variant types selected</p>
                                                <p className="text-xs text-text-muted mt-1 text-center max-w-[200px]">Select dimensions from the left to start configuring your product variants</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ STEP 3: VARIANTS TABLE ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */}
                        {currentStep === 3 && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div className="border-b border-border pb-3">
                                    <h3 className="font-serif text-lg font-semibold text-gold-soft">Variants</h3>
                                    <p className="text-xs text-text-secondary mt-1">Configure individual variant SKUs, pricing and stock</p>
                                </div>

                                {/* Auto-generate toggle */}
                                <div className="bg-white/[0.03] border border-border rounded-xl p-4">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={autoGenerate}
                                                onChange={e => handleAutoGenerateToggle(e.target.checked)}
                                                className="peer sr-only"
                                            />
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${autoGenerate
                                                ? 'bg-gold border-gold'
                                                : 'border-border group-hover:border-gold/40'
                                                }`}>
                                                {autoGenerate && <Check className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-text-primary">Auto-generate all combinations</span>
                                            <p className="text-xs text-text-secondary mt-0.5">
                                                Creates permutations for: {Object.entries(dimConfigs).filter(([_, c]) => c.active).map(([k]) => k).join(', ')}
                                            </p>
                                        </div>
                                    </label>
                                </div>

                                {/* Variants Table */}
                                <div className="border border-border rounded-xl bg-card-bg overflow-hidden shadow-sm">
                                    <div className="w-full overflow-x-auto">
                                        <table className="min-w-[900px] w-full text-left text-sm whitespace-nowrap">
                                            <thead className="bg-white/5 border-b border-border">
                                                <tr>
                                                    <th className="px-4 py-4 w-10"></th>
                                                    {activeDims.map(([id]: [string, any]) => (
                                                        <th key={id} className="px-4 py-4 font-medium text-text-secondary capitalize">{id}</th>
                                                    ))}
                                                    <th className="px-4 py-4 font-medium text-text-secondary">Variant Name <span className="text-danger text-xs">*</span></th>
                                                    <th className="px-4 py-4 font-medium text-text-secondary">SKU *</th>
                                                    <th className="px-4 py-4 font-medium text-text-secondary">Price ($) *</th>
                                                    <th className="px-4 py-4 font-medium text-text-secondary">Stock</th>
                                                    <th className="px-4 py-4 font-medium text-text-secondary w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/50">
                                                {variants.map((variant, vIdx) => {
                                                    const isDuplicate = variant.sku && duplicateSkus.includes(variant.sku);
                                                    const isExpanded = expandedVariantIndex === vIdx;
                                                    return (
                                                        <React.Fragment key={vIdx}>
                                                            <tr className={`transition-colors ${isExpanded ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}>
                                                                <td className="px-4 py-3 align-top pt-4">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleExpandVariant(vIdx)}
                                                                        className="text-text-muted hover:text-gold transition-colors"
                                                                    >
                                                                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                                                    </button>
                                                                </td>

                                                                {activeDims.map(([id, config]: [string, any]) => (
                                                                    <td key={id} className="px-4 py-3 align-top">
                                                                        {autoGenerate || config.values.length <= 1 ? (
                                                                            <span className="bg-white/5 border border-border px-3 py-1.5 rounded text-xs font-medium text-text-primary">
                                                                                {(variant[id as keyof VariantRow] as string) || (config.values[0] ?? '—')}
                                                                            </span>
                                                                        ) : (
                                                                            <select
                                                                                value={variant[id as keyof VariantRow] as string}
                                                                                onChange={e => updateVariant(vIdx, id as keyof VariantRow, e.target.value)}
                                                                                className="w-full min-w-[120px] rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
                                                                            >
                                                                                <option value="">Select</option>
                                                                                {config.values.map((v: string) => <option key={v} value={v}>{v}</option>)}
                                                                            </select>
                                                                        )}
                                                                    </td>
                                                                ))}

                                                                {/* Variant Name */}
                                                                <td className="px-4 py-3 align-top min-w-[180px]">
                                                                    <input
                                                                        type="text"
                                                                        value={variant.variant_name}
                                                                        onChange={e => updateVariant(vIdx, 'variant_name', e.target.value)}
                                                                        placeholder="Leave blank to use selected dimensions"
                                                                        className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
                                                                    />
                                                                </td>
                                                                {/* SKU */}
                                                                <td className="px-4 py-3 align-top min-w-[150px]">
                                                                    <div className="relative">
                                                                        <input
                                                                            type="text"
                                                                            value={variant.sku}
                                                                            onChange={e => updateVariant(vIdx, 'sku', e.target.value)}
                                                                            placeholder="Variant SKU"
                                                                            className={`w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none bg-transparent transition-colors ${isDuplicate ? 'border-danger focus:border-danger text-danger pr-8' : 'border-border focus:border-gold/40'
                                                                                }`}
                                                                        />
                                                                        {isDuplicate && <AlertCircle className="h-4 w-4 text-danger absolute right-2 top-2" />}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 align-top">
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={variant.price}
                                                                        onChange={e => updateVariant(vIdx, 'price', e.target.value ? parseFloat(e.target.value) : 0)}
                                                                        placeholder="0"
                                                                        className="w-24 rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3 align-top">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={variant.stock}
                                                                        onChange={e => updateVariant(vIdx, 'stock', e.target.value ? parseInt(e.target.value) : 0)}
                                                                        className="w-24 rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3 text-center align-top pt-3">
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setDefaultVariant(vIdx)}
                                                                            title={variant.isDefault ? 'Default variant' : 'Set as default'}
                                                                            className={`p-1.5 rounded-lg transition-colors hover:bg-white/5 ${variant.isDefault ? 'text-gold' : 'text-text-muted hover:text-gold'
                                                                                }`}
                                                                        >
                                                                            <Star className={`h-4 w-4 transition-all duration-300 ${variant.isDefault ? 'fill-amber-400 text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]' : ''}`} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeVariantRow(vIdx)}
                                                                            className="text-text-muted hover:text-danger p-1.5 rounded-lg transition-colors hover:bg-white/5"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>

                                                                    {isExpanded && (
                                                                        <tr className="bg-white/[0.01] border-b border-border">
                                                                            <td colSpan={activeDims.length + 6} className="p-5">
                                                                                <div className="animate-fade-in-up space-y-6">

                                                                            {/* ÔöÇÔöÇ Extra fields row ÔöÇÔöÇ */}
                                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                                                <div>
                                                                                    <label className="block text-xs font-medium text-text-secondary mb-1">Cost Price ($)</label>
                                                                                    <input
                                                                                        type="number" step="0.01" min="0"
                                                                                        value={variant.cost_price}
                                                                                        onChange={e => updateVariant(vIdx, 'cost_price', e.target.value ? parseFloat(e.target.value) : 0)}
                                                                                        onWheel={e => (e.target as HTMLInputElement).blur()}
                                                                                        className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
                                                                                        placeholder="0.00"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="block text-xs font-medium text-text-secondary mb-1">Shelf Life (months)</label>
                                                                                    <input
                                                                                        type="number" min="0"
                                                                                        value={variant.shelf_life}
                                                                                        onChange={e => updateVariant(vIdx, 'shelf_life', e.target.value)}
                                                                                        onWheel={e => (e.target as HTMLInputElement).blur()}
                                                                                        className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
                                                                                        placeholder="e.g. 24"
                                                                                    />
                                                                                </div>
                                                                            </div>

                                                                            {/* ÔöÇÔöÇ Dimensions section ÔöÇÔöÇ */}
                                                                            <div>
                                                                                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Dimensions</p>
                                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                                                    {([
                                                                                        { label: 'Length (cm)', field: 'length_cm' as keyof VariantRow },
                                                                                        { label: 'Width (cm)', field: 'width_cm' as keyof VariantRow },
                                                                                        { label: 'Height (cm)', field: 'height_cm' as keyof VariantRow },
                                                                                    ]).map(({ label, field }) => (
                                                                                        <div key={field}>
                                                                                            <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
                                                                                            <input
                                                                                                type="number" step="0.01" min="0"
                                                                                                value={variant[field] as string}
                                                                                                onChange={e => updateVariant(vIdx, field, e.target.value)}
                                                                                                onWheel={e => (e.target as HTMLInputElement).blur()}
                                                                                                className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
                                                                                                placeholder="0"
                                                                                            />
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>

                                                                            {/* ÔöÇÔöÇ Images + Sale Management: 2-column grid ÔöÇÔöÇ */}
                                                                            {(vIdx === 0 || !sharedImages) && (
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                                                                    {/* LEFT: Images */}
                                                                                    <div>
                                                                                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Images</p>
                                                                                        <div className="flex flex-wrap gap-3">
                                                                                            {variant.images.map((img, imgIdx) => {
                                                                                                const isDefault = imgIdx === 0;
                                                                                                return (
                                                                                                    <div key={imgIdx} className="flex flex-col gap-1 w-24">
                                                                                                        <div
                                                                                                            draggable
                                                                                                            onDragStart={e => {
                                                                                                                e.dataTransfer.setData('text/plain', String(imgIdx));
                                                                                                                e.dataTransfer.effectAllowed = 'move';
                                                                                                            }}
                                                                                                            onDragOver={e => {
                                                                                                                e.preventDefault();
                                                                                                                e.dataTransfer.dropEffect = 'move';
                                                                                                            }}
                                                                                                            onDrop={e => {
                                                                                                                e.preventDefault();
                                                                                                                const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                                                                                                                reorderVariantImages(vIdx, fromIdx, imgIdx);
                                                                                                            }}
                                                                                                            className="relative group w-24 h-24 rounded-lg overflow-hidden border border-border cursor-grab active:cursor-grabbing select-none"
                                                                                                        >
                                                                                                            <img src={img.preview} alt={`img-${imgIdx}`} className="w-full h-full object-cover pointer-events-none" />
                                                                                                            <span className="absolute top-1 right-1 bg-black/60 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{imgIdx + 1}</span>
                                                                                                            {isDefault && (
                                                                                                                <span className="absolute bottom-1 left-1"><Star className="h-3 w-3 fill-gold text-gold" /></span>
                                                                                                            )}
                                                                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                                                <button type="button" onClick={() => setLightboxUrl(img.preview)} className="absolute inset-0 flex items-center justify-center text-white hover:text-gold transition-colors">
                                                                                                                    <Maximize2 className="h-5 w-5" />
                                                                                                                </button>
                                                                                                                <button type="button" onClick={() => removeVariantImage(vIdx, imgIdx)} className="absolute top-1 left-1 p-1 rounded-full bg-black/40 text-white hover:text-red-400 transition-colors">
                                                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                                                </button>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                        <input
                                                                                                            type="text"
                                                                                                            placeholder="Alt text"
                                                                                                            value={img.alt_text || ''}
                                                                                                            onChange={e => handleVariantImageAltChange(vIdx, imgIdx, e.target.value)}
                                                                                                            className="w-full text-[10px] px-1.5 py-1 box-border border border-border rounded bg-white focus:ring-1 focus:ring-gold focus:border-gold placeholder:text-text-muted transition-colors text-text-primary"
                                                                                                        />
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                            <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-gold/40 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors group/up">
                                                                                                <ImageIcon className="h-5 w-5 text-text-muted group-hover/up:text-gold transition-colors" />
                                                                                                <span className="text-[10px] text-text-muted group-hover/up:text-gold">Add</span>
                                                                                                <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleVariantImageAdd(vIdx, e.target.files)} />
                                                                                            </label>
                                                                                        </div>
                                                                                        {variant.images.length > 0 && (
                                                                                            <p className="text-[11px] text-text-muted mt-2">Drag to reorder. Image #1 (Ô¡É) is default.</p>
                                                                                        )}
                                                                                        {vIdx === 0 && (
                                                                                            <label className="flex items-center gap-2 mt-3 cursor-pointer select-none group">
                                                                                                <div
                                                                                                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${sharedImages ? 'bg-gold border-gold' : 'border-border group-hover:border-gold/40'}`}
                                                                                                    onClick={() => setSharedImages(v => !v)}
                                                                                                >
                                                                                                    {sharedImages && <Check className="w-2.5 h-2.5 text-white" />}
                                                                                                </div>
                                                                                                <span className="text-xs text-text-secondary" onClick={() => setSharedImages(v => !v)}>
                                                                                                    All variants share the same images
                                                                                                </span>
                                                                                            </label>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Videos */}
                                                                                    <div className="mt-5">
                                                                                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Videos</p>
                                                                                        <div className="flex flex-wrap gap-3">
                                                                                            {variant.videos.map((vid, vidIdx) => (
                                                                                                <div key={vidIdx} className="relative group w-28 h-20 rounded-lg overflow-hidden border border-border bg-black">
                                                                                                    <p className="text-xs font-semibold text-text-secondary uppercase mb-3">Sale Management</p>           <div className="absolute inset-0 flex items-center justify-center">
                                                                                                        <Film className="h-6 w-6 text-white/70" />
                                                                                                    </div>
                                                                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                                        <button type="button" onClick={() => removeVariantVideo(vIdx, vidIdx)} className="absolute top-1 right-1 p-1 rounded-full bg-black/40 text-white hover:text-red-400 transition-colors">
                                                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                                                        </button>
                                                                                                    </div>
                                                                                                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">VIDEO</span>
                                                                                                </div>
                                                                                            ))}
                                                                                            <label className="w-28 h-20 rounded-lg border-2 border-dashed border-border hover:border-gold/40 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors group/up">
                                                                                                <Film className="h-5 w-5 text-text-muted group-hover/up:text-gold transition-colors" />
                                                                                                <span className="text-[10px] text-text-muted group-hover/up:text-gold">Add Video</span>
                                                                                                <input type="file" accept="video/mp4,video/webm,video/ogg" multiple className="hidden" onChange={e => handleVariantVideoAdd(vIdx, e.target.files)} />
                                                                                            </label>
                                                                                        </div>
                                                                                        <p className="text-[11px] text-text-muted mt-2">MP4, WebM, OGG — max 50MB per file.</p>
                                                                                    </div>

                                                                                    {/* RIGHT: Sale Management */}
                                                                                    <div>
                                                                                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Sale Management</p>
                                                                                        <div className="space-y-3">
                                                                                            <div>
                                                                                                <label className="block text-xs font-medium text-text-secondary mb-1">Sale Price ($)</label>
                                                                                                <input
                                                                                                    type="number" step="0.01" min="0"
                                                                                                    value={variant.sale_price}
                                                                                                    onChange={e => updateVariant(vIdx, 'sale_price', e.target.value)}
                                                                                                    onWheel={e => (e.target as HTMLInputElement).blur()}
                                                                                                    placeholder="0.00"
                                                                                                    className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
                                                                                                />
                                                                                            </div>
                                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                                <div>
                                                                                                    <label className="block text-xs font-medium text-text-secondary mb-1">Sale Start Date</label>
                                                                                                    <input
                                                                                                        type="date"
                                                                                                        value={variant.sale_start_date}
                                                                                                        onChange={e => updateVariant(vIdx, 'sale_start_date', e.target.value)}
                                                                                                        className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors [color-scheme:dark]"
                                                                                                    />
                                                                                                </div>
                                                                                                <div>
                                                                                                    <label className="block text-xs font-medium text-text-secondary mb-1">Start Time</label>
                                                                                                    <input
                                                                                                        type="time"
                                                                                                        value={variant.sale_start_time}
                                                                                                        onChange={e => updateVariant(vIdx, 'sale_start_time', e.target.value)}
                                                                                                        className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors [color-scheme:dark]"
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                                <div>
                                                                                                    <label className="block text-xs font-medium text-text-secondary mb-1">Sale End Date</label>
                                                                                                    <input
                                                                                                        type="date"
                                                                                                        value={variant.sale_end_date}
                                                                                                        onChange={e => updateVariant(vIdx, 'sale_end_date', e.target.value)}
                                                                                                        className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors [color-scheme:dark]"
                                                                                                    />
                                                                                                </div>
                                                                                                <div>
                                                                                                    <label className="block text-xs font-medium text-text-secondary mb-1">End Time</label>
                                                                                                    <input
                                                                                                        type="time"
                                                                                                        value={variant.sale_end_time}
                                                                                                        onChange={e => updateVariant(vIdx, 'sale_end_time', e.target.value)}
                                                                                                        className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors [color-scheme:dark]"
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Table footer */}
                                    <div className="bg-white/5 border-t border-border px-5 py-3 flex items-center justify-between">
                                        <span className="text-sm text-text-secondary">
                                            Total Variants: <strong className="text-text-primary">{variants.length}</strong>
                                        </span>
                                        {!autoGenerate && (
                                            <button
                                                type="button"
                                                onClick={addVariantRow}
                                                className="flex items-center gap-1.5 text-sm font-medium text-gold hover:text-gold-soft transition-colors"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Add Row
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═════════════════════════ STEP 4: SEO ═════════════════════════ */}
                        {currentStep === 4 && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div className="border-b border-border pb-3">
                                    <h3 className="font-serif text-lg font-semibold text-gold-soft">SEO Settings</h3>
                                    <p className="text-xs text-text-secondary mt-1">Configure search engine metadata for this product</p>
                                </div>
                                <SeoEditor
                                    entityType="product"
                                    entityId={id}
                                    entitySlug={productSlug}
                                    entityName={form.product_name}
                                    entityDescription={form.description}
                                    entityBrand={form.brand}
                                    entityCategory={categories.find(c => c.category_id === form.category_id)?.name}
                                    value={seoData}
                                    onChange={setSeoData}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ÔöÇÔöÇ Lightbox modal ÔöÇÔöÇ */}
            {
                lightboxUrl && (
                    <div
                        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                        onClick={() => setLightboxUrl(null)}
                    >
                        <div className="relative max-w-4xl max-h-[90vh] w-full mx-4" onClick={e => e.stopPropagation()}>
                            <button
                                type="button"
                                onClick={() => setLightboxUrl(null)}
                                className="absolute -top-10 right-0 p-2 text-white hover:text-gold transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                            <img
                                src={lightboxUrl}
                                alt="Preview"
                                className="w-full h-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
                            />
                        </div>
                    </div>
                )
            }

            {/* ── Create Category Modal ── */}
            {
                showCategoryModal && (
                    <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowCategoryModal(false)}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="h-1 bg-gradient-to-r from-[#6B2737] to-[#D4A847]" />
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="font-serif font-bold text-gray-900 text-lg">Create New Category</h3>
                                    <button onClick={() => setShowCategoryModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                        <input
                                            type="text"
                                            value={newCatForm.name}
                                            onChange={e => setNewCatForm({ ...newCatForm, name: e.target.value, slug: autoSlug(e.target.value) })}
                                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#D4A847]/40 focus:outline-none focus:ring-1 focus:ring-[#D4A847]/20 text-gray-900"
                                            placeholder="e.g. Wellness"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                                        <input
                                            type="text"
                                            value={newCatForm.slug}
                                            onChange={e => setNewCatForm({ ...newCatForm, slug: e.target.value })}
                                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#D4A847]/40 focus:outline-none focus:ring-1 focus:ring-[#D4A847]/20 text-gray-500"
                                            placeholder="auto-generated-from-name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <textarea
                                            value={newCatForm.description}
                                            onChange={e => setNewCatForm({ ...newCatForm, description: e.target.value })}
                                            rows={3}
                                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#D4A847]/40 focus:outline-none focus:ring-1 focus:ring-[#D4A847]/20 resize-none text-gray-900"
                                            placeholder="Brief description of this category"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowCategoryModal(false)}
                                        className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCreateCategory}
                                        disabled={catCreating}
                                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#6B2737] py-2.5 text-sm font-semibold text-white hover:bg-[#5a2030] transition-colors disabled:opacity-60"
                                    >
                                        {catCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                        Create Category
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ── Create Subcategory Modal ── */}
            {
                showSubcategoryModal && (
                    <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowSubcategoryModal(false)}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="h-1 bg-gradient-to-r from-[#D4A847] to-[#6B2737]" />
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="font-serif font-bold text-gray-900 text-lg">Create New Subcategory</h3>
                                    <button onClick={() => setShowSubcategoryModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                        <input
                                            type="text"
                                            value={newSubCatForm.name}
                                            onChange={e => setNewSubCatForm({ ...newSubCatForm, name: e.target.value, slug: autoSlug(e.target.value) })}
                                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#D4A847]/40 focus:outline-none focus:ring-1 focus:ring-[#D4A847]/20 text-gray-900"
                                            placeholder="e.g. Cabernet Sauvignon"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                                        <input
                                            type="text"
                                            value={newSubCatForm.slug}
                                            onChange={e => setNewSubCatForm({ ...newSubCatForm, slug: e.target.value })}
                                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#D4A847]/40 focus:outline-none focus:ring-1 focus:ring-[#D4A847]/20 text-gray-500"
                                            placeholder="auto-generated-from-name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <textarea
                                            value={newSubCatForm.description}
                                            onChange={e => setNewSubCatForm({ ...newSubCatForm, description: e.target.value })}
                                            rows={3}
                                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#D4A847]/40 focus:outline-none focus:ring-1 focus:ring-[#D4A847]/20 resize-none text-gray-900"
                                            placeholder="Brief description of this subcategory"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category *</label>
                                        <select
                                            value={newSubCatForm.parent_id}
                                            onChange={e => setNewSubCatForm({ ...newSubCatForm, parent_id: e.target.value })}
                                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#D4A847]/40 focus:outline-none focus:ring-1 focus:ring-[#D4A847]/20 bg-white text-gray-900"
                                        >
                                            <option value="">Select parent category</option>
                                            {parentCategories.map(cat => (
                                                <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-400 mt-1">The subcategory will be nested under this parent.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowSubcategoryModal(false)}
                                        className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCreateSubcategory}
                                        disabled={subCatCreating}
                                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#6B2737] py-2.5 text-sm font-semibold text-white hover:bg-[#5a2030] transition-colors disabled:opacity-60"
                                    >
                                        {subCatCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                        Create Subcategory
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}


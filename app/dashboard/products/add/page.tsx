'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCategories, createCategory } from '@/lib/api/category';
import { createProduct } from '@/lib/api/product';
import { uploadProductImage } from '@/lib/api';
import { Category } from '@/types/category';
import { ArrowLeft, ArrowRight, Check, X, Plus, Trash2, ChevronDown, ChevronUp, AlertCircle, Info, Package, Layers, Star, ImageIcon, Maximize2, Loader2, Film, Search, Weight, Droplets, Hash, Zap, Utensils } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import CountryPicker from '@/components/CountryPicker';
import SeoEditor from '@/components/SeoEditor';
import type { SeoData } from '@/lib/api/seo';

// ÔöÇÔöÇÔöÇ Constants ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
export type AttributeType = 'Volume' | 'Pack' | 'Flavor' | 'Vintage';
export const PREDEFINED_PACKS = ['Single', 'Pack of 2', 'Pack of 4', 'Pack of 6', 'Pack of 12', 'Case'];
export const PREDEFINED_UNITS = ['ml', 'L'];

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
    weight: string;
    volume: string;
    count: string;
    strength: string;
    flavor: string;
    pack: string;
    combo: string;
    variant_name: string;
    sku: string;
    price: number;
    cost_price: number;
    stock: number;
    shelf_life: string;
    length_cm: string;
    width_cm: string;
    height_cm: string;
    images: { preview: string; file: File }[];
    videos: { preview: string; file: File }[];
    defaultImageIndex: number;
    sale_price: string;
    sale_start_date: string;
    sale_start_time: string;
    sale_end_date: string;
    sale_end_time: string;
    isDefault: boolean;
    isActive: boolean;
}

// ÔöÇÔöÇÔöÇ Component ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
export default function AddProductPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);

    // ÔöÇÔöÇÔöÇ Step 1: General Info State ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const [form, setForm] = useState({
        product_name: '',
        brand: '',
        category_id: '',
        sub_category_id: '',
        country_of_origin: '',


        intended_use: '',
        description: '',
        available_from_date: '',
        available_from_time: '',
        available_until_date: '',
        available_until_time: '',
    });

    // ÔöÇÔöÇÔöÇ Step 2: Define Variants State ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
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
        weight: '',
        volume: '',
        count: '',
        strength: '',
        flavor: '',
        pack: '',
        combo: '',
    });
    const [volUnit, setVolUnit] = useState('ml');
    const [weightUnit, setWeightUnit] = useState('g');
    const [countUnit, setCountUnit] = useState('Tablets');
    const [strengthUnit, setStrengthUnit] = useState('mg');

    // ÔöÇÔöÇÔöÇ Step 3: Variants Table State ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const [autoGenerate, setAutoGenerate] = useState(false);
    const [variants, setVariants] = useState<VariantRow[]>([
        { weight: '', volume: '', count: '', strength: '', flavor: '', pack: '', combo: '', variant_name: '', sku: '', price: 0, cost_price: 0, stock: 0, shelf_life: '', length_cm: '', width_cm: '', height_cm: '', images: [], videos: [], defaultImageIndex: 0, sale_price: '', sale_start_date: '', sale_start_time: '', sale_end_date: '', sale_end_time: '', isDefault: true, isActive: true }
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

    useEffect(() => {
        refreshCategories();
    }, []);

    const parentCategories = categories.filter(c => !c.parent_id);
    const selectedParent = categories.find(c => !c.parent_id && c.category_id === form.category_id);
    const subCategories = selectedParent
        ? categories.filter(c => c.parent_id === selectedParent.category_id)
        : [];

    // ÔöÇÔöÇÔöÇ Form helpers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

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

    // ÔöÇÔöÇÔöÇ Step 2: Dimension helpers
    const addDimensionValue = (dim: keyof typeof dimConfigs) => {
        const val = dimInputs[dim].trim();
        if (!val && dim !== 'combo') return;

        let finalVal = val;
        if (dim === 'weight') finalVal = `${val} ${weightUnit}`;
        else if (dim === 'volume') finalVal = `${val} ${volUnit}`;
        else if (dim === 'count') finalVal = `${val} ${countUnit}`;
        else if (dim === 'strength') finalVal = `${val} ${strengthUnit}`;
        else if (dim === 'combo') finalVal = val.toLowerCase() === 'yes' || val === 'true' ? 'Yes' : 'No';

        if (dimConfigs[dim].values.includes(finalVal)) {
            toast.error(`This ${dim} already exists`);
            return;
        }

        setDimConfigs(prev => ({
            ...prev,
            [dim]: { ...prev[dim], values: [...prev[dim].values, finalVal] }
        }));
        setDimInputs(prev => ({ ...prev, [dim]: '' }));
    };

    const removeDimensionValue = (dim: keyof typeof dimConfigs, index: number) => {
        setDimConfigs(prev => ({
            ...prev,
            [dim]: { ...prev[dim], values: prev[dim].values.filter((_, i) => i !== index) }
        }));
    };

    const toggleDimensionActive = (dim: keyof typeof dimConfigs) => {
        setDimConfigs(prev => ({
            ...prev,
            [dim]: { ...prev[dim], active: !prev[dim].active }
        }));
    };

    // ÔöÇÔöÇÔöÇ Step 3: Generate Combinations
    const generateCombinations = (): VariantRow[] => {
        const activeDimensions = Object.entries(dimConfigs)
            .filter(([_, config]) => config.active && config.values.length > 0)
            .map(([dim, config]) => ({ dim, values: config.values }));

        if (activeDimensions.length === 0) return [];

        const cartesian = (arrays: string[][]) => {
            return arrays.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())), [[]] as string[][]);
        };

        const dimensionValues = activeDimensions.map(d => d.values);
        const products = cartesian(dimensionValues);

        return products.map(product => {
            const variant: VariantRow = {
                weight: '', volume: '', count: '', strength: '', flavor: '', pack: '', combo: '',
                variant_name: '', sku: '', price: 0, cost_price: 0, stock: 0,
                shelf_life: '', length_cm: '', width_cm: '', height_cm: '',
                images: [], videos: [], defaultImageIndex: 0,
                sale_price: '', sale_start_date: '', sale_start_time: '', sale_end_date: '', sale_end_time: '',
                isDefault: false, isActive: true
            };

            product.forEach((val, i) => {
                const dimName = activeDimensions[i].dim as keyof VariantRow;
                (variant as any)[dimName] = val;
            });

            variant.variant_name = product.join(' ');
            return variant;
        });
    };

    // ÔöÇÔöÇÔöÇ Auto-generate toggle handler ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const handleAutoGenerateToggle = (checked: boolean) => {
        setAutoGenerate(checked);
        if (checked) {
            const combos = generateCombinations();
            if (combos.length === 0) {
                toast.error('Please add at least one active dimension in Step 2');
                setAutoGenerate(false);
                return;
            }
            setVariants(combos);
            toast.success(`Generated ${combos.length} variant combinations`);
        } else {
            setVariants([{ weight: '', volume: '', count: '', strength: '', flavor: '', pack: '', combo: '', variant_name: '', sku: '', price: 0, cost_price: 0, stock: 0, shelf_life: '', length_cm: '', width_cm: '', height_cm: '', images: [], videos: [], defaultImageIndex: 0, sale_price: '', sale_start_date: '', sale_start_time: '', sale_end_date: '', sale_end_time: '', isDefault: false, isActive: true }]);
        }
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
        setVariants(prev => [...prev, {
            weight: '', volume: '', count: '', strength: '', flavor: '', pack: '', combo: '',
            variant_name: '', sku: '', price: 0, cost_price: 0, stock: 0,
            shelf_life: '', length_cm: '', width_cm: '', height_cm: '',
            images: [], videos: [], defaultImageIndex: 0,
            sale_price: '', sale_start_date: '', sale_start_time: '', sale_end_date: '', sale_end_time: '',
            isDefault: false,
            isActive: true
        }]);
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

    const removeVariantImage = (vIdx: number, imgIdx: number) => {
        setVariants(prev => {
            const updated = [...prev];
            const imgs = [...updated[vIdx].images];
            URL.revokeObjectURL(imgs[imgIdx].preview);
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

    const removeVariantVideo = (vIdx: number, vidIdx: number) => {
        setVariants(prev => {
            const updated = [...prev];
            const vids = [...updated[vIdx].videos];
            URL.revokeObjectURL(vids[vidIdx].preview);
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
        } else if (currentStep === 2) {
            const activeDims = Object.entries(dimConfigs).filter(([_, c]) => c.active);
            if (activeDims.length === 0) {
                toast.error('Please select at least one variant dimension');
                return;
            }
            if (activeDims.some(([_, c]) => c.values.length === 0)) {
                toast.error('Please add at least one value for each selected dimension');
                return;
            }
        } else if (currentStep === 3) {
            if (variants.length === 0) {
                toast.error('Please add at least one variant');
                return;
            }
            // Ensure all variants have SKU and Price
            const invalidVariant = variants.find(v => !v.sku.trim() || !v.price);
            if (invalidVariant) {
                toast.error('Please ensure all variants have an SKU and a Price');
                return;
            }
        }

        if (currentStep < STEPS.length) setCurrentStep(prev => prev + 1);
    };

    const goBack = () => {
        if (currentStep > 1) setCurrentStep(prev => prev - 1);
    };

    // ─── Save as Draft ────────────────────────────────────────────────────────
    const handleSaveAsDraft = async () => {
        if (!form.product_name.trim()) {
            toast.error('Product Name is required to save a draft');
            return;
        }
        // Draft requires at least a placeholder SKU — auto-generate one from name if blank
        const draftSku = (variants.find(v => v.isDefault) ?? variants[0]).sku.trim()
            || `DRAFT-${Date.now()}`;

        const draftPayload = {
            product_name: form.product_name.trim(),
            brand: form.brand.trim() || undefined,
            category_id: form.category_id || undefined,
            sub_category_id: form.sub_category_id || undefined,
            description: form.description.trim() || undefined,
            intended_use: form.intended_use.trim() || undefined,


            sku: draftSku,
            status: 'draft',
            specifications: form.country_of_origin ? { country_of_origin: form.country_of_origin } : undefined,
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
                        sku: v.sku.trim() || `${draftSku}-V${Math.random().toString(36).slice(2, 6)}`,
                        variant_name: combinedName || 'Draft Variant',
                        price: Number(v.price) || 0,
                        stock: Number(v.stock) || 0,
                        cost_price: v.cost_price ? Number(v.cost_price) : undefined,
                        volume: v.volume || undefined,
                        pack: v.pack || undefined,
                        isDefault: v.isDefault,
                        // New fields
                        weight_g: weight_g,
                        units_count: units_count,
                        form_factor: form_factor,
                        strength: strength,
                        strength_unit: strength_unit,
                        flavor: v.flavor || undefined,
                        is_combo: v.combo === 'Yes',
                        sale_price: v.sale_price || undefined,
                    };
                }),
            available_from: form.available_from_date ? new Date(`${form.available_from_date}T${form.available_from_time || '00:00'}`).toISOString() : undefined,
            available_until: form.available_until_date ? new Date(`${form.available_until_date}T${form.available_until_time || '23:59'}`).toISOString() : undefined,
        };

        setLoading(true);
        try {
            const result = await createProduct(draftPayload as any);
            if (result.success) {
                toast.success('Draft saved! View it in the Drafts panel.');
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
        const hasEmptyVariantName = variants.some(v => !v.variant_name.trim());
        if (hasEmptyVariantName) {
            toast.error('All variants must have a Variant Name');
            return;
        }
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
            description: form.description.trim() || undefined,
            intended_use: form.intended_use.trim() || undefined,



            // SKU from the default variant (required by products table unique constraint)
            sku: (variants.find(v => v.isDefault) ?? variants[0]).sku.trim(),

            // Country of origin ÔåÆ product_specifications
            specifications: form.country_of_origin
                ? { country_of_origin: form.country_of_origin }
                : undefined,

            // Full variants array — backend maps these to product_variants rows
            variants: variants.map(v => {
                // Concatenate all active dimensions into variant_name for display/backend fallback
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
                    sku: v.sku.trim(),
                    variant_name: combinedName.trim(),
                    price: Number(v.price) || 0,
                    stock: Number(v.stock) || 0,
                    cost_price: v.cost_price ? Number(v.cost_price) : undefined,
                    volume: v.volume || undefined,    // “750 ml” → parsed to volume_ml by backend
                    pack: v.pack || undefined,        // “Pack of 2” → pack_quantity=2 by backend
                    isDefault: v.isDefault,
                    // Sale Management
                    sale_price: v.sale_price || undefined,
                    sale_start_date: v.sale_start_date || undefined,
                    sale_start_time: v.sale_start_time || undefined,
                    sale_end_date: v.sale_end_date || undefined,
                    sale_end_time: v.sale_end_time || undefined,
                    // Dimensions + shelf life → product_specifications
                    length_cm: v.length_cm || undefined,
                    width_cm: v.width_cm || undefined,
                    height_cm: v.height_cm || undefined,
                    shelf_life: v.shelf_life || undefined,      // → shelf_life_months by backend
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

            // SEO metadata
            seo: Object.values(seoData).some(v => v) ? seoData : undefined,
        };

        setLoading(true);
        try {
            const result = await createProduct(payload);
            console.log('[handleSubmit] createProduct result:', JSON.stringify(result, null, 2));

            if (result.success && result.product) {
                const productId = result.product.product_id;
                const dbVariants = result.variants || []; // Getting variants from response

                console.log('[handleSubmit] Product created with ID:', productId);

                // ── Upload images & videos for each variant ──
                const variantsToUpload = sharedImages ? [variants[0]] : variants;
                let totalAssets = 0;
                let uploadedAssets = 0;

                // Count total assets
                for (const v of variantsToUpload) {
                    totalAssets += v.images.length + v.videos.length;
                }

                console.log('[handleSubmit] Total assets to upload:', totalAssets);

                if (totalAssets > 0) {
                    toast.loading(`Uploading ${totalAssets} asset(s)...`, { id: 'asset-upload' });
                }

                for (const v of variantsToUpload) {
                    // Match local variant with DB variant by SKU to get the variant_id
                    const dbVariant = dbVariants.find((dv: any) => dv.variant_sku === v.sku.trim());
                    const variantId = dbVariant?.variant_id;

                    // Upload images
                    for (let imgIdx = 0; imgIdx < v.images.length; imgIdx++) {
                        const img = v.images[imgIdx];
                        try {
                            const base64 = await fileToBase64(img.file);
                            await uploadProductImage(productId, base64, {
                                file_name: img.file.name,
                                is_primary: imgIdx === 0,
                                sort_order: imgIdx,
                                media_type: 'image',
                                variant_id: variantId, // Pass variant_id
                            });
                            uploadedAssets++;
                        } catch (e) {
                            console.error('[Upload] Image failed:', img.file.name, e);
                        }
                    }

                    // Upload videos
                    for (let vidIdx = 0; vidIdx < v.videos.length; vidIdx++) {
                        const vid = v.videos[vidIdx];
                        try {
                            const base64 = await fileToBase64(vid.file);
                            await uploadProductImage(productId, base64, {
                                file_name: vid.file.name,
                                is_primary: false,
                                sort_order: 100 + vidIdx,
                                media_type: 'video',
                                variant_id: variantId, // Pass variant_id
                            });
                            uploadedAssets++;
                        } catch (e) {
                            console.error('[Upload] Video failed:', vid.file.name, e);
                        }
                    }
                }

                if (totalAssets > 0) {
                    toast.success(`Uploaded ${uploadedAssets}/${totalAssets} asset(s)`, { id: 'asset-upload' });
                }

                toast.success('Product created successfully!');
                router.push('/dashboard/products');
            } else {
                toast.error(result.error || 'Failed to create product');
            }
        } catch (err) {
            console.error('[handleSubmit] Unexpected error:', err);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const duplicateSkus = variants.map(v => v.sku).filter((sku, i, arr) => sku && arr.indexOf(sku) !== i);

    // ÔöÇÔöÇÔöÇ Render ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    return (
        <>
            <div>
                {/* ÔöÇÔöÇ Header ÔöÇÔöÇ */}
                <div className="flex items-center gap-3 mb-6">
                    <Link href="/dashboard/products" className="rounded-lg border border-border p-2 hover:bg-gold/[0.06] hover:border-gold/20 transition-all duration-300">
                        <ArrowLeft className="h-4 w-4 text-text-muted" />
                    </Link>
                    <div>
                        <h1 className="font-serif text-2xl font-bold text-gold-soft">Add New Product</h1>
                        <p className="text-sm text-text-secondary">Fill in the details to create a new product</p>
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

                            {/* ÔöÇÔöÇ Actions ÔöÇÔöÇ */}
                            <div className="mt-4 px-2 space-y-3 pb-2">
                                {/* Save as Draft — always visible on all steps */}
                                <button
                                    type="button"
                                    onClick={handleSaveAsDraft}
                                    disabled={loading}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-gold/20 px-4 py-2.5 text-sm font-semibold text-gold-soft hover:bg-gold/[0.06] transition-all duration-300 disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save as Draft'}
                                </button>

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
                                        {loading ? 'Creating...' : 'Create Product'}
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
                    <div className="flex-1 rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-6 sm:p-8 min-h-[500px]">

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



                                    {/* Intended Use - full width */}
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
                                        <h4 className="font-semibold text-gold-soft mb-4 text-sm flex items-center gap-2">
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
                        {/* ─── STEP 2: DEFINE VARIANTS ─── */}
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
                                                    <h4 className="text-sm font-semibold text-text-primary capitalize">BY {key}</h4>
                                                    <span className="text-[10px] text-text-muted bg-white/5 px-2 py-0.5 rounded-full">{config.values.length} values</span>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {config.values.map((val, i) => (
                                                        <div key={i} className="flex items-center gap-1.5 bg-gold/[0.08] border border-gold/20 text-gold-soft px-2.5 py-1 rounded-lg text-xs font-medium">
                                                            {val}
                                                            <button type="button" onClick={() => removeDimensionValue(key as keyof typeof dimConfigs, i)} className="p-0.5 hover:bg-gold/20 rounded transition-colors">
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
                                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDimensionValue('weight'); } }}
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
                                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDimensionValue('volume'); } }}
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
                                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDimensionValue('count'); } }}
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
                                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDimensionValue('strength'); } }}
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
                                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDimensionValue('pack'); } }}
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
                                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDimensionValue(key as keyof typeof dimConfigs); } }}
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

                                {/* Auto-generate checkbox */}
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
                                                Creates permutations of all selected dimensions below
                                            </p>
                                        </div>
                                    </label>
                                </div>

                                {(() => {
                                    const activeDims = Object.entries(dimConfigs).filter(([_, c]) => c.active);
                                    return (
                                        <div className="border border-border rounded-xl bg-card-bg overflow-hidden shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="bg-white/5 border-b border-border">
                                                        <tr>
                                                            <th className="px-4 py-4 w-10"></th>
                                                            {activeDims.map(([id]) => (
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

                                                                        {activeDims.map(([id, config]) => (
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
                                                                                        {config.values.map(v => <option key={v} value={v}>{v}</option>)}
                                                                                    </select>
                                                                                )}
                                                                            </td>
                                                                        ))}

                                                                        {/* Variant Name */}
                                                                        <td className="px-4 py-3 align-top min-w-[150px]">
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

                                                                    {/* Expanded row */}
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
                                                                                                    <div
                                                                                                        key={imgIdx}
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
                                                                                                        className="relative group w-20 h-20 rounded-lg overflow-hidden border border-border cursor-grab active:cursor-grabbing select-none"
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
                                                                                                    <video src={vid.preview} className="w-full h-full object-cover pointer-events-none" muted />
                                                                                                    <div className="absolute inset-0 flex items-center justify-center">
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
                                    );
                                })()}
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
                                    entityId="" // Not created yet
                                    entitySlug="" // Not created yet
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
            {lightboxUrl && (
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
            )}

            {/* ── Create Category Modal ── */}
            {showCategoryModal && (
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
            )}

            {/* ── Create Subcategory Modal ── */}
            {showSubcategoryModal && (
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
            )}
        </>
    );
}

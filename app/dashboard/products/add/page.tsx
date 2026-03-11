'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCategories, createCategory } from '@/lib/api/category';
import { createProduct } from '@/lib/api/product';
import { uploadProductImage } from '@/lib/api';
import { Category } from '@/types/category';
import { ArrowLeft, ArrowRight, Check, X, Plus, Trash2, ChevronDown, ChevronUp, AlertCircle, Info, Package, Layers, Star, ImageIcon, Maximize2, Loader2, Film, Search } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import CountryPicker from '@/components/CountryPicker';
import SeoEditor from '@/components/SeoEditor';
import type { SeoData } from '@/lib/api/seo';

// ÔöÇÔöÇÔöÇ Constants ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
export type AttributeType = 'Volume' | 'Pack' | 'Flavor' | 'ABV' | 'Vintage';
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
    pack: string;
    volume: string;
    variant_name: string;
    sku: string;
    price: number;
    cost_price: number;
    stock: number;
    shelf_life: string;
    length_cm: string;
    width_cm: string;
    height_cm: string;
    weight_kg: string;
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
        category: '',
        sub_category: '',
        country_of_origin: '',
        vintage_year: '',
        abv: '',
        intended_use: '',
        description: '',
        available_from_date: '',
        available_from_time: '',
        available_until_date: '',
        available_until_time: '',
    });

    // ÔöÇÔöÇÔöÇ Step 2: Define Variants State ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const [volumeValues, setVolumeValues] = useState<{ value: string; unit: string }[]>([]);
    const [packValues, setPackValues] = useState<string[]>([]);
    const [volInput, setVolInput] = useState('');
    const [volUnit, setVolUnit] = useState('ml');
    const [customPackInput, setCustomPackInput] = useState('');
    const [showCustomPackInput, setShowCustomPackInput] = useState(false);

    // ÔöÇÔöÇÔöÇ Step 3: Variants Table State ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const [autoGenerate, setAutoGenerate] = useState(false);
    const [variants, setVariants] = useState<VariantRow[]>([
        { pack: '', volume: '', variant_name: '', sku: '', price: 0, cost_price: 0, stock: 0, shelf_life: '', length_cm: '', width_cm: '', height_cm: '', weight_kg: '', images: [], videos: [], defaultImageIndex: 0, sale_price: '', sale_start_date: '', sale_start_time: '', sale_end_date: '', sale_end_time: '', isDefault: false, isActive: true }
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
    const selectedParent = categories.find(c => !c.parent_id && c.name === form.category);
    const subCategories = selectedParent
        ? categories.filter(c => c.parent_id === selectedParent.category_id)
        : [];

    // ÔöÇÔöÇÔöÇ Form helpers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

    const handleCategoryChange = (value: string) => {
        update('category', value);
        update('sub_category', '');
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
                update('category', newCatForm.name.trim());
                update('sub_category', '');
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
                update('sub_category', newSubCatForm.name.trim());
                setNewSubCatForm({ name: '', slug: '', description: '', parent_id: '' });
                setShowSubcategoryModal(false);
            } else {
                toast.error(res.error || 'Failed to create subcategory');
            }
        } catch { toast.error('Network error'); } finally { setSubCatCreating(false); }
    };

    // ÔöÇÔöÇÔöÇ Step 2: Volume helpers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const addVolume = () => {
        if (!volInput) return;
        if (volumeValues.some(v => v.value === volInput && v.unit === volUnit)) {
            toast.error('This volume already exists');
            return;
        }
        setVolumeValues(prev => [...prev, { value: volInput, unit: volUnit }]);
        setVolInput('');
    };

    const removeVolume = (index: number) => {
        setVolumeValues(prev => prev.filter((_, i) => i !== index));
    };

    // ÔöÇÔöÇÔöÇ Step 2: Pack helpers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const togglePack = (pack: string) => {
        setPackValues(prev =>
            prev.includes(pack) ? prev.filter(p => p !== pack) : [...prev, pack]
        );
    };

    const removePack = (index: number) => {
        setPackValues(prev => prev.filter((_, i) => i !== index));
    };

    // ÔöÇÔöÇÔöÇ Step 3: Generate N├ùN combinations ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const generateCombinations = (): VariantRow[] => {
        if (volumeValues.length === 0 && packValues.length === 0) return [];
        const combos: VariantRow[] = [];
        const packsToIterate = packValues.length > 0 ? packValues : [''];
        const volumesToIterate = volumeValues.length > 0 ? volumeValues : [{ value: '', unit: '' }];
        for (const pack of packsToIterate) {
            for (const vol of volumesToIterate) {
                const volumeStr = vol.value ? `${vol.value} ${vol.unit}` : '';
                combos.push({
                    pack,
                    volume: volumeStr,
                    variant_name: '',
                    sku: '',
                    price: 0,
                    cost_price: 0,
                    stock: 0,
                    shelf_life: '',
                    length_cm: '', width_cm: '', height_cm: '', weight_kg: '',
                    images: [],
                    videos: [],
                    defaultImageIndex: 0,
                    sale_price: '', sale_start_date: '', sale_start_time: '', sale_end_date: '', sale_end_time: '',
                    isDefault: false,
                    isActive: true,
                });
            }
        }
        return combos;
    };

    // ÔöÇÔöÇÔöÇ Auto-generate toggle handler ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const handleAutoGenerateToggle = (checked: boolean) => {
        setAutoGenerate(checked);
        if (checked) {
            const combos = generateCombinations();
            if (combos.length === 0) {
                toast.error('Please add at least one Volume or Pack value in Step 2');
                setAutoGenerate(false);
                return;
            }
            setVariants(combos);
            toast.success(`Generated ${combos.length} variant combinations`);
        } else {
            setVariants([{ pack: '', volume: '', variant_name: '', sku: '', price: 0, cost_price: 0, stock: 0, shelf_life: '', length_cm: '', width_cm: '', height_cm: '', weight_kg: '', images: [], videos: [], defaultImageIndex: 0, sale_price: '', sale_start_date: '', sale_start_time: '', sale_end_date: '', sale_end_time: '', isDefault: false, isActive: true }]);
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
            pack: packValues.length === 1 ? packValues[0] : '',
            volume: volumeValues.length === 1 ? `${volumeValues[0].value} ${volumeValues[0].unit}` : '',
            variant_name: '', sku: '', price: 0, cost_price: 0, stock: 0,
            shelf_life: '', length_cm: '', width_cm: '', height_cm: '', weight_kg: '',
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
        setVariants(prev => prev.filter((_, i) => i !== index));
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
            // Pre-fill the initial blank row with single-option values
            setVariants(prev => prev.map(v => ({
                ...v,
                pack: packValues.length === 1 && !v.pack ? packValues[0] : v.pack,
                volume: volumeValues.length === 1 && !v.volume
                    ? `${volumeValues[0].value} ${volumeValues[0].unit}`
                    : v.volume,
            })));
        }
        if (currentStep < 3) setCurrentStep(prev => prev + 1);
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
            category: form.category || undefined,
            sub_category: form.sub_category || undefined,
            description: form.description.trim() || undefined,
            intended_use: form.intended_use.trim() || undefined,
            vintage_year: form.vintage_year ? parseInt(form.vintage_year, 10) : undefined,
            alcohol_percentage: form.abv ? parseFloat(parseFloat(form.abv).toFixed(1)) : undefined,
            sku: draftSku,
            status: 'draft',
            specifications: form.country_of_origin ? { country_of_origin: form.country_of_origin } : undefined,
            variants: variants
                .filter(v => v.sku.trim() || v.variant_name.trim())
                .map(v => ({
                    sku: v.sku.trim() || `${draftSku}-V${Math.random().toString(36).slice(2, 6)}`,
                    variant_name: v.variant_name.trim() || 'Draft Variant',
                    price: Number(v.price) || 0,
                    stock: Number(v.stock) || 0,
                    cost_price: v.cost_price ? Number(v.cost_price) : null,
                    volume: v.volume || undefined,
                    pack: v.pack || undefined,
                    isDefault: v.isDefault,
                    sale_price: v.sale_price || null,
                })),
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
            category: form.category || undefined,
            sub_category: form.sub_category || undefined,
            description: form.description.trim() || undefined,
            intended_use: form.intended_use.trim() || undefined,
            vintage_year: form.vintage_year ? parseInt(form.vintage_year, 10) : undefined,
            alcohol_percentage: form.abv ? parseFloat(parseFloat(form.abv).toFixed(1)) : undefined,

            // SKU from the default variant (required by products table unique constraint)
            sku: (variants.find(v => v.isDefault) ?? variants[0]).sku.trim(),

            // Country of origin ÔåÆ product_specifications
            specifications: form.country_of_origin
                ? { country_of_origin: form.country_of_origin }
                : undefined,

            // Full variants array ÔÇö backend maps these to product_variants rows
            variants: variants.map(v => ({
                sku: v.sku.trim(),
                variant_name: v.variant_name.trim(),
                price: Number(v.price) || 0,
                stock: Number(v.stock) || 0,
                cost_price: v.cost_price ? Number(v.cost_price) : null,
                volume: v.volume || undefined,    // ÔÇ£750 mlÔÇØ ÔåÆ parsed to volume_ml by backend
                pack: v.pack || undefined,    // ÔÇ£Pack of 2ÔÇØ ÔåÆ pack_quantity=2 by backend
                isDefault: v.isDefault,
                // Sale Management
                sale_price: v.sale_price || null,
                sale_start_date: v.sale_start_date || undefined,
                sale_start_time: v.sale_start_time || undefined,
                sale_end_date: v.sale_end_date || undefined,
                sale_end_time: v.sale_end_time || undefined,
                // Dimensions + shelf life ÔåÆ product_specifications
                length_cm: v.length_cm || undefined,
                width_cm: v.width_cm || undefined,
                height_cm: v.height_cm || undefined,
                weight_kg: v.weight_kg || undefined,
                shelf_life: v.shelf_life || undefined,      // ÔåÆ shelf_life_months by backend
            })),
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
                    // Upload images
                    for (let imgIdx = 0; imgIdx < v.images.length; imgIdx++) {
                        const img = v.images[imgIdx];
                        try {
                            console.log('[handleSubmit] Converting image to base64:', img.file.name, 'size:', img.file.size);
                            const base64 = await fileToBase64(img.file);
                            console.log('[handleSubmit] Uploading image:', img.file.name, 'base64 length:', base64.length);
                            const uploadResult = await uploadProductImage(productId, base64, {
                                file_name: img.file.name,
                                is_primary: imgIdx === 0,
                                sort_order: imgIdx,
                                media_type: 'image',
                            });
                            console.log('[handleSubmit] Image upload result:', uploadResult);
                            uploadedAssets++;
                        } catch (e) {
                            console.error('[Upload] Image failed:', img.file.name, e);
                        }
                    }

                    // Upload videos
                    for (let vidIdx = 0; vidIdx < v.videos.length; vidIdx++) {
                        const vid = v.videos[vidIdx];
                        try {
                            console.log('[handleSubmit] Converting video to base64:', vid.file.name, 'size:', vid.file.size);
                            const base64 = await fileToBase64(vid.file);
                            console.log('[handleSubmit] Uploading video:', vid.file.name, 'base64 length:', base64.length);
                            const uploadResult = await uploadProductImage(productId, base64, {
                                file_name: vid.file.name,
                                is_primary: false,
                                sort_order: 100 + vidIdx,
                                media_type: 'video',
                            });
                            console.log('[handleSubmit] Video upload result:', uploadResult);
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
                                                    if (currentStep === 2 && volumeValues.length === 0 && step.id > 2) {
                                                        toast.error('Please add at least one Volume value');
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
                                            placeholder="e.g. VinoViet Classic Red"
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
                                            placeholder="KSP Wines"
                                        />
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Category</label>
                                        <select
                                            value={form.category}
                                            onChange={e => handleCategoryChange(e.target.value)}
                                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 bg-white text-gray-900 transition-all"
                                        >
                                            <option value="">Select category</option>
                                            {parentCategories.map(cat => (
                                                <option key={cat.category_id} value={cat.name}>{cat.name}</option>
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
                                            value={form.sub_category}
                                            onChange={e => update('sub_category', e.target.value)}
                                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 bg-white text-gray-900 transition-all"
                                            disabled={!form.category || subCategories.length === 0}
                                        >
                                            <option value="">
                                                {!form.category ? 'Select a category first' : subCategories.length === 0 ? 'No subcategories' : 'Select subcategory'}
                                            </option>
                                            {subCategories.map(cat => (
                                                <option key={cat.category_id} value={cat.name}>{cat.name}</option>
                                            ))}
                                        </select>
                                        {form.category && (
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

                                    {/* Vintage Year */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Vintage Year</label>
                                        <input
                                            type="number"
                                            min="1900"
                                            max={new Date().getFullYear() + 1}
                                            value={form.vintage_year}
                                            onChange={e => update('vintage_year', e.target.value)}
                                            onWheel={e => (e.target as HTMLInputElement).blur()}
                                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all"
                                            placeholder="e.g. 2022"
                                        />
                                    </div>

                                    {/* ABV */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">ABV (%)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="100"
                                                value={form.abv}
                                                onChange={e => update('abv', e.target.value)}
                                                onWheel={e => (e.target as HTMLInputElement).blur()}
                                                className="w-full rounded-lg border border-border pl-4 pr-16 py-2.5 text-sm focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all"
                                                placeholder="e.g. 13.5"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-muted">% ABV</span>
                                        </div>
                                        <p className="text-xs text-text-muted mt-1">Alcohol by Volume (0ÔÇô100)</p>
                                    </div>

                                    {/* Intended Use - full width */}
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Intended Use</label>
                                        <input
                                            type="text"
                                            value={form.intended_use}
                                            onChange={e => update('intended_use', e.target.value)}
                                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all"
                                            placeholder="Pairs well with grilled meats..."
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
                                            placeholder="Describe the product's flavor profile, origin, and characteristics..."
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
                        {currentStep === 2 && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div className="border-b border-border pb-3">
                                    <h3 className="font-serif text-lg font-semibold text-gold-soft">Define Variants</h3>
                                    <p className="text-xs text-text-secondary mt-1">Configure volume and pack options for this product</p>
                                </div>

                                {/* ÔöÇÔöÇ Volume Section ÔöÇÔöÇ */}
                                <div className="bg-white/[0.03] border border-border rounded-xl p-5">
                                    <h4 className="font-semibold text-gold-soft mb-4 text-sm">Volume</h4>

                                    {/* Added chips */}
                                    {volumeValues.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {volumeValues.map((v, i) => (
                                                <div key={i} className="flex items-center gap-1.5 bg-gold/[0.08] border border-gold/20 text-text-primary px-3 py-1.5 rounded-full text-sm">
                                                    <span>{v.value} {v.unit}</span>
                                                    <button type="button" onClick={() => removeVolume(i)} className="text-text-muted hover:text-danger rounded-full hover:bg-white/10 p-0.5 transition-colors">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Input row */}
                                    <div className="flex gap-2 max-w-md">
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            placeholder="Value"
                                            value={volInput}
                                            onChange={e => setVolInput(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVolume(); } }}
                                            className="w-1/2 rounded-lg border border-border px-3 py-2 text-sm focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 bg-transparent transition-all"
                                        />
                                        <select
                                            value={volUnit}
                                            onChange={e => setVolUnit(e.target.value)}
                                            className="w-1/4 rounded-lg border border-border px-3 py-2 text-sm focus:border-gold/40 focus:outline-none bg-white text-gray-900 transition-all"
                                        >
                                            {PREDEFINED_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={addVolume}
                                            className="rounded-lg border border-border bg-white/5 px-5 py-2 text-sm font-medium hover:bg-white/10 hover:text-gold hover:border-gold/30 transition-all"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>

                                {/* ÔöÇÔöÇ Pack Section ÔöÇÔöÇ */}
                                <div className="bg-white/[0.03] border border-border rounded-xl p-5">
                                    <h4 className="font-semibold text-gold-soft mb-4 text-sm">Pack</h4>

                                    {/* Selected pack chips */}
                                    {packValues.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {packValues.map((p, i) => (
                                                <div key={i} className="flex items-center gap-1.5 bg-gold/[0.08] border border-gold/20 text-text-primary px-3 py-1.5 rounded-full text-sm">
                                                    <span>{p}</span>
                                                    <button type="button" onClick={() => removePack(i)} className="text-text-muted hover:text-danger rounded-full hover:bg-white/10 p-0.5 transition-colors">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Preset buttons */}
                                    <div className="flex flex-wrap gap-2">
                                        {PREDEFINED_PACKS.map(pack => {
                                            const isSelected = packValues.includes(pack);
                                            return (
                                                <button
                                                    key={pack}
                                                    type="button"
                                                    onClick={() => togglePack(pack)}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${isSelected
                                                        ? 'bg-gold/[0.12] border-gold/30 text-gold-soft shadow-sm'
                                                        : 'border-border text-text-secondary hover:bg-white/5 hover:text-gold-soft hover:border-gold/20'
                                                        }`}
                                                >
                                                    {pack}
                                                </button>
                                            );
                                        })}

                                        {/* Add Custom pill */}
                                        {!showCustomPackInput ? (
                                            <button
                                                type="button"
                                                onClick={() => setShowCustomPackInput(true)}
                                                className="px-4 py-2 rounded-lg text-sm font-medium border border-dashed border-border text-text-muted hover:border-gold/30 hover:text-gold-soft transition-all duration-200 flex items-center gap-1.5"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Add Custom
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    type="text"
                                                    value={customPackInput}
                                                    onChange={e => setCustomPackInput(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            if (customPackInput.trim()) {
                                                                if (packValues.includes(customPackInput.trim())) {
                                                                    toast.error('This pack already exists');
                                                                } else {
                                                                    setPackValues(prev => [...prev, customPackInput.trim()]);
                                                                    setCustomPackInput('');
                                                                    setShowCustomPackInput(false);
                                                                }
                                                            }
                                                        }
                                                        if (e.key === 'Escape') {
                                                            setCustomPackInput('');
                                                            setShowCustomPackInput(false);
                                                        }
                                                    }}
                                                    placeholder="Custom pack name"
                                                    autoFocus
                                                    className="w-36 rounded-lg border border-gold/30 px-3 py-1.5 text-sm focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/20 bg-transparent transition-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (customPackInput.trim()) {
                                                            if (packValues.includes(customPackInput.trim())) {
                                                                toast.error('This pack already exists');
                                                            } else {
                                                                setPackValues(prev => [...prev, customPackInput.trim()]);
                                                                setCustomPackInput('');
                                                                setShowCustomPackInput(false);
                                                            }
                                                        }
                                                    }}
                                                    className="p-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setCustomPackInput(''); setShowCustomPackInput(false); }}
                                                    className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-danger transition-colors"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
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
                                                Creates all Pack ├ù Volume permutations ({packValues.length} ├ù {volumeValues.length} = {packValues.length * volumeValues.length} variants)
                                            </p>
                                        </div>
                                    </label>
                                </div>

                                {/* Variants Table */}
                                <div className="border border-border rounded-xl bg-card-bg overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead className="bg-white/5 border-b border-border">
                                                <tr>
                                                    <th className="px-4 py-4 w-10"></th>
                                                    {packValues.length > 0 && <th className="px-4 py-4 font-medium text-text-secondary">Pack</th>}
                                                    <th className="px-4 py-4 font-medium text-text-secondary">Volume</th>
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
                                                                {packValues.length > 0 && (
                                                                    <td className="px-4 py-3 align-top">
                                                                        {autoGenerate || packValues.length <= 1 ? (
                                                                            <span className="bg-white/5 border border-border px-3 py-1.5 rounded text-xs font-medium text-text-primary">{variant.pack || (packValues[0] ?? 'ÔÇö')}</span>
                                                                        ) : (
                                                                            <select
                                                                                value={variant.pack}
                                                                                onChange={e => updateVariant(vIdx, 'pack', e.target.value)}
                                                                                className="w-full min-w-[120px] rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
                                                                            >
                                                                                <option value="">Select</option>
                                                                                {packValues.map(p => <option key={p} value={p}>{p}</option>)}
                                                                            </select>
                                                                        )}
                                                                    </td>
                                                                )}

                                                                <td className="px-4 py-3 align-top">
                                                                    {autoGenerate || volumeValues.length <= 1 ? (
                                                                        <span className="bg-white/5 border border-border px-3 py-1.5 rounded text-xs font-medium text-text-primary">{variant.volume || (volumeValues[0] ? `${volumeValues[0].value} ${volumeValues[0].unit}` : 'ÔÇö')}</span>
                                                                    ) : (
                                                                        <select
                                                                            value={variant.volume}
                                                                            onChange={e => updateVariant(vIdx, 'volume', e.target.value)}
                                                                            className="w-full min-w-[120px] rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
                                                                        >
                                                                            <option value="">Select</option>
                                                                            {volumeValues.map(v => {
                                                                                const label = `${v.value} ${v.unit}`;
                                                                                return <option key={label} value={label}>{label}</option>;
                                                                            })}
                                                                        </select>
                                                                    )}
                                                                </td>
                                                                {/* Variant Name */}
                                                                <td className="px-4 py-3 align-top min-w-[150px]">
                                                                    <input
                                                                        type="text"
                                                                        value={variant.variant_name}
                                                                        onChange={e => updateVariant(vIdx, 'variant_name', e.target.value)}
                                                                        placeholder="e.g. Classic Red 750ml"
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
                                                                            <Star className={`h-4 w-4 ${variant.isDefault ? 'fill-gold' : ''}`} />
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
                                                                    <td colSpan={packValues.length > 0 ? 8 : 7} className="p-5">
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
                                                                                        { label: 'Weight (kg)', field: 'weight_kg' as keyof VariantRow },
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
                                    entityCategory={form.category}
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
                                        placeholder="e.g. Red Wines"
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

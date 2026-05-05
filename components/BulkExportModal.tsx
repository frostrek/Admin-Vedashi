import React, { useState, useEffect } from 'react';
import { X, Layers, Star, Tag, ChevronDown, Download, Loader2, FileText, FileSpreadsheet, FileDown, CheckCircle2, AlertCircle, Package } from 'lucide-react';
import { Product, getProduct } from '@/lib/api';
import { getCategories } from '@/lib/api/category';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import * as xlsx from 'xlsx-js-style';

interface BulkExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
}

type TargetType = 'category' | 'sub_category' | 'brand' | 'all';

export default function BulkExportModal({ isOpen, onClose, products }: BulkExportModalProps) {
    // Lock background scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const [targetType, setTargetType] = useState<TargetType>('category');
    const [targetValue, setTargetValue] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
    const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');

    // Dropdown options state
    const [categories, setCategories] = useState<string[]>([]);
    const [subCategories, setSubCategories] = useState<string[]>([]);
    const [brands, setBrands] = useState<string[]>([]);
    const [allCategoriesData, setAllCategoriesData] = useState<any[]>([]);
    const [parentCategory, setParentCategory] = useState<string>('');
    const [parentDropdownOpen, setParentDropdownOpen] = useState(false);
    const [loadingOptions, setLoadingOptions] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const loadOptions = async () => {
            setLoadingOptions(true);
            try {
                // Fetch all categories for robust name mapping
                const allCats = await getCategories();
                setAllCategoriesData(allCats);
                const catMap = new Map(allCats.map(c => [c.category_id, c.name]));

                const catsSet = new Set<string>();
                const subsSet = new Set<string>();
                const brandsSet = new Set<string>();

                products.forEach(p => {
                    // Try to get name from product object or map from category_id
                    const catName = p.category || (p.category_id ? catMap.get(p.category_id) : null);
                    if (catName) catsSet.add(catName);

                    const subName = p.sub_category || (p.sub_category_id ? catMap.get(p.sub_category_id) : null);
                    if (subName) subsSet.add(subName);

                    if (p.brand) brandsSet.add(p.brand);
                });

                // If sets are still empty, try fallback to getting ALL unique categories from DB
                if (catsSet.size === 0) {
                    allCats.filter(c => !c.parent_id).forEach(c => catsSet.add(c.name));
                    allCats.filter(c => c.parent_id).forEach(c => subsSet.add(c.name));
                }

                setCategories(Array.from(catsSet).sort());
                setSubCategories(Array.from(subsSet).sort());
                setBrands(Array.from(brandsSet).sort());
            } catch (error) {
                console.error('Failed to load export options:', error);
            } finally {
                setLoadingOptions(false);
            }
        };

        loadOptions();
    }, [isOpen, products]);

    useEffect(() => {
        setTargetValue('');
        setParentCategory('');
        setDropdownOpen(false);
        setParentDropdownOpen(false);
    }, [targetType]);

    // Helper to load image to base64
    const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
        if (!imageUrl) return null;
        if (imageUrl.startsWith('data:image')) return imageUrl;
        try {
            const res = await fetch(imageUrl);
            const blob = await res.blob();
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.warn('Failed to fetch image', e);
            return null;
        }
    };

    const formatPrice = (amount: number) => {
        return `Rs. ${amount?.toLocaleString('en-IN') || 0}`;
    };

    /** Shared product filter used by both PDF and Excel export */
    const filterProducts = (): Product[] => {
        if (targetType === 'all') return products;

        // Build name→id maps from fetched categories
        const nameToIds = new Map<string, Set<string>>();
        allCategoriesData.forEach((c: any) => {
            const existing = nameToIds.get(c.name) || new Set<string>();
            existing.add(c.category_id);
            nameToIds.set(c.name, existing);
        });
        const idToName = new Map<string, string>(allCategoriesData.map((c: any) => [c.category_id, c.name]));

        return products.filter(p => {
            if (targetType === 'brand') return p.brand === targetValue;

            if (targetType === 'category') {
                // Match by name string OR by category_id that resolves to the same name
                if (p.category === targetValue) return true;
                const resolvedName = p.category_id ? idToName.get(p.category_id) : null;
                if (resolvedName === targetValue) return true;
                // Also check if the product's category_id is a CHILD of the selected parent
                const parentIds = nameToIds.get(targetValue);
                if (parentIds) {
                    // Check if p.category_id is a child whose parent matches
                    const cat = allCategoriesData.find((c: any) => c.category_id === p.category_id);
                    if (cat?.parent_id && parentIds.has(cat.parent_id)) return true;
                    if (p.category_id && parentIds.has(p.category_id)) return true;
                }
                return false;
            }

            if (targetType === 'sub_category') {
                // targetValue is the subcategory name (e.g. 'Gift Packs')
                if (p.sub_category === targetValue) return true;
                // Resolve the product's actual category_id to a name
                const resolvedName = p.category_id ? idToName.get(p.category_id) : null;
                if (resolvedName === targetValue) return true;
                // Also match sub_category_id if present
                const resolvedSubName = (p as any).sub_category_id ? idToName.get((p as any).sub_category_id) : null;
                if (resolvedSubName === targetValue) return true;
                // Final check: find the category IDs for this subcategory name and match
                const subIds = nameToIds.get(targetValue);
                if (subIds && p.category_id && subIds.has(p.category_id)) return true;
                return false;
            }

            return true;
        });
    };

    const handleDownload = async () => {
        if (targetType !== 'all' && !targetValue) {
            toast.error(`Please select a ${targetType.replace('_', '')} to export.`);
            return;
        }

        const filteredProducts = filterProducts();

        if (filteredProducts.length === 0) {
            toast.error('No products found matching the criteria.');
            return;
        }

        setIsExporting(true);
        setExportProgress({ current: 0, total: filteredProducts.length });

        try {
            // Use portrait for better table layout
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 14;
            let currentY = 25;

            // Brand Colors
            const herbalGreen = [59, 93, 59]; // #3B5D3B
            const gold = [197, 164, 78];     // #C5A44E
            const charcoal = [50, 50, 50];

            // Header - Brand Title
            doc.setFontSize(22);
            doc.setTextColor(herbalGreen[0], herbalGreen[1], herbalGreen[2]);
            doc.setFont('helvetica', 'bold');
            doc.text('VEDASHI INVENTORY REPORT', margin, currentY);

            currentY += 10;
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'normal');
            doc.text(`Target: ${targetType.toUpperCase()} ${targetValue ? `- ${targetValue}` : ''}`, margin, currentY);
            doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 50, currentY, { align: 'right' });

            currentY += 8;
            doc.setDrawColor(herbalGreen[0], herbalGreen[1], herbalGreen[2]);
            doc.setLineWidth(0.5);
            doc.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 12;

            for (let i = 0; i < filteredProducts.length; i++) {
                const product = filteredProducts[i];
                setExportProgress({ current: i + 1, total: filteredProducts.length });

                // Check page break before product header
                if (currentY > 240) {
                    doc.addPage();
                    currentY = 20;
                }

                // Fetch full product details for variants and assets
                let fullProduct = product;
                try {
                    const res = await getProduct(product.product_id);
                    if (res) fullProduct = res;
                } catch (e) {
                    console.warn(`Failed to fetch details for ${product.product_name}`, e);
                }

                // Draw Product Header Card
                doc.setDrawColor(230, 230, 230);
                doc.setFillColor(250, 246, 240); // Cream background
                doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 25, 2, 2, 'FD');

                // Product Image
                const mainImageUrl = fullProduct.images?.[0] || (fullProduct.assets?.[0]?.asset_url) || null;
                if (mainImageUrl) {
                    const b64 = await getBase64ImageFromUrl(mainImageUrl);
                    if (b64) {
                        try {
                            doc.addImage(b64, 'JPEG', margin + 3, currentY + 3, 19, 19);
                        } catch (err) { /* ignore */ }
                    }
                } else {
                    doc.setFontSize(12);
                    doc.text('🌿', margin + 8, currentY + 15);
                }

                // Product Text
                doc.setTextColor(herbalGreen[0], herbalGreen[1], herbalGreen[2]);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(13);
                doc.text(fullProduct.product_name, margin + 26, currentY + 9);

                doc.setFontSize(10);
                doc.setTextColor(110, 110, 110);
                doc.setFont('helvetica', 'normal');
                doc.text(`${fullProduct.category || 'N/A'} • SKU: ${fullProduct.sku}`, margin + 26, currentY + 16);

                // Stock Badge
                const totalStock = fullProduct.stock_quantity ?? fullProduct.quantity ?? 0;
                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(gold[0], gold[1], gold[2]);
                doc.roundedRect(pageWidth - margin - 45, currentY + 8, 40, 8, 4, 4, 'D');
                doc.setFontSize(9);
                doc.setTextColor(gold[0], gold[1], gold[2]);
                doc.setFont('helvetica', 'bold');
                doc.text(`${totalStock} IN STOCK`, pageWidth - margin - 25, currentY + 13.5, { align: 'center' });

                currentY += 28;

                // Variants Table
                const variants = fullProduct.variants || [];
                const variantRows: any[] = [];

                if (variants.length > 0) {
                    for (const v of variants) {
                        // Find variant image
                        let vImg = null;
                        if (fullProduct.assets) {
                            const asset = fullProduct.assets.find((a: any) => a.variant_id === v.variant_id);
                            if (asset) vImg = asset.asset_url || asset.base64_data;
                        }

                        let b64 = null;
                        if (vImg) b64 = await getBase64ImageFromUrl(vImg);

                        const specs = [v.size_label, v.color_label, v.material].filter(Boolean).join(', ') || 'Standard';

                        variantRows.push([
                            { content: '', _b64: b64 }, // Placeholder for image
                            v.variant_name || fullProduct.product_name,
                            v.sku || 'N/A',
                            specs,
                            formatPrice(v.price || fullProduct.price || 0),
                            v.stock_quantity?.toString() || '0',
                            v.is_active !== false ? 'Active' : 'Hidden'
                        ]);
                    }
                } else {
                    // One row for product with no variants
                    variantRows.push([
                        { content: '', _b64: null },
                        fullProduct.product_name,
                        fullProduct.sku,
                        'Standard',
                        formatPrice(fullProduct.price || 0),
                        totalStock.toString(),
                        'Active'
                    ]);
                }

                autoTable(doc, {
                    startY: currentY,
                    head: [['IMAGE', 'NAME', 'SKU', 'SPECIFICATION', 'PRICE', 'STOCK', 'STATUS']],
                    body: variantRows,
                    theme: 'striped',
                    headStyles: {
                        fillColor: [245, 240, 230] as [number, number, number],
                        textColor: charcoal as [number, number, number],
                        fontSize: 8,
                        fontStyle: 'bold',
                        halign: 'left'
                    },
                    styles: {
                        fontSize: 8,
                        cellPadding: 4,
                        valign: 'middle',
                        textColor: [60, 60, 60] as [number, number, number]
                    },
                    columnStyles: {
                        0: { cellWidth: 15 }, // Img
                        1: { cellWidth: 40 }, // Name
                        2: { cellWidth: 30 }, // SKU
                        3: { cellWidth: 40 }, // Spec
                        4: { cellWidth: 20, halign: 'right' }, // Price
                        5: { cellWidth: 15, halign: 'center' }, // Stock
                        6: { cellWidth: 16, halign: 'center' }  // Status
                    },
                    margin: { left: margin, right: margin },
                    didDrawCell: (data) => {
                        if (data.section === 'body' && data.column.index === 0) {
                            const row = variantRows[data.row.index];
                            if (row && row[0] && row[0]._b64) {
                                try {
                                    doc.addImage(row[0]._b64, 'JPEG', data.cell.x + 2, data.cell.y + 2, 11, 11);
                                } catch (e) { /* ignore */ }
                            }
                        }
                    }
                });

                // @ts-ignore
                currentY = doc.lastAutoTable.finalY + 12;
            }

            // Footer - Page Numbers
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `Page ${i} of ${pageCount} • Vedashi Premium Inventory Report`,
                    pageWidth / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }

            doc.save(`Vedashi_Inventory_${targetValue || 'All'}_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success('Premium PDF generated successfully!');
            onClose();

        } catch (error) {
            console.error('Export Error:', error);
            toast.error('Failed to generate PDF. Check console for details.');
        } finally {
            setIsExporting(false);
            setExportProgress({ current: 0, total: 0 });
        }
    };

    // ── Excel Export (41-column bulk-import-compatible) ──────────────────
    const TEMPLATE_HEADERS = [
        'Product_ID', 'Brand', 'Manufacturer', 'Category', 'Subcategory',
        'Country_of_Origin', 'Form', 'Speciality', 'Speciality_2', 'Speciality_3',
        'Description', 'Short_Description', 'Lead_Time', 'Search_Keywords',
        'Barcode', 'Adult_Only', 'Taxable', 'Parallel_Import', 'Overseas_Purchase',
        'Shelf_Life', 'Product_Name', 'Option_Type', 'Option_Value', 'SKU',
        'Model_Number', 'Selling_Price', 'MRP', 'Stock', 'Weight',
        'Volume', 'Length', 'Width', 'Height', 'Russia_Markup', 'Korea_Markup',
        'Image_1', 'Image_2', 'Image_3', 'Image_4', 'Image_5', 'Variant_Video',
    ];

    const handleDownloadExcel = async () => {
        if (targetType !== 'all' && !targetValue) {
            toast.error(`Please select a ${targetType.replace('_', '')} to export.`);
            return;
        }

        const filteredProducts = filterProducts();

        if (filteredProducts.length === 0) {
            toast.error('No products found matching the criteria.');
            return;
        }

        setIsExporting(true);
        setExportProgress({ current: 0, total: filteredProducts.length });

        try {
            // Phase 1: Fetch all product details
            const allProductDetails: any[] = [];

            for (let i = 0; i < filteredProducts.length; i++) {
                const product = filteredProducts[i];
                setExportProgress({ current: i + 1, total: filteredProducts.length });

                let fp: any = product;
                try {
                    const res = await getProduct(product.product_id);
                    if (res) fp = res;
                } catch (e) {
                    console.warn(`Failed to fetch details for ${product.product_name}`, e);
                }
                allProductDetails.push(fp);
            }

            // Phase 2: Build sequential product ID map
            const productIdMap = new Map<string, string>();
            let prodCounter = 1;
            for (const product of allProductDetails) {
                if (!productIdMap.has(product.product_id)) {
                    productIdMap.set(
                        product.product_id,
                        `PROD-${String(prodCounter).padStart(3, '0')}`
                    );
                    prodCounter++;
                }
            }

            // Phase 3: Build rows
            const allRows: any[][] = [];

            for (const fp of allProductDetails) {
                // Resolve image URLs from assets
                const imageAssets = (fp.assets || [])
                    .filter((a: any) => !(a.media_type || a.mime_type || '').toLowerCase().startsWith('video'))
                    .map((a: any) => a.cdn_url || a.asset_url || '');
                const videoAsset = (fp.assets || [])
                    .find((a: any) => (a.media_type || a.mime_type || '').toLowerCase().startsWith('video'));

                // Specialities array
                const specs: string[] = Array.isArray(fp.specialities) ? fp.specialities : [];
                const countryOfOrigin = fp.specifications?.country_of_origin || fp.country_of_origin || '';
                const searchKw = Array.isArray(fp.search_keywords) ? fp.search_keywords.join(', ') : (fp.search_keywords || '');

                const variants = fp.variants && fp.variants.length > 0 ? fp.variants : [null];

                for (const v of variants) {
                    // Parse options JSONB → option_type / option_value
                    let optType = '';
                    let optValue = '';
                    if (v?.options && typeof v.options === 'object') {
                        const keys = Object.keys(v.options);
                        if (keys.length > 0) {
                            optType = keys[0];
                            optValue = String(v.options[keys[0]] ?? '');
                        }
                    }

                    // Per-variant images (prefer variant-specific, fallback to product-level)
                    const variantImages = v ? (fp.assets || [])
                        .filter((a: any) => a.variant_id === v.variant_id && !(a.media_type || '').toLowerCase().startsWith('video'))
                        .map((a: any) => a.cdn_url || a.asset_url || '') : [];
                    const imgs = variantImages.length > 0 ? variantImages : imageAssets;

                    allRows.push([
                        productIdMap.get(fp.product_id) || '',
                        fp.brand || '',
                        fp.manufacturer || '',
                        fp.category || '',
                        fp.sub_category || '',
                        countryOfOrigin,
                        fp.form || '',
                        specs[0] || '',
                        specs[1] || '',
                        specs[2] || '',
                        fp.description || '',
                        fp.short_description || '',
                        fp.lead_time || '',
                        searchKw,
                        v?.barcode || '',
                        fp.adult_only ? 'TRUE' : 'FALSE',
                        fp.taxable !== false ? 'TRUE' : 'FALSE',
                        fp.parallel_import ? 'TRUE' : 'FALSE',
                        fp.overseas_purchase ? 'TRUE' : 'FALSE',
                        v?.shelf_life_months ?? '',
                        v?.variant_name || fp.product_name || '',
                        optType,
                        optValue,
                        v?.variant_sku || v?.sku || fp.sku || '',
                        v?.model_number || '',
                        v?.discount_base_price ?? v?.price ?? '',
                        v?.sale_price ?? '',
                        v?.stock_quantity ?? 0,
                        v?.weight_g ?? '',
                        v?.volume_ml ?? '',
                        v?.length_cm ?? '',
                        v?.width_cm ?? '',
                        v?.height_cm ?? '',
                        '', // Russia_Markup (not on variant object)
                        '', // Korea_Markup
                        imgs[0] || '',
                        imgs[1] || '',
                        imgs[2] || '',
                        imgs[3] || '',
                        imgs[4] || '',
                        videoAsset ? (videoAsset.cdn_url || videoAsset.asset_url || '') : '',
                    ]);
                }
            }

            // Build styled worksheet
            const ws = xlsx.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...allRows]);

            const headerStyle = {
                fill: { fgColor: { rgb: '3B5D3B' } },
                font: { color: { rgb: 'FFFFFF' }, bold: true },
                alignment: { horizontal: 'center' as const, vertical: 'center' as const },
            };
            const productColStyle = { fill: { fgColor: { rgb: 'FFF9C4' } } };
            const variantColStyle = { fill: { fgColor: { rgb: 'E3F2FD' } } };
            const productColCount = 20;
            const totalCols = TEMPLATE_HEADERS.length;
            const totalDataRows = allRows.length + 1;

            for (let r = 0; r < totalDataRows; r++) {
                for (let c = 0; c < totalCols; c++) {
                    const ref = xlsx.utils.encode_cell({ r, c });
                    if (!ws[ref]) ws[ref] = { v: '', t: 's' };
                    if (r === 0) {
                        ws[ref].s = headerStyle;
                    } else {
                        ws[ref].s = c < productColCount ? productColStyle : variantColStyle;
                    }
                }
            }

            ws['!cols'] = Array(totalCols).fill({ wch: 18 });

            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, 'Products');
            xlsx.writeFile(wb, `Vedashi_Inventory_${targetValue || 'All'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
            toast.success('Excel file generated successfully!');
            onClose();
        } catch (error) {
            console.error('Excel Export Error:', error);
            toast.error('Failed to generate Excel file.');
        } finally {
            setIsExporting(false);
            setExportProgress({ current: 0, total: 0 });
        }
    };

    const getOptionsForTargetType = (): string[] => {
        switch (targetType) {
            case 'category': return categories;
            case 'sub_category':
                if (!parentCategory) return [];
                const parent = allCategoriesData.find(c => c.name === parentCategory);
                if (!parent) return [];
                return allCategoriesData
                    .filter(c => c.parent_id === parent.category_id)
                    .map(c => c.name)
                    .sort();
            case 'brand': return brands;
            default: return [];
        }
    };
    const options = getOptionsForTargetType();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-card-bg border border-border flex flex-col shadow-2xl overflow-visible max-h-[90vh] animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border bg-page-bg rounded-t-2xl">
                    <div>
                        <h2 className="font-serif text-xl font-bold text-gold">Bulk Export</h2>
                        <p className="text-xs text-text-muted mt-1">Export inventory as PDF or Excel</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isExporting}
                        className="rounded-lg p-2 text-text-muted hover:bg-border/50 hover:text-text-primary transition-colors disabled:opacity-30"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 overflow-y-auto hidden-scrollbar">
                    {isExporting ? (
                        <div className="py-8 flex flex-col items-center justify-center space-y-4">
                            <div className="relative h-20 w-20">
                                <Loader2 className="h-20 w-20 animate-spin text-gold opacity-20" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg font-bold text-gold">
                                        {Math.round((exportProgress.current / exportProgress.total) * 100)}%
                                    </span>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-text-primary">Generating Report...</p>
                                <p className="text-xs text-text-muted mt-1">
                                    Processing {exportProgress.current} of {exportProgress.total} products
                                </p>
                            </div>
                            <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="bg-gold h-full transition-all duration-300"
                                    style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Action Target
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {([
                                        { value: 'category', label: 'Category', icon: Layers },
                                        { value: 'sub_category', label: 'Subcategory', icon: Layers },
                                        { value: 'brand', label: 'Brand', icon: Star },
                                        { value: 'all', label: 'All Products', icon: Tag },
                                    ] as const).map(({ value, label, icon: Icon }) => (
                                        <button
                                            key={value}
                                            onClick={() => setTargetType(value)}
                                            className={`flex items-center gap-2 p-3 rounded-xl border transition-all duration-300 ${targetType === value
                                                ? 'border-gold bg-gold/10 text-gold'
                                                : 'border-border bg-page-bg text-text-secondary hover:border-gold/50'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span className="text-sm font-medium">
                                                {label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {targetType !== 'all' && (
                                <div className="space-y-4">
                                    {targetType === 'sub_category' && (
                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-text-secondary mb-1">
                                                Parent Category <span className="text-red-500 ml-0.5">*</span>
                                            </label>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setParentDropdownOpen(!parentDropdownOpen);
                                                        setDropdownOpen(false);
                                                    }}
                                                    className="w-full flex items-center justify-between rounded-xl border border-border bg-page-bg px-4 py-2.5 text-sm text-left focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40 transition-all hover:border-gold/30"
                                                >
                                                    <span className={parentCategory ? 'text-text-primary' : 'text-text-muted'}>
                                                        {loadingOptions ? 'Fetching categories...' : (parentCategory || 'Select a parent category...')}
                                                    </span>
                                                    <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-300 ${parentDropdownOpen ? 'rotate-180' : ''}`} />
                                                </button>

                                                {parentDropdownOpen && (
                                                    <div className="relative z-[80] w-full mt-2 max-h-60 overflow-y-auto rounded-xl border border-border bg-card-bg shadow-2xl p-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                                        {categories.length > 0 ? categories.map((opt: string) => (
                                                            <button
                                                                key={opt}
                                                                type="button"
                                                                onClick={() => {
                                                                    setParentCategory(opt);
                                                                    setTargetValue('');
                                                                    setParentDropdownOpen(false);
                                                                }}
                                                                className={`w-full text-left px-4 py-3 text-sm rounded-lg transition-colors ${parentCategory === opt
                                                                    ? 'bg-gold/10 text-gold-soft font-semibold'
                                                                    : 'text-text-primary hover:bg-gold/5'
                                                                    }`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        )) : (
                                                            <div className="px-4 py-6 text-center text-sm text-text-muted">
                                                                No categories found
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-text-secondary mb-1">
                                            {targetType === 'category' ? 'Category' : targetType === 'sub_category' ? 'Subcategory' : 'Brand'}
                                            <span className="text-red-500 ml-0.5">*</span>
                                        </label>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                disabled={targetType === 'sub_category' && !parentCategory}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDropdownOpen(!dropdownOpen);
                                                    setParentDropdownOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between rounded-xl border border-border bg-page-bg px-4 py-2.5 text-sm text-left focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40 transition-all hover:border-gold/30 ${targetType === 'sub_category' && !parentCategory ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <span className={targetValue ? 'text-text-primary' : 'text-text-muted'}>
                                                    {loadingOptions ? 'Fetching options...' : (targetValue || (targetType === 'sub_category' && !parentCategory ? 'Select parent first...' : `Select ${targetType === 'category' ? 'a category' : targetType === 'sub_category' ? 'a subcategory' : 'a brand'}...`))}
                                                </span>
                                                {loadingOptions ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-gold" />
                                                ) : (
                                                    <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                                                )}
                                            </button>

                                            {dropdownOpen && (
                                                <div className="relative z-[70] w-full mt-2 max-h-60 overflow-y-auto rounded-xl border border-border bg-card-bg shadow-2xl p-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    {options.length > 0 ? options.map((opt: string) => (
                                                        <button
                                                            key={opt}
                                                            type="button"
                                                            onClick={() => {
                                                                setTargetValue(opt);
                                                                setDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left px-4 py-3 text-sm rounded-lg transition-colors ${targetValue === opt
                                                                ? 'bg-gold/10 text-gold-soft font-semibold'
                                                                : 'text-text-primary hover:bg-gold/5'
                                                                }`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    )) : (
                                                        <div className="px-4 py-6 text-center text-sm text-text-muted">
                                                            {loadingOptions ? 'Loading categories...' : 'No options found'}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Format selector ── */}
                            <div>
                                <label className="block text-xs font-bold text-gold-muted uppercase tracking-wider mb-3">
                                    Export Format
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setExportFormat('pdf')}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${exportFormat === 'pdf'
                                            ? 'border-gold bg-gold/5 shadow-sm ring-1 ring-gold/20'
                                            : 'border-border bg-page-bg/50 text-text-muted hover:border-gold/30'
                                            }`}
                                    >
                                        <FileText className={`w-4 h-4 ${exportFormat === 'pdf' ? 'text-gold' : 'text-text-muted'}`} />
                                        <span className={`text-sm font-medium ${exportFormat === 'pdf' ? 'text-gold-soft' : 'text-text-secondary'}`}>PDF</span>
                                    </button>
                                    <button
                                        onClick={() => setExportFormat('excel')}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${exportFormat === 'excel'
                                            ? 'border-gold bg-gold/5 shadow-sm ring-1 ring-gold/20'
                                            : 'border-border bg-page-bg/50 text-text-muted hover:border-gold/30'
                                            }`}
                                    >
                                        <FileSpreadsheet className={`w-4 h-4 ${exportFormat === 'excel' ? 'text-gold' : 'text-text-muted'}`} />
                                        <span className={`text-sm font-medium ${exportFormat === 'excel' ? 'text-gold-soft' : 'text-text-secondary'}`}>Excel (.xlsx)</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-border bg-page-bg flex justify-end items-center gap-3 mt-auto rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isExporting}
                        className="px-5 py-2.5 text-sm font-medium text-text-secondary hover:text-white transition-colors disabled:opacity-30"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => exportFormat === 'excel' ? handleDownloadExcel() : handleDownload()}
                        disabled={isExporting || (targetType !== 'all' && !targetValue)}
                        className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-primary hover:bg-primary-light text-[#E8D8B9] text-sm font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-black/20"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />}
                        {isExporting ? 'Preparing...' : exportFormat === 'excel' ? 'Download Excel' : 'Generate PDF'}
                    </button>
                </div>
            </div>
        </div>
    );
}

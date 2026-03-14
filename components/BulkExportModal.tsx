import React, { useState, useEffect } from 'react';
import { X, Layers, Star, Tag, ChevronDown, Download, Loader2, FileText } from 'lucide-react';
import { Product, getProduct } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

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

    // Dropdown options state
    const [categories, setCategories] = useState<string[]>([]);
    const [subCategories, setSubCategories] = useState<string[]>([]);
    const [brands, setBrands] = useState<string[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        const cats = [...new Set(products.map(p => p.category).filter(Boolean))] as string[];
        const subs = [...new Set(products.map(p => p.sub_category).filter(Boolean))] as string[];
        const brs = [...new Set(products.map(p => p.brand).filter(Boolean))] as string[];
        setCategories(cats.sort());
        setSubCategories(subs.sort());
        setBrands(brs.sort());
    }, [isOpen, products]);

    useEffect(() => {
        setTargetValue('');
        setDropdownOpen(false);
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

    const handleDownload = async () => {
        if (targetType !== 'all' && !targetValue) {
            toast.error(`Please select a ${targetType.replace('_', '')} to export.`);
            return;
        }

        const filteredProducts = products.filter(p => {
            if (targetType === 'all') return true;
            if (targetType === 'category') return p.category === targetValue;
            if (targetType === 'sub_category') return p.sub_category === targetValue;
            if (targetType === 'brand') return p.brand === targetValue;
            return true;
        });

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
                            const b64 = variantRows[data.row.index][0]._b64;
                            if (b64) {
                                try {
                                    doc.addImage(b64, 'JPEG', data.cell.x + 2, data.cell.y + 2, 11, 11);
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

    const getOptionsForTargetType = (): string[] => {
        switch (targetType) {
            case 'category': return categories;
            case 'sub_category': return subCategories;
            case 'brand': return brands;
            default: return [];
        }
    };
    const options = getOptionsForTargetType();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-card-bg border border-border flex flex-col shadow-2xl overflow-hidden max-h-[90vh] animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border bg-page-bg">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10">
                            <FileText className="h-5 w-5 text-gold" />
                        </div>
                        <div>
                            <h2 className="text-xl font-serif font-bold text-gold-soft">Bulk Export</h2>
                            <p className="text-xs text-text-secondary">Export inventory details to premium PDF</p>
                        </div>
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
                <div className="p-6 space-y-6 overflow-y-auto hidden-scrollbar">
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
                                <label className="block text-xs font-bold text-gold-muted uppercase tracking-wider mb-3">
                                    Select Export Scope
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {([
                                        { value: 'category', label: 'By Category', icon: Layers },
                                        { value: 'sub_category', label: 'Subcategory', icon: Layers },
                                        { value: 'brand', label: 'By Brand', icon: Star },
                                        { value: 'all', label: 'All Library', icon: Tag },
                                    ] as const).map(({ value, label, icon: Icon }) => (
                                        <button
                                            key={value}
                                            onClick={() => setTargetType(value)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${targetType === value
                                                ? 'border-gold bg-gold/5 shadow-sm ring-1 ring-gold/20'
                                                : 'border-border bg-page-bg/50 text-text-muted hover:border-gold/30'
                                                }`}
                                        >
                                            <Icon className={`w-4 h-4 ${targetType === value ? 'text-gold' : 'text-text-muted'}`} />
                                            <span className={`text-sm font-medium ${targetType === value ? 'text-gold-soft' : 'text-text-secondary'}`}>
                                                {label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {targetType !== 'all' && (
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gold-muted uppercase tracking-wider">
                                        Specific {targetType === 'category' ? 'Category' : targetType === 'sub_category' ? 'Subcategory' : 'Brand'}
                                    </label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDropdownOpen(!dropdownOpen);
                                            }}
                                            className="w-full flex items-center justify-between rounded-xl border border-border bg-page-bg px-4 py-3 text-sm text-left focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40 transition-all hover:border-gold/30"
                                        >
                                            <span className={targetValue ? 'text-text-primary font-medium' : 'text-text-muted'}>
                                                {targetValue || `Choose ${targetType.replace('_', ' ')}...`}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {dropdownOpen && (
                                            <div className="absolute z-[70] w-full mt-2 max-h-60 overflow-y-auto rounded-xl border border-border bg-card-bg shadow-2xl p-1 animate-in slide-in-from-top-2 duration-200">
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
                                                        No options found
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-border bg-page-bg flex justify-end gap-3 mt-auto">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isExporting}
                        className="px-5 py-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={isExporting || (targetType !== 'all' && !targetValue)}
                        className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-gold text-black font-bold hover:bg-gold-soft transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-gold/20"
                    >
                        {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />}
                        {isExporting ? 'Preparing...' : 'Generate PDF'}
                    </button>
                </div>
            </div>
        </div>
    );
}

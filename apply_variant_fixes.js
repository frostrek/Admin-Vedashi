const fs = require('fs');
const path = require('path');

function replaceAll(str, mapObj) {
    let re = new RegExp(Object.keys(mapObj).join("|").replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g");
    return str.replace(re, function (matched) {
        return mapObj[matched];
    });
}

function processEditPage() {
    const editPath = path.join(__dirname, 'app/dashboard/products/edit/[id]/page.tsx');
    let content = fs.readFileSync(editPath, 'utf8');

    // 1. VariantRow update
    content = content.replace(`    pack?: string;\n    combo?: string;\n    item_weight_kg_input: string;`, `    pack?: string;\n    combo?: string;\n    [key: string]: any;\n    item_weight_kg_input: string;`);

    // 2. volStr and Weight/Volume fallback removal
    const target1 = `                    // Legacy field mapping
                    let volStr = v.volume || '';
                    if (!volStr && v.size_label && v.size_label.toLowerCase() !== 'standard') volStr = v.size_label;
                    if (!volStr && v.volume_ml) {
                        volStr = v.volume_ml >= 1000 ? \`\${v.volume_ml / 1000} L\` : \`\${v.volume_ml} ml\`;
                    }

                    let pkStr = v.pack || '';`;

    const replacement1 = `                    // Check options for new fields first to assist with dimensions
                    const opts = typeof v.options === 'string' ? JSON.parse(v.options) : (v.options || {});

                    // Legacy field mapping
                    let volStr = v.volume || opts['Volume'] || opts['volume'] || '';
                    if (!volStr && v.size_label && v.size_label.toLowerCase() !== 'standard') volStr = v.size_label;

                    let pkStr = v.pack || '';`;
    content = content.replace(target1, replacement1);

    const target2 = `                    // Check options for new fields
                    const opts = typeof v.options === 'string' ? JSON.parse(v.options) : (v.options || {});

                    // Metadata mapping for all dimensions
                    const dims: (keyof typeof newDimConfigs)[] = ['weight', 'volume', 'count', 'strength', 'flavor', 'pack', 'combo'];

                    // Specific mapping for new database fields
                    let weightStr = v.weight || opts['Weight'] || '';
                    if (!weightStr && v.weight_g) {
                        weightStr = v.weight_g >= 1000 ? \`\${v.weight_g / 1000} kg\` : \`\${v.weight_g} g\`;
                    }`;

    const replacement2 = `                    // Metadata mapping for all dimensions
                    const dims: string[] = ['weight', 'volume', 'count', 'strength', 'flavor', 'pack', 'combo'];

                    const dynamicKeys = Object.keys(opts).filter(k => !dims.map(d => d.toLowerCase()).includes(k.toLowerCase()));
                    dynamicKeys.forEach(k => {
                        const dKey = k.toLowerCase();
                        if (!(newDimConfigs as any)[dKey]) {
                            (newDimConfigs as any)[dKey] = { active: false, values: [] };
                        }
                        const val = opts[k];
                        if (val) {
                            (newDimConfigs as any)[dKey].active = true;
                            if (!(newDimConfigs as any)[dKey].values.includes(val)) {
                                (newDimConfigs as any)[dKey].values.push(val);
                            }
                        }
                    });

                    // Specific mapping for new database fields
                    let weightStr = v.weight || opts['Weight'] || opts['weight'] || '';`;
    content = content.replace(target2, replacement2);

    const target3 = `                        }
                        .filter(vid => vid.preview);

                    return {
                        variant_id: v.variant_id || undefined,
                        product_name: vName,`;
    
    const replacement3 = `                        }
                        .filter(vid => vid.preview);

                    const variantObj: VariantRow = {
                        variant_id: v.variant_id || undefined,
                        product_name: vName,`;
    content = content.replace(target3, replacement3);

    const target4 = `                        isDefault: index === 0,
                        isActive: v.is_active !== false,
                    };
                });

                setVariants(mappedVariants);`;
    
    const replacement4 = `                        isDefault: index === 0,
                        isActive: v.is_active !== false,
                    };

                    dynamicKeys.forEach(k => {
                        variantObj[k.toLowerCase()] = opts[k];
                    });

                    return variantObj;
                });

                setVariants(mappedVariants);`;
    content = content.replace(target4, replacement4);

    fs.writeFileSync(editPath, content);
}

function processAddPage() {
    const addPath = path.join(__dirname, 'app/dashboard/products/add/page.tsx');
    let content = fs.readFileSync(addPath, 'utf8');

    // VariantRow update
    content = content.replace(`    pack?: string;\n    combo?: string;\n    item_weight_kg_input: string;`, `    pack?: string;\n    combo?: string;\n    [key: string]: any;\n    item_weight_kg_input: string;`);
    
    fs.writeFileSync(addPath, content);
}

function processExpandedRow(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    const targetUIEdit = `                                                                                    {!dimConfigs.weight.active && (
                                                                                        <div>
                                                                                            <label className="block text-xs font-medium text-text-secondary mb-1">Weight</label>
                                                                                            <input
                                                                                                type="text"
                                                                                                value={variant.weight_input || ''}
                                                                                                onChange={e => updateVariant(vIdx, 'weight_input', e.target.value)}
                                                                                                placeholder="e.g. 500g"
                                                                                                className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
                                                                                            />
                                                                                            <p className="text-[10px] text-text-muted mt-0.5 ml-1">g / kg / mg / oz / lb</p>
                                                                                        </div>
                                                                                    )}
                                                                                    {!dimConfigs.volume.active && (
                                                                                        <div>
                                                                                            <label className="block text-xs font-medium text-text-secondary mb-1">Volume</label>
                                                                                            <input
                                                                                                type="text"
                                                                                                value={variant.volume_input || ''}
                                                                                                onChange={e => updateVariant(vIdx, 'volume_input', e.target.value)}
                                                                                                placeholder="e.g. 250ml"
                                                                                                className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
                                                                                            />
                                                                                            <p className="text-[10px] text-text-muted mt-0.5 ml-1">ml / L</p>
                                                                                        </div>
                                                                                    )}`;
    
    const targetUIAdd = `                                                                                            {!dimConfigs.weight.active && (
                                                                                                <div>
                                                                                                    <label className="block text-xs font-medium text-text-secondary mb-1">Weight</label>
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        value={variant.weight_input || ''}
                                                                                                        onChange={e => updateVariant(vIdx, 'weight_input', e.target.value)}
                                                                                                        placeholder="e.g. 500g"
                                                                                                        className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
                                                                                                    />
                                                                                                    <p className="text-[10px] text-text-muted mt-0.5 ml-1">g / kg / mg / oz / lb</p>
                                                                                                </div>
                                                                                            )}
                                                                                            {!dimConfigs.volume.active && (
                                                                                                <div>
                                                                                                    <label className="block text-xs font-medium text-text-secondary mb-1">Volume</label>
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        value={variant.volume_input || ''}
                                                                                                        onChange={e => updateVariant(vIdx, 'volume_input', e.target.value)}
                                                                                                        placeholder="e.g. 250ml"
                                                                                                        className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
                                                                                                    />
                                                                                                    <p className="text-[10px] text-text-muted mt-0.5 ml-1">ml / L</p>
                                                                                                </div>
                                                                                            )}`;

    function genReplacement(spaces) {
        return `${spaces}{!dimConfigs.weight.active && !dimConfigs.volume.active && (
${spaces}    <>
${spaces}        {(!variant.weight_input && !variant.volume_input) && (
${spaces}            <div className="col-span-2 space-y-4">
${spaces}                <div className="grid grid-cols-2 gap-4">
${spaces}                    <div>
${spaces}                        <label className="block text-xs font-medium text-text-secondary mb-1">Weight</label>
${spaces}                        <input
${spaces}                            type="text"
${spaces}                            value=""
${spaces}                            onChange={e => { updateVariant(vIdx, 'weight_input', e.target.value); updateVariant(vIdx, 'volume_input', ''); }}
${spaces}                            placeholder="e.g. 500g"
${spaces}                            className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
${spaces}                        />
${spaces}                        <p className="text-[10px] text-text-muted mt-0.5 ml-1">g / kg / mg / oz / lb</p>
${spaces}                    </div>
${spaces}                    <div>
${spaces}                        <label className="block text-xs font-medium text-text-secondary mb-1">Volume</label>
${spaces}                        <input
${spaces}                            type="text"
${spaces}                            value=""
${spaces}                            onChange={e => { updateVariant(vIdx, 'volume_input', e.target.value); updateVariant(vIdx, 'weight_input', ''); }}
${spaces}                            placeholder="e.g. 250ml"
${spaces}                            className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
${spaces}                        />
${spaces}                        <p className="text-[10px] text-text-muted mt-0.5 ml-1">ml / L</p>
${spaces}                    </div>
${spaces}                </div>
${spaces}                <p className="text-xs text-gold/80 italic">Fill either Weight or Volume, not both</p>
${spaces}            </div>
${spaces}        )}
${spaces}        {(variant.weight_input && !variant.volume_input) && (
${spaces}            <div>
${spaces}                <label className="block text-xs font-medium text-text-secondary mb-1">Weight</label>
${spaces}                <input
${spaces}                    type="text"
${spaces}                    value={variant.weight_input}
${spaces}                    onChange={e => updateVariant(vIdx, 'weight_input', e.target.value)}
${spaces}                    placeholder="e.g. 500g"
${spaces}                    className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
${spaces}                />
${spaces}                <div className="flex items-center justify-between mt-1">
${spaces}                    <p className="text-[10px] text-text-muted ml-1">g / kg / mg / oz / lb</p>
${spaces}                    <button type="button" onClick={() => { updateVariant(vIdx, 'weight_input', ''); updateVariant(vIdx, 'volume_input', ' '); setTimeout(() => updateVariant(vIdx, 'volume_input', ''), 0); }} className="text-[10px] text-gold hover:text-gold-soft cursor-pointer transition-colors bg-transparent border-none p-0">Switch to Volume instead</button>
${spaces}                </div>
${spaces}            </div>
${spaces}        )}
${spaces}        {(!!variant.volume_input && !variant.weight_input) && (
${spaces}            <div>
${spaces}                <label className="block text-xs font-medium text-text-secondary mb-1">Volume</label>
${spaces}                <input
${spaces}                    type="text"
${spaces}                    value={variant.volume_input}
${spaces}                    onChange={e => updateVariant(vIdx, 'volume_input', e.target.value)}
${spaces}                    placeholder="e.g. 250ml"
${spaces}                    className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-gold/40 focus:outline-none bg-transparent transition-colors"
${spaces}                />
${spaces}                <div className="flex items-center justify-between mt-1">
${spaces}                    <p className="text-[10px] text-text-muted ml-1">ml / L</p>
${spaces}                    <button type="button" onClick={() => { updateVariant(vIdx, 'volume_input', ''); updateVariant(vIdx, 'weight_input', ' '); setTimeout(() => updateVariant(vIdx, 'weight_input', ''), 0); }} className="text-[10px] text-gold hover:text-gold-soft cursor-pointer transition-colors bg-transparent border-none p-0">Switch to Weight instead</button>
${spaces}                </div>
${spaces}            </div>
${spaces}        )}
${spaces}    </>
${spaces})}`;
    }

    if (content.includes(targetUIEdit)) {
        content = content.replace(targetUIEdit, genReplacement('                                                                                    '));
    } 
    if (content.includes(targetUIAdd)) {
        content = content.replace(targetUIAdd, genReplacement('                                                                                            '));
    }

    fs.writeFileSync(filePath, content);
}

try {
    processEditPage();
    processAddPage();
    processExpandedRow(path.join(__dirname, 'app/dashboard/products/edit/[id]/page.tsx'));
    processExpandedRow(path.join(__dirname, 'app/dashboard/products/add/page.tsx'));
    console.log("Success");
} catch(e) {
    console.error(e);
}

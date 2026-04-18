const fs = require('fs');

const path = './app/dashboard/products/edit/[id]/page.tsx';
let data = fs.readFileSync(path, 'utf8');

data = data.replace(
    "import { Category } from '@/types/category';",
    "import { Category } from '@/types/category';\nimport CategoryMillerColumns from '@/components/admin/CategoryMillerColumns';"
);

data = data.replace(
    "const [categories, setCategories] = useState<Category[]>([]);",
    "const [categories, setCategories] = useState<Category[]>([]);\n    const [isCategoryLoading, setIsCategoryLoading] = useState(false);\n    const parentCategories = categories.filter(c => !c.parent_id);"
);

// sub_category_id definition logic
data = data.replace(/sub_category_id: '',\r?\n/g, "");
data = data.replace(/sub_category_id: form\.sub_category_id \|\| undefined,\r?\n/g, "");

// Hydration
data = data.replace(
    /const productCatId = product\.category_id \|\| '';[\s\S]*?setForm\(\{[\s\S]*?category_id: productCatId,\s*sub_category_id: productSubCatId,/m,
    `setForm({
                product_name: product.product_name || '',
                brand: product.brand || '',
                category_id: product.category_id || '',`
);

// handleCategoryChange & selectedParent
data = data.replace(
    /const selectedParent = categories\.find[\s\S]*?const update = \(field: string, value: any\) => setForm\(prev => \(\{ \.\.\.prev, \[field\]: value \}\)\);\r?\n\r?\n    const handleCategoryChange = \(value: string\) => \{[\s\S]*?\};\r?\n/m,
    `// Constants
    const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));
    const handleCategoryChange = (leafId: string, fullPath: Category[]) => { update('category_id', leafId); };\n`
);

// JSX Block
const catBlockStart = data.indexOf('{/* Category */}');
const countryBlockStart = data.indexOf('{/* Country of Origin */}');
if (catBlockStart > -1 && countryBlockStart > -1) {
    const newBlock = `{/* Category */}
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Category</label>
                                        <CategoryMillerColumns
                                            rootCategories={parentCategories}
                                            allCategories={categories}
                                            value={form.category_id}
                                            onChange={handleCategoryChange}
                                            onLoadingChange={setIsCategoryLoading}
                                        />
                                    </div>

                                    `;
    data = data.substring(0, catBlockStart) + newBlock + data.substring(countryBlockStart);
}

// Next Button
data = data.replace(
    /onClick={goNext}\s*className="flex w-full items-center/g,
    'onClick={goNext}\n                                        disabled={currentStep === 1 && isCategoryLoading}\n                                        className="flex w-full items-center'
);

// Remove Modals
const modalStart = data.indexOf('{/* ── Create Category Modal ── */}');
if (modalStart > -1) {
    data = data.substring(0, modalStart) + `        </>\n    );\n}\n`;
}

fs.writeFileSync(path, data);
console.log('Edit page script complete.');

const fs = require('fs');
const path = './app/dashboard/products/edit/[id]/page.tsx';
let data = fs.readFileSync(path, 'utf8');

if (!data.includes('CategoryMillerColumns')) {
    data = data.replace(
        "import { Category } from '@/types/category';",
        "import { Category } from '@/types/category';\nimport CategoryMillerColumns from '@/components/admin/CategoryMillerColumns';"
    );
}

data = data.replace(/sub_category_id: '',\r?\n/g, '');

if (!data.includes('isCategoryLoading')) {
    data = data.replace(
        "const [categories, setCategories] = useState<Category[]>([]);",
        "const [categories, setCategories] = useState<Category[]>([]);\n    const [isCategoryLoading, setIsCategoryLoading] = useState(false);"
    );
}

data = data.replace(
    /const productCatId = product\.category_id \|\| '';[\s\S]*?setForm\(\{[\s\S]*?specialities: \(product as any\)\.specialities \|\| \[\],/m,
    `setForm({
                product_name: product.product_name || '',
                brand: product.brand || '',
                category_id: product.category_id || '',
                country_of_origin: product.country_of_origin || (product as any).specifications?.country_of_origin || '',
                form_type: (product as any).form || '',
                specialities: (product as any).specialities || [],`
);

data = data.replace(/sub_category_id: form\.sub_category_id \|\| undefined,\r?\n/g, "");

const updateFuncPos = data.indexOf(`const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));`);
if (updateFuncPos > -1 && !data.includes('const handleCategoryChange = (leafId')) {
    data = data.substring(0, updateFuncPos + 95) + `\n\n    const handleCategoryChange = (leafId: string, fullPath: Category[]) => { update('category_id', leafId); };\n` + data.substring(updateFuncPos + 95);
}

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
                                    </div>\n\n                                    `;
    data = data.substring(0, catBlockStart) + newBlock + data.substring(countryBlockStart);
}

if (!data.includes('const parentCategories = categories.filter')) {
    const categoriesArrayPos = data.indexOf('const id = dbProductId || urlId;');
    if (categoriesArrayPos > -1) {
       data = data.replace('const id = dbProductId || urlId;', `const id = dbProductId || urlId;\n    const parentCategories = categories.filter(c => !c.parent_id);`); 
    }
}

data = data.replace(
    /onClick={goNext}\s*className="flex w-full items-center/g,
    'onClick={goNext}\n                                        disabled={currentStep === 1 && isCategoryLoading}\n                                        className="flex w-full items-center'
);

const modalStart = data.indexOf('{showCategoryModal && (');
if (modalStart > -1) {
    data = data.substring(0, modalStart) + `\n        </>\n    );\n}\n`;
}

fs.writeFileSync(path, data);
console.log('Patch complete for Edit Page.');

const fs = require('fs');
const path = './app/dashboard/products/add/page.tsx';
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
data = data.replace(/sub_category_id: form\.sub_category_id \|\| undefined,\r?\n/g, "");
data = data.replace(/sub_category_id: f\.sub_category_id \|\| undefined,\r?\n/g, "");
if (!data.includes('const handleCategoryChange = (leafId')) {
    data = data.replace(
        /const handleCategoryChange = \(value: string\) => \{[\s\S]*?\};/gm,
        "const handleCategoryChange = (leafId: string, fullPath: Category[]) => { update('category_id', leafId); };"
    );
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
data = data.replace(
    /onClick={goNext}\s*className="flex w-full items-center/g,
    'onClick={goNext}\n                                        disabled={currentStep === 1 && isCategoryLoading}\n                                        className="flex w-full items-center'
);
const modalStart = data.indexOf('{showCategoryModal && (');
if (modalStart > -1) {
    data = data.substring(0, modalStart) + `\n        </>\n    );\n}\n`;
}
fs.writeFileSync(path, data);
console.log('Patch complete for Add Page.');

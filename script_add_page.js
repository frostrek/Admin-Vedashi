const fs = require('fs');
const path = './app/dashboard/products/add/page.tsx';
let data = fs.readFileSync(path, 'utf8');

// 1. Imports
if (!data.includes('CategoryMillerColumns')) {
    data = data.split("import { Category } from '@/types/category';").join("import { Category } from '@/types/category';\nimport CategoryMillerColumns from '@/components/admin/CategoryMillerColumns';");
}

// 2. States
if (!data.includes('isCategoryLoading')) {
    data = data.split("const [categories, setCategories] = useState<Category[]>([]);").join("const [categories, setCategories] = useState<Category[]>([]);\n    const [isCategoryLoading, setIsCategoryLoading] = useState(false);");
}

data = data.split("sub_category_id: '',\n").join("");
data = data.split("sub_category_id: '',\r\n").join("");
data = data.split("sub_category_id: '',").join("");

// 4. Payloads
data = data.split("sub_category_id: form.sub_category_id || undefined,").join("");
data = data.split("sub_category_id: f.sub_category_id || undefined,").join("");

// 5. Parent Categories logic
const oldParentLogic1 = `    const selectedParent = categories.find(c => c.category_id === form.category_id);
    const subCategories = selectedParent
        ? categories.filter(c => c.parent_id === selectedParent.category_id)
        : [];`;
const oldParentLogic2 = `    const selectedParent = categories.find(c => c.category_id === form.category_id);\r\n    const subCategories = selectedParent\r\n        ? categories.filter(c => c.parent_id === selectedParent.category_id)\r\n        : [];`;
data = data.split(oldParentLogic1).join("");
data = data.split(oldParentLogic2).join("");

// 6. Handle category change
const oldCatChange1 = `    const handleCategoryChange = (value: string) => {
        update('category_id', value);
        update('sub_category_id', '');
    };`;
const oldCatChange2 = `    const handleCategoryChange = (value: string) => {\r\n        update('category_id', value);\r\n        update('sub_category_id', '');\r\n    };`;
const newCatChange = `    const handleCategoryChange = (leafId: string, fullPath: Category[]) => { update('category_id', leafId); };`;
data = data.split(oldCatChange1).join(newCatChange);
data = data.split(oldCatChange2).join(newCatChange);

// 7. Category Block
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
                                    </div>`;

const startIdx = data.indexOf('{/* Category */}');
const endIdx = data.indexOf('{/* Country of Origin */}');
if (startIdx > -1 && endIdx > -1) {
    data = data.substring(0, startIdx) + newBlock + "\n\n                                    " + data.substring(endIdx);
}

// 8. Next button
data = data.split('onClick={goNext}\n                                        className="flex w-full').join('onClick={goNext}\n                                        disabled={currentStep === 1 && isCategoryLoading}\n                                        className="flex w-full');
data = data.split('onClick={goNext}\r\n                                        className="flex w-full').join('onClick={goNext}\n                                        disabled={currentStep === 1 && isCategoryLoading}\n                                        className="flex w-full');

// 9. Remove Modals at bottom
const modalStart = data.indexOf('{showCategoryModal && (');
if (modalStart > -1) {
    data = data.substring(0, modalStart) + `        </>\n    );\n}\n`;
}

fs.writeFileSync(path, data);
console.log('add page fixed');

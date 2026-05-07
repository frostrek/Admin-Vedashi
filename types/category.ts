// Category Types — mirrors backend schemas

export interface Category {
    category_id: string;
    name: string;
    slug: string;
    description: string;
    parent_id: string | null;
    image_url: string | null;
    sort_order: number;
    is_active: boolean;
    has_children?: boolean;
    needs_action?: boolean;
    product_count?: number;
    children?: Category[];
}

export interface CreateCategoryPayload {
    name: string;
    slug: string;
    description?: string;
    parent_id?: string | null;
    image_url?: string | null;
}

export interface UpdateCategoryPayload {
    name?: string;
    slug?: string;
    description?: string;
    parent_id?: string | null;
    image_url?: string | null;
    is_active?: boolean;
    sort_order?: number;
}

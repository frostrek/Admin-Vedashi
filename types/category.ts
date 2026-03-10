// Category Types — mirrors backend schema

export interface Category {
    category_id: string;
    name: string;
    slug: string;
    description: string;
    parent_id: string | null;
    image_url: string | null;
    sort_order: number;
    is_active: boolean;
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

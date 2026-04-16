// Product Types - mirrors backend schema using snake_case
export interface Product {
    id: string;
    product_id?: string;
    sku?: string;
    product_name?: string;
    brand?: string;
    category?: string;
    sub_category?: string;
    category_id?: string;
    sub_category_id?: string;
    description?: string;
    unit_of_measure?: string;
    intended_use?: string;
    price: number;
    quantity?: number;

    specifications?: ProductSpecifications;
    packaging?: ProductPackaging;
    variants?: ProductVariant[];
    additional_info?: ProductAdditionalInfo;
    digital_assets?: ProductDigitalAssets;

    manufacturer?: string;
    lead_time?: string;

    created_at?: string;
    updated_at?: string;
}

export interface ProductSpecifications {
    material?: string;
    dimensions?: string;
    weight?: string;
    color?: string;
    capacity?: string;
    grade?: string;
    shelf_life?: string;
    country_of_origin?: string;
}

export interface ProductPackaging {
    packaging_type?: string;
    pack_size?: string;
    net_quantity?: string;
    gross_weight?: string;
    packaging_material?: string;
    carton_size?: string;
    units_per_carton?: number;
    barcode?: string;
}

export interface ProductVariant {
    variant_id: string;
    variant_name: string;
    variant_sku?: string;
    price: number;
    volume_ml?: number;
    pack_quantity?: number;
    stock_quantity?: number;
    size_label?: string;
    cost_price?: number;
    weight_g?: number;
    flavor?: string;
    is_combo?: boolean;
    strength?: string;
    strength_unit?: string;
    form_factor?: string;
    units_count?: number;
    barcode?: string;
    is_active?: boolean;
    is_default?: boolean;
    currency?: string;
    sale_price?: number;
    sale_start?: string;
    sale_end?: string;
}

export interface ProductAdditionalInfo {
    manufacturer_name?: string;
    manufacturer_address?: string;
    regulatory_details?: string;
    storage_instructions?: string;
    handling_instructions?: string;
    warranty?: string;
    safety_warnings?: string;
    notes?: string;
}

export interface ProductDigitalAssets {
    primary_image?: string;
    secondary_images?: string[];
    packaging_image?: string;
    label_image?: string;
    datasheet?: string;
    certificates?: string[];
    video_url?: string;
}

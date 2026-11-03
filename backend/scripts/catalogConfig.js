const TARGET_CATEGORIES = [
    { name: "Electronics & Gadgets", description: "Tablets and everyday electronic devices." },
    { name: "Mobile Phones & Accessories", description: "Smartphones and mobile-device accessories." },
    { name: "Computers & Accessories", description: "Laptops, computer gear, and gaming peripherals." },
    { name: "Home & Kitchen", description: "Furniture, home decor, and kitchen essentials." },
    { name: "Fashion & Clothing", description: "Clothing and footwear for everyday wear." },
    { name: "Beauty & Personal Care", description: "Beauty, skincare, and fragrance products." },
    { name: "Sports & Outdoors", description: "Accessories for sports and outdoor activities." },
    { name: "Toys & Games", description: "Toys, games, and activities." },
    { name: "Books & Stationery", description: "Books and everyday stationery." },
    { name: "Accessories & Lifestyle", description: "Watches, bags, jewelry, and lifestyle accessories." }
];

const SOURCE_CATEGORY_MAP = {
    smartphones: "Mobile Phones & Accessories",
    "mobile-accessories": "Mobile Phones & Accessories",
    laptops: "Computers & Accessories",
    tablets: "Electronics & Gadgets",
    beauty: "Beauty & Personal Care",
    fragrances: "Beauty & Personal Care",
    "skin-care": "Beauty & Personal Care",
    furniture: "Home & Kitchen",
    "home-decoration": "Home & Kitchen",
    "kitchen-accessories": "Home & Kitchen",
    "mens-shirts": "Fashion & Clothing",
    "mens-shoes": "Fashion & Clothing",
    "womens-dresses": "Fashion & Clothing",
    "womens-shoes": "Fashion & Clothing",
    tops: "Fashion & Clothing",
    "sports-accessories": "Sports & Outdoors",
    sunglasses: "Accessories & Lifestyle",
    "mens-watches": "Accessories & Lifestyle",
    "womens-watches": "Accessories & Lifestyle",
    "womens-bags": "Accessories & Lifestyle",
    "womens-jewellery": "Accessories & Lifestyle"
};

const EXISTING_CATEGORY_MAP = {
    "Electronics & Gadgets": "Electronics & Gadgets",
    "Samsung Galaxy": "Mobile Phones & Accessories",
    "Gaming Accessories": "Computers & Accessories",
    Beauty: "Beauty & Personal Care",
    Fragrances: "Beauty & Personal Care",
    Furniture: "Home & Kitchen"
};

module.exports = {
    EXISTING_CATEGORY_MAP,
    SOURCE_CATEGORY_MAP,
    TARGET_CATEGORIES
};

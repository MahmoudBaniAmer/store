const Order = require("../models/Order");
const Product = require("../models/Product");

const getAnalytics = async (req, res) => {
    try {
        const firstDay = new Date();
        firstDay.setUTCHours(0, 0, 0, 0);
        firstDay.setUTCDate(firstDay.getUTCDate() - 6);

        const [orderCounts, products] = await Promise.all([
            Order.aggregate([
                { $match: { createdAt: { $gte: firstDay } } },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$createdAt",
                                timezone: "UTC"
                            }
                        },
                        count: { $sum: 1 }
                    }
                }
            ]),
            Product.find()
                .select("stock category")
                .populate("category", "name")
                .lean()
        ]);

        const countsByDay = new Map(
            orderCounts.map(({ _id, count }) => [_id, count])
        );
        const ordersByDay = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(firstDay);
            date.setUTCDate(firstDay.getUTCDate() + index);
            const key = date.toISOString().slice(0, 10);
            return { date: key, count: countsByDay.get(key) || 0 };
        });

        const stockByCategory = new Map();
        for (const product of products) {
            const categoryId = product.category?._id?.toString() || "uncategorized";
            const category = product.category?.name || "Uncategorized";
            const current = stockByCategory.get(categoryId) || {
                category,
                products: 0,
                units: 0
            };
            current.products += 1;
            current.units += Number(product.stock) || 0;
            stockByCategory.set(categoryId, current);
        }

        return res.status(200).json({
            ordersByDay,
            stockByCategory: Array.from(stockByCategory.values())
        });
    } catch (error) {
        console.error("GET ADMIN ANALYTICS ERROR:", error);
        return res.status(500).json({
            message: "Failed to load admin analytics"
        });
    }
};

module.exports = { getAnalytics };

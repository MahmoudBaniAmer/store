const Order = require("../models/Order");
const Product = require("../models/Product");

const getAnalytics = async (req, res) => {
    try {
        const firstDay = new Date();
        firstDay.setUTCHours(0, 0, 0, 0);
        firstDay.setUTCDate(firstDay.getUTCDate() - 6);

        const [orderCounts, sales, products] = await Promise.all([
            Order.aggregate([
                {
                    $match: {
                        status: { $ne: "cancelled" },
                        createdAt: { $gte: firstDay }
                    }
                },
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
            Order.aggregate([
                { $match: { status: { $ne: "cancelled" } } },
                {
                    $project: {
                        createdAt: 1,
                        items: {
                            $cond: [
                                { $gt: [{ $size: { $ifNull: ["$items", []] } }, 0] },
                                "$items",
                                [{ product: "$product", quantity: "$quantity" }]
                            ]
                        }
                    }
                },
                { $unwind: "$items" },
                {
                    $lookup: {
                        from: Product.collection.name,
                        localField: "items.product",
                        foreignField: "_id",
                        as: "product"
                    }
                },
                { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {
                        unitPrice: {
                            $ifNull: ["$items.unitPrice", { $ifNull: ["$product.price", 0] }]
                        },
                        day: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$createdAt",
                                timezone: "UTC"
                            }
                        }
                    }
                },
                {
                    $facet: {
                        daily: [
                            { $match: { createdAt: { $gte: firstDay } } },
                            {
                                $group: {
                                    _id: "$day",
                                    revenue: {
                                        $sum: { $multiply: ["$items.quantity", "$unitPrice"] }
                                    },
                                    orders: { $addToSet: "$_id" }
                                }
                            }
                        ],
                        summary: [
                            {
                                $group: {
                                    _id: null,
                                    revenue: {
                                        $sum: { $multiply: ["$items.quantity", "$unitPrice"] }
                                    },
                                    orders: { $addToSet: "$_id" },
                                    unitsSold: { $sum: "$items.quantity" }
                                }
                            },
                            {
                                $project: {
                                    _id: 0,
                                    totalRevenue: "$revenue",
                                    totalOrders: { $size: "$orders" },
                                    unitsSold: 1
                                }
                            }
                        ]
                    }
                }
            ]),
            Product.find({ isActive: { $ne: false } })
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
        const salesData = sales[0] || { daily: [], summary: [] };
        const salesByDay = new Map(
            salesData.daily.map(({ _id, revenue, orders }) => [
                _id,
                { revenue, orderCount: orders.length }
            ])
        );
        const revenueByDay = ordersByDay.map(({ date }) => ({
            date,
            revenue: Number(salesByDay.get(date)?.revenue || 0),
            orderCount: salesByDay.get(date)?.orderCount || 0
        }));

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
            stockByCategory: Array.from(stockByCategory.values()),
            revenueByDay,
            salesSummary: salesData.summary[0] || {
                totalRevenue: 0,
                totalOrders: 0,
                unitsSold: 0
            }
        });
    } catch (error) {
        console.error("GET ADMIN ANALYTICS ERROR:", error.name);
        return res.status(500).json({
            message: "Failed to load admin analytics"
        });
    }
};

module.exports = { getAnalytics };

import { Router, Request, Response } from 'express';
import dayjs from 'dayjs';
import { Order } from '../models/Order';
import { Dish } from '../models/Dish';
import { authMiddleware, requireRoles } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/sales-ranking', async (req: Request, res: Response) => {
  try {
    const {
      canteenId,
      startDate,
      endDate,
      category = '',
      limit = '20',
    } = req.query;

    const match: any = {
      status: { $ne: 'cancelled' },
    };

    if (req.user?.role === 'canteen') {
      match.canteenId = req.user.canteenId;
    } else if (canteenId) {
      match.canteenId = canteenId;
    }

    if (startDate || endDate) {
      match.mealDate = {};
      if (startDate) match.mealDate.$gte = new Date(startDate as string);
      if (endDate) {
        const end = dayjs(endDate as string).add(1, 'day').toDate();
        match.mealDate.$lt = end;
      }
    }

    const pipeline: any[] = [
      { $match: match },
      { $unwind: '$orderDishes' },
      {
        $group: {
          _id: '$orderDishes.dishId',
          dishName: { $first: '$orderDishes.dishName' },
          category: { $first: '$orderDishes.category' },
          totalQuantity: { $sum: '$orderDishes.quantity' },
          totalSales: { $sum: { $multiply: ['$orderDishes.price', '$orderDishes.quantity'] } },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: -1 } },
    ];

    if (category) {
      pipeline.splice(2, 0, { $match: { category: category as string } });
    }

    if (limit) {
      pipeline.push({ $limit: parseInt(limit as string, 10) });
    }

    const results = await Order.aggregate(pipeline);

    const formattedResults = results.map((item, index) => ({
      rank: index + 1,
      dishId: item._id,
      dishName: item.dishName,
      category: item.category,
      totalQuantity: item.totalQuantity,
      totalSales: item.totalSales,
      orderCount: item.orderCount,
    }));

    res.json(formattedResults);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取销量排行失败' });
  }
});

router.get('/category-stats', async (req: Request, res: Response) => {
  try {
    const { canteenId, startDate, endDate } = req.query;

    const match: any = {
      status: { $ne: 'cancelled' },
    };

    if (req.user?.role === 'canteen') {
      match.canteenId = req.user.canteenId;
    } else if (canteenId) {
      match.canteenId = canteenId;
    }

    if (startDate || endDate) {
      match.mealDate = {};
      if (startDate) match.mealDate.$gte = new Date(startDate as string);
      if (endDate) {
        const end = dayjs(endDate as string).add(1, 'day').toDate();
        match.mealDate.$lt = end;
      }
    }

    const results = await Order.aggregate([
      { $match: match },
      { $unwind: '$orderDishes' },
      {
        $group: {
          _id: '$orderDishes.category',
          totalQuantity: { $sum: '$orderDishes.quantity' },
          totalSales: { $sum: { $multiply: ['$orderDishes.price', '$orderDishes.quantity'] } },
          dishCount: { $addToSet: '$orderDishes.dishId' },
        },
      },
      { $sort: { totalQuantity: -1 } },
    ]);

    const categoryMap: Record<string, string> = {
      staple: '主食',
      meat: '荤菜',
      vegetable: '素菜',
      soup: '汤品',
      porridge: '粥点',
      fruit: '水果',
    };

    const totalQuantity = results.reduce((sum, item) => sum + item.totalQuantity, 0);
    const totalSales = results.reduce((sum, item) => sum + item.totalSales, 0);

    const formattedResults = results.map(item => ({
      category: item._id,
      categoryName: categoryMap[item._id] || item._id,
      totalQuantity: item.totalQuantity,
      totalSales: item.totalSales,
      quantityPercentage: totalQuantity > 0 ? ((item.totalQuantity / totalQuantity) * 100).toFixed(1) : '0',
      salesPercentage: totalSales > 0 ? ((item.totalSales / totalSales) * 100).toFixed(1) : '0',
      dishTypeCount: item.dishCount.length,
    }));

    res.json({
      categories: formattedResults,
      totalQuantity,
      totalSales,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取分类统计失败' });
  }
});

router.get('/slow-moving', async (req: Request, res: Response) => {
  try {
    const { canteenId, startDate, endDate, threshold = '5' } = req.query;

    const match: any = {
      status: { $ne: 'cancelled' },
    };

    if (req.user?.role === 'canteen') {
      match.canteenId = req.user.canteenId;
    } else if (canteenId) {
      match.canteenId = canteenId;
    }

    if (startDate || endDate) {
      match.mealDate = {};
      if (startDate) match.mealDate.$gte = new Date(startDate as string);
      if (endDate) {
        const end = dayjs(endDate as string).add(1, 'day').toDate();
        match.mealDate.$lt = end;
      }
    }

    const salesResults = await Order.aggregate([
      { $match: match },
      { $unwind: '$orderDishes' },
      {
        $group: {
          _id: '$orderDishes.dishId',
          dishName: { $first: '$orderDishes.dishName' },
          category: { $first: '$orderDishes.category' },
          totalQuantity: { $sum: '$orderDishes.quantity' },
        },
      },
    ]);

    const salesMap = new Map();
    salesResults.forEach(item => {
      salesMap.set(item._id.toString(), item);
    });

    const dishQuery: any = { status: 'on_shelf' };

    const allDishes = await Dish.find(dishQuery).sort({ name: 1 });

    const thresholdNum = parseInt(threshold as string, 10);
    const slowMovingDishes = allDishes
      .filter(dish => {
        const sales = salesMap.get(dish._id.toString());
        const quantity = sales?.totalQuantity || 0;
        return quantity <= thresholdNum;
      })
      .map(dish => {
        const sales = salesMap.get(dish._id.toString());
        return {
          dishId: dish._id,
          dishName: dish.name,
          category: dish.category,
          categoryName: getCategoryName(dish.category),
          price: dish.price,
          totalQuantity: sales?.totalQuantity || 0,
          totalSales: sales?.totalQuantity * dish.price || 0,
          isSoft: dish.isSoft,
        };
      })
      .sort((a, b) => a.totalQuantity - b.totalQuantity);

    res.json(slowMovingDishes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取滞销菜品失败' });
  }
});

function getCategoryName(category: string): string {
  const map: Record<string, string> = {
    staple: '主食',
    meat: '荤菜',
    vegetable: '素菜',
    soup: '汤品',
    porridge: '粥点',
    fruit: '水果',
  };
  return map[category] || category;
}

router.get('/preparation-estimate', requireRoles('admin', 'canteen'), async (req: Request, res: Response) => {
  try {
    const { canteenId, date } = req.query;

    let targetCanteenId = canteenId as string;
    if (req.user?.role === 'canteen') {
      targetCanteenId = req.user.canteenId?.toString() || '';
    }

    if (!targetCanteenId) {
      return res.status(400).json({ message: '请选择助餐点' });
    }

    const targetDate = date ? new Date(date as string) : dayjs().add(1, 'day').toDate();
    const targetDay = dayjs(targetDate);

    const dayStart = targetDay.startOf('day').toDate();
    const dayEnd = targetDay.endOf('day').toDate();

    const currentBookings = await Order.aggregate([
      {
        $match: {
          canteenId: new (require('mongoose')).Types.ObjectId(targetCanteenId),
          mealDate: { $gte: dayStart, $lt: dayEnd },
          status: { $ne: 'cancelled' },
        },
      },
      { $unwind: '$orderDishes' },
      {
        $group: {
          _id: '$orderDishes.dishId',
          dishName: { $first: '$orderDishes.dishName' },
          category: { $first: '$orderDishes.category' },
          bookedQuantity: { $sum: '$orderDishes.quantity' },
        },
      },
    ]);

    const weeksAgo = [7, 14, 21, 28];
    const historicalData: any[] = [];

    for (const daysAgo of weeksAgo) {
      const histDate = targetDay.subtract(daysAgo, 'day').toDate();
      const histDayStart = dayjs(histDate).startOf('day').toDate();
      const histDayEnd = dayjs(histDate).endOf('day').toDate();

      const results = await Order.aggregate([
        {
          $match: {
            canteenId: new (require('mongoose')).Types.ObjectId(targetCanteenId),
            mealDate: { $gte: histDayStart, $lt: histDayEnd },
            status: { $nin: ['cancelled'] },
          },
        },
        { $unwind: '$orderDishes' },
        {
          $group: {
            _id: '$orderDishes.dishId',
            dishName: { $first: '$orderDishes.dishName' },
            category: { $first: '$orderDishes.category' },
            quantity: { $sum: '$orderDishes.quantity' },
          },
        },
      ]);

      historicalData.push({
        date: histDate,
        daysAgo,
        data: results,
      });
    }

    const bookingMap = new Map();
    currentBookings.forEach(item => {
      bookingMap.set(item._id.toString(), item);
    });

    const historicalAggregate = new Map<string, { quantities: number[]; dishName: string; category: string }>();

    historicalData.forEach(hist => {
      hist.data.forEach((item: any) => {
        const id = item._id.toString();
        if (!historicalAggregate.has(id)) {
          historicalAggregate.set(id, {
            quantities: [],
            dishName: item.dishName,
            category: item.category,
          });
        }
        historicalAggregate.get(id)!.quantities.push(item.quantity);
      });
    });

    const allDishIds = new Set([
      ...bookingMap.keys(),
      ...historicalAggregate.keys(),
    ]);

    const estimates = Array.from(allDishIds).map(dishId => {
      const booking = bookingMap.get(dishId);
      const hist = historicalAggregate.get(dishId);

      const bookedQuantity = booking?.bookedQuantity || 0;
      const historicalQuantities = hist?.quantities || [];

      let avgHistorical = 0;
      if (historicalQuantities.length > 0) {
        avgHistorical = historicalQuantities.reduce((a, b) => a + b, 0) / historicalQuantities.length;
      }

      const estimatedQuantity = Math.max(bookedQuantity, Math.ceil(avgHistorical * 1.1));
      const suggestionLevel = estimatedQuantity > bookedQuantity * 1.5 ? 'high' : estimatedQuantity > bookedQuantity ? 'medium' : 'low';

      return {
        dishId,
        dishName: booking?.dishName || hist?.dishName || '',
        category: booking?.category || hist?.category || '',
        categoryName: getCategoryName(booking?.category || hist?.category || ''),
        bookedQuantity,
        avgHistoricalQuantity: Math.round(avgHistorical * 10) / 10,
        estimatedQuantity,
        suggestionLevel,
        suggestion: getSuggestion(suggestionLevel),
      };
    });

    estimates.sort((a, b) => b.estimatedQuantity - a.estimatedQuantity);

    res.json({
      date: targetDate,
      canteenId: targetCanteenId,
      estimates,
      totalBooked: estimates.reduce((sum, e) => sum + e.bookedQuantity, 0),
      totalEstimated: estimates.reduce((sum, e) => sum + e.estimatedQuantity, 0),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取备餐预估失败' });
  }
});

function getSuggestion(level: string): string {
  const map: Record<string, string> = {
    high: '历史销量较高，建议多备',
    medium: '销量适中，正常备餐即可',
    low: '预订充足，按预订量备餐',
  };
  return map[level] || '';
}

export default router;

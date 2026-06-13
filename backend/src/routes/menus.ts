import { Router, Request, Response } from 'express';
import dayjs from 'dayjs';
import { WeeklyMenu, DayOfWeek, MealType, IMenuDish, IDayMenu } from '../models/WeeklyMenu';
import { Dish } from '../models/Dish';
import { authMiddleware, requireRoles } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

function getWeekStartDate(date: Date): Date {
  const d = dayjs(date);
  const dayOfWeek = d.day();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return d.add(diff, 'day').startOf('day').toDate();
}

function getWeekEndDate(weekStart: Date): Date {
  return dayjs(weekStart).add(6, 'day').endOf('day').toDate();
}

function getDayKey(date: Date): DayOfWeek {
  const dayNum = dayjs(date).day();
  const dayMap: Record<number, DayOfWeek> = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
    0: 'sunday',
  };
  return dayMap[dayNum];
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { canteenId, weekDate } = req.query;

    if (!canteenId) {
      return res.status(400).json({ message: '请选择助餐点' });
    }

    const date = weekDate ? new Date(weekDate as string) : new Date();
    const weekStart = getWeekStartDate(date);

    const menu = await WeeklyMenu.findOne({
      canteenId,
      weekStartDate: weekStart,
    });

    if (!menu) {
      const weekEnd = getWeekEndDate(weekStart);
      const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      const emptyMenu = {
        canteenId,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        days: days.map(day => ({
          day,
          lunch: { mealType: 'lunch' as MealType, dishes: [], setMeals: [] },
          dinner: { mealType: 'dinner' as MealType, dishes: [], setMeals: [] },
        })),
        status: 'draft',
      };

      return res.json(emptyMenu);
    }

    res.json(menu);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取菜单失败' });
  }
});

router.get('/today', async (req: Request, res: Response) => {
  try {
    const { canteenId, date } = req.query;

    if (!canteenId) {
      return res.status(400).json({ message: '请选择助餐点' });
    }

    const targetDate = date ? new Date(date as string) : new Date();
    const weekStart = getWeekStartDate(targetDate);
    const dayKey = getDayKey(targetDate);

    const menu = await WeeklyMenu.findOne({
      canteenId,
      weekStartDate: weekStart,
      status: 'published',
    });

    if (!menu) {
      return res.json({
        date: targetDate,
        day: dayKey,
        lunch: { dishes: [], setMeals: [] },
        dinner: { dishes: [], setMeals: [] },
      });
    }

    const dayMenu = menu.days.find(d => d.day === dayKey);

    res.json({
      date: targetDate,
      day: dayKey,
      lunch: dayMenu?.lunch || { dishes: [], setMeals: [] },
      dinner: dayMenu?.dinner || { dishes: [], setMeals: [] },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取今日菜单失败' });
  }
});

router.post('/save', requireRoles('admin', 'canteen'), async (req: Request, res: Response) => {
  try {
    const { canteenId, weekDate, days, status = 'draft' } = req.body;

    if (!canteenId || !weekDate || !days) {
      return res.status(400).json({ message: '参数不完整' });
    }

    if (req.user?.role === 'canteen' && req.user.canteenId?.toString() !== canteenId) {
      return res.status(403).json({ message: '无权操作其他助餐点的菜单' });
    }

    const weekStart = getWeekStartDate(new Date(weekDate));
    const weekEnd = getWeekEndDate(weekStart);

    let menu = await WeeklyMenu.findOne({
      canteenId,
      weekStartDate: weekStart,
    });

    if (menu) {
      menu.days = days;
      menu.status = status;
    } else {
      menu = new WeeklyMenu({
        canteenId,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        days,
        status,
        createdBy: req.user?._id,
      });
    }

    await menu.save();

    res.json(menu);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: error.message || '保存菜单失败' });
  }
});

router.post('/copy-from-last-week', requireRoles('admin', 'canteen'), async (req: Request, res: Response) => {
  try {
    const { canteenId, targetWeekDate } = req.body;

    if (!canteenId || !targetWeekDate) {
      return res.status(400).json({ message: '参数不完整' });
    }

    if (req.user?.role === 'canteen' && req.user.canteenId?.toString() !== canteenId) {
      return res.status(403).json({ message: '无权操作其他助餐点的菜单' });
    }

    const targetWeekStart = getWeekStartDate(new Date(targetWeekDate));
    const lastWeekStart = dayjs(targetWeekStart).subtract(7, 'day').toDate();

    const lastWeekMenu = await WeeklyMenu.findOne({
      canteenId,
      weekStartDate: lastWeekStart,
    });

    if (!lastWeekMenu) {
      return res.status(400).json({ message: '上周没有菜单可以复制' });
    }

    const weekEnd = getWeekEndDate(targetWeekStart);

    let targetMenu = await WeeklyMenu.findOne({
      canteenId,
      weekStartDate: targetWeekStart,
    });

    if (targetMenu) {
      targetMenu.days = lastWeekMenu.days;
      targetMenu.status = 'draft';
    } else {
      targetMenu = new WeeklyMenu({
        canteenId,
        weekStartDate: targetWeekStart,
        weekEndDate: weekEnd,
        days: lastWeekMenu.days,
        status: 'draft',
        createdBy: req.user?._id,
      });
    }

    await targetMenu.save();

    res.json(targetMenu);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: error.message || '复制菜单失败' });
  }
});

router.post('/check-conflicts', requireRoles('admin', 'canteen'), async (req: Request, res: Response) => {
  try {
    const { days } = req.body as { days: IDayMenu[] };

    if (!days) {
      return res.status(400).json({ message: '参数不完整' });
    }

    const warnings: any[] = [];

    const dayNames: Record<DayOfWeek, string> = {
      monday: '周一',
      tuesday: '周二',
      wednesday: '周三',
      thursday: '周四',
      friday: '周五',
      saturday: '周六',
      sunday: '周日',
    };

    for (const day of days) {
      const allDayDishes = [
        ...day.lunch.dishes.map((d: IMenuDish) => d.dishId.toString()),
        ...day.dinner.dishes.map((d: IMenuDish) => d.dishId.toString()),
      ];

      const dishCount: Record<string, number> = {};
      allDayDishes.forEach(dishId => {
        dishCount[dishId] = (dishCount[dishId] || 0) + 1;
      });

      const duplicateDishes = Object.entries(dishCount)
        .filter(([, count]) => count > 2)
        .map(([dishId]) => {
          const dish = [...day.lunch.dishes, ...day.dinner.dishes].find(
            (d: IMenuDish) => d.dishId.toString() === dishId
          );
          return dish?.dishName || '';
        });

      if (duplicateDishes.length > 0) {
        warnings.push({
          type: 'duplicate',
          day: day.day,
          dayName: dayNames[day.day],
          message: `${dayNames[day.day]}午晚餐有 ${duplicateDishes.length} 道菜品重复超过2次：${duplicateDishes.join('、')}`,
          dishes: duplicateDishes,
        });
      }

      for (const mealType of ['lunch', 'dinner'] as MealType[]) {
        const meal = day[mealType];
        const hasSoftDish = meal.dishes.some((d: IMenuDish) => d.isSoft);

        if (meal.dishes.length > 0 && !hasSoftDish) {
          warnings.push({
            type: 'no_soft',
            day: day.day,
            dayName: dayNames[day.day],
            mealType,
            mealName: mealType === 'lunch' ? '午餐' : '晚餐',
            message: `${dayNames[day.day]}${mealType === 'lunch' ? '午餐' : '晚餐'}没有软质菜品，建议添加至少一道适合咀嚼弱老人的菜品`,
          });
        }
      }
    }

    res.json({ warnings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '检查菜单冲突失败' });
  }
});

router.post('/publish', requireRoles('admin', 'canteen'), async (req: Request, res: Response) => {
  try {
    const { canteenId, weekDate } = req.body;

    if (!canteenId || !weekDate) {
      return res.status(400).json({ message: '参数不完整' });
    }

    if (req.user?.role === 'canteen' && req.user.canteenId?.toString() !== canteenId) {
      return res.status(403).json({ message: '无权操作其他助餐点的菜单' });
    }

    const weekStart = getWeekStartDate(new Date(weekDate));

    const menu = await WeeklyMenu.findOne({
      canteenId,
      weekStartDate: weekStart,
    });

    if (!menu) {
      return res.status(404).json({ message: '菜单不存在' });
    }

    menu.status = 'published';
    await menu.save();

    res.json(menu);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '发布菜单失败' });
  }
});

export default router;

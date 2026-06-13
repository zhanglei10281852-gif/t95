import { Router, Request, Response } from 'express';
import { Dish, DishCategory, DishStatus } from '../models/Dish';
import { authMiddleware, requireRoles } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      category = '',
      status = '',
      keyword = '',
    } = req.query;

    const query: any = {};

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (keyword) {
      query.name = { $regex: keyword, $options: 'i' };
    }

    const pageNum = parseInt(page as string, 10);
    const size = parseInt(pageSize as string, 10);
    const skip = (pageNum - 1) * size;

    const [total, list] = await Promise.all([
      Dish.countDocuments(query),
      Dish.find(query)
        .skip(skip)
        .limit(size)
        .sort({ sortOrder: 1, createdAt: -1 }),
    ]);

    res.json({
      total,
      list,
      page: pageNum,
      pageSize: size,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取菜品列表失败' });
  }
});

router.get('/all', async (req: Request, res: Response) => {
  try {
    const { category = '', status = 'on_shelf' } = req.query;

    const query: any = {};

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    const list = await Dish.find(query).sort({ sortOrder: 1, name: 1 });

    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取菜品列表失败' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const dish = await Dish.findById(req.params.id);

    if (!dish) {
      return res.status(404).json({ message: '菜品不存在' });
    }

    res.json(dish);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取菜品详情失败' });
  }
});

router.post('/', requireRoles('admin'), async (req: Request, res: Response) => {
  try {
    const {
      name,
      category,
      price,
      costPrice,
      tasteTags = [],
      isSoft = false,
      imageUrl,
      description,
      status = 'on_shelf',
      sortOrder = 0,
    } = req.body;

    if (!name || !category || price === undefined || costPrice === undefined) {
      return res.status(400).json({ message: '请填写完整的菜品信息' });
    }

    const existingDish = await Dish.findOne({ name });
    if (existingDish) {
      return res.status(400).json({ message: '菜品名称已存在' });
    }

    const dish = new Dish({
      name,
      category,
      price,
      costPrice,
      tasteTags,
      isSoft,
      imageUrl,
      description,
      status,
      sortOrder,
    });

    await dish.save();

    res.status(201).json(dish);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: error.message || '创建菜品失败' });
  }
});

router.put('/:id', requireRoles('admin'), async (req: Request, res: Response) => {
  try {
    const {
      name,
      category,
      price,
      costPrice,
      tasteTags,
      isSoft,
      imageUrl,
      description,
      status,
      sortOrder,
    } = req.body;

    const dish = await Dish.findById(req.params.id);

    if (!dish) {
      return res.status(404).json({ message: '菜品不存在' });
    }

    if (name && name !== dish.name) {
      const existingDish = await Dish.findOne({ name, _id: { $ne: req.params.id } });
      if (existingDish) {
        return res.status(400).json({ message: '菜品名称已存在' });
      }
    }

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (price !== undefined) updateData.price = price;
    if (costPrice !== undefined) updateData.costPrice = costPrice;
    if (tasteTags !== undefined) updateData.tasteTags = tasteTags;
    if (isSoft !== undefined) updateData.isSoft = isSoft;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const updatedDish = await Dish.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(updatedDish);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: error.message || '更新菜品失败' });
  }
});

router.delete('/:id', requireRoles('admin'), async (req: Request, res: Response) => {
  try {
    const dish = await Dish.findById(req.params.id);

    if (!dish) {
      return res.status(404).json({ message: '菜品不存在' });
    }

    await Dish.findByIdAndDelete(req.params.id);

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '删除菜品失败' });
  }
});

router.patch('/:id/status', requireRoles('admin'), async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    const dish = await Dish.findById(req.params.id);

    if (!dish) {
      return res.status(404).json({ message: '菜品不存在' });
    }

    dish.status = status as DishStatus;
    await dish.save();

    res.json(dish);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '更新菜品状态失败' });
  }
});

export default router;

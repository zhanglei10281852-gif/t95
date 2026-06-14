import { connectDB, disconnectDB } from "../db";
import { User } from "../models/User";
import { Canteen } from "../models/Canteen";
import { Elderly, SubsidyCategory } from "../models/Elderly";
import { Order } from "../models/Order";
import { Dish } from "../models/Dish";
import { SubsidyRecord } from "../models/SubsidyRecord";
import { MonthlySubsidyQuota } from "../models/MonthlySubsidyQuota";
import {
  calculateSubsidy,
  MEAL_PRICES,
  generateOrderNo,
  getMonthKey,
} from "../utils/subsidy";
import { config } from "../config";
import dayjs from "dayjs";

const canteenData = [
  {
    name: "幸福社区食堂",
    address: "幸福路128号幸福社区服务中心1楼",
    phone: "021-58881001",
    dailyCapacity: 50,
    businessHours: {
      lunch: "11:30-12:30",
      dinner: "17:30-18:30",
    },
  },
  {
    name: "阳光日间照料中心",
    address: "阳光大街56号阳光社区综合为老服务中心",
    phone: "021-58881002",
    dailyCapacity: 80,
    businessHours: {
      lunch: "11:00-12:30",
      dinner: "17:00-18:30",
    },
  },
  {
    name: "百合长者餐厅",
    address: "百合路88弄百合老年公寓内",
    phone: "021-58881003",
    dailyCapacity: 60,
    businessHours: {
      lunch: "11:15-12:15",
      dinner: "17:15-18:15",
    },
  },
];

const communities = [
  "幸福社区",
  "阳光社区",
  "百合社区",
  "和平社区",
  "新华社区",
];

const dishData = [
  {
    name: "白米饭",
    category: "staple",
    price: 2,
    costPrice: 0.8,
    tasteTags: ["light"],
    isSoft: true,
    sortOrder: 1,
  },
  {
    name: "小米粥",
    category: "porridge",
    price: 3,
    costPrice: 1,
    tasteTags: ["light"],
    isSoft: true,
    sortOrder: 2,
  },
  {
    name: "南瓜粥",
    category: "porridge",
    price: 4,
    costPrice: 1.5,
    tasteTags: ["light"],
    isSoft: true,
    sortOrder: 3,
  },
  {
    name: "阳春面",
    category: "staple",
    price: 8,
    costPrice: 3,
    tasteTags: ["light"],
    isSoft: true,
    sortOrder: 4,
  },
  {
    name: "鸡蛋羹",
    category: "meat",
    price: 6,
    costPrice: 2.5,
    tasteTags: ["light", "moderate"],
    isSoft: true,
    sortOrder: 5,
  },
  {
    name: "清蒸鲈鱼",
    category: "meat",
    price: 18,
    costPrice: 10,
    tasteTags: ["light"],
    isSoft: true,
    sortOrder: 6,
  },
  {
    name: "红烧排骨",
    category: "meat",
    price: 15,
    costPrice: 8,
    tasteTags: ["moderate"],
    isSoft: false,
    sortOrder: 7,
  },
  {
    name: "宫保鸡丁",
    category: "meat",
    price: 12,
    costPrice: 6,
    tasteTags: ["moderate"],
    isSoft: false,
    sortOrder: 8,
  },
  {
    name: "鱼香肉丝",
    category: "meat",
    price: 12,
    costPrice: 6,
    tasteTags: ["moderate"],
    isSoft: false,
    sortOrder: 9,
  },
  {
    name: "红烧肉",
    category: "meat",
    price: 16,
    costPrice: 9,
    tasteTags: ["moderate", "heavy"],
    isSoft: true,
    sortOrder: 10,
  },
  {
    name: "番茄炒蛋",
    category: "vegetable",
    price: 8,
    costPrice: 3,
    tasteTags: ["light", "moderate"],
    isSoft: true,
    sortOrder: 11,
  },
  {
    name: "清炒时蔬",
    category: "vegetable",
    price: 6,
    costPrice: 2.5,
    tasteTags: ["light"],
    isSoft: true,
    sortOrder: 12,
  },
  {
    name: "炒西兰花",
    category: "vegetable",
    price: 8,
    costPrice: 3.5,
    tasteTags: ["light"],
    isSoft: false,
    sortOrder: 13,
  },
  {
    name: "醋溜白菜",
    category: "vegetable",
    price: 5,
    costPrice: 2,
    tasteTags: ["moderate"],
    isSoft: true,
    sortOrder: 14,
  },
  {
    name: "土豆丝",
    category: "vegetable",
    price: 6,
    costPrice: 2,
    tasteTags: ["light", "moderate"],
    isSoft: false,
    sortOrder: 15,
  },
  {
    name: "麻婆豆腐",
    category: "vegetable",
    price: 8,
    costPrice: 3,
    tasteTags: ["heavy"],
    isSoft: true,
    sortOrder: 16,
  },
  {
    name: "香菇青菜",
    category: "vegetable",
    price: 9,
    costPrice: 4,
    tasteTags: ["light"],
    isSoft: true,
    sortOrder: 17,
  },
  {
    name: "紫菜蛋花汤",
    category: "soup",
    price: 4,
    costPrice: 1.5,
    tasteTags: ["light"],
    isSoft: true,
    sortOrder: 18,
  },
  {
    name: "番茄蛋汤",
    category: "soup",
    price: 4,
    costPrice: 1.5,
    tasteTags: ["light"],
    isSoft: true,
    sortOrder: 19,
  },
  {
    name: "冬瓜排骨汤",
    category: "soup",
    price: 8,
    costPrice: 4,
    tasteTags: ["light"],
    isSoft: true,
    sortOrder: 20,
  },
  {
    name: "萝卜牛肉汤",
    category: "soup",
    price: 10,
    costPrice: 5,
    tasteTags: ["moderate"],
    isSoft: true,
    sortOrder: 21,
  },
  {
    name: "酸辣汤",
    category: "soup",
    price: 5,
    costPrice: 2,
    tasteTags: ["heavy"],
    isSoft: true,
    sortOrder: 22,
  },
  {
    name: "豆浆",
    category: "porridge",
    price: 3,
    costPrice: 1,
    tasteTags: ["light"],
    isSoft: true,
    sortOrder: 23,
  },
  {
    name: "包子（猪肉馅）",
    category: "staple",
    price: 5,
    costPrice: 2,
    tasteTags: ["moderate"],
    isSoft: true,
    sortOrder: 24,
  },
  {
    name: "馒头",
    category: "staple",
    price: 1.5,
    costPrice: 0.5,
    tasteTags: ["light"],
    isSoft: true,
    sortOrder: 25,
  },
  {
    name: "花卷",
    category: "staple",
    price: 2,
    costPrice: 0.6,
    tasteTags: ["light"],
    isSoft: true,
    sortOrder: 26,
  },
  {
    name: "苹果",
    category: "fruit",
    price: 3,
    costPrice: 1.5,
    tasteTags: ["light"],
    isSoft: false,
    sortOrder: 27,
  },
  {
    name: "香蕉",
    category: "fruit",
    price: 3,
    costPrice: 1.2,
    tasteTags: ["light"],
    isSoft: true,
    sortOrder: 28,
  },
  {
    name: "西瓜",
    category: "fruit",
    price: 4,
    costPrice: 1.5,
    tasteTags: ["light"],
    isSoft: true,
    sortOrder: 29,
  },
  {
    name: "橙子",
    category: "fruit",
    price: 4,
    costPrice: 2,
    tasteTags: ["light"],
    isSoft: false,
    sortOrder: 30,
  },
  {
    name: "雪梨",
    category: "fruit",
    price: 3.5,
    costPrice: 1.5,
    tasteTags: ["light"],
    isSoft: true,
    sortOrder: 31,
  },
  {
    name: "炒合菜",
    category: "vegetable",
    price: 7,
    costPrice: 3,
    tasteTags: ["light"],
    isSoft: false,
    sortOrder: 32,
  },
  {
    name: "溜肉段",
    category: "meat",
    price: 14,
    costPrice: 7,
    tasteTags: ["moderate"],
    isSoft: false,
    sortOrder: 33,
  },
  {
    name: "酱牛肉",
    category: "meat",
    price: 20,
    costPrice: 12,
    tasteTags: ["moderate", "heavy"],
    isSoft: false,
    sortOrder: 34,
  },
  {
    name: "银耳羹",
    category: "porridge",
    price: 5,
    costPrice: 2,
    tasteTags: ["light"],
    isSoft: true,
    sortOrder: 35,
  },
];

const elderlyNames = [
  { name: "张桂芳", gender: "female" as const },
  { name: "李建国", gender: "male" as const },
  { name: "王秀英", gender: "female" as const },
  { name: "刘德明", gender: "male" as const },
  { name: "陈美华", gender: "female" as const },
  { name: "杨振华", gender: "male" as const },
  { name: "赵玉珍", gender: "female" as const },
  { name: "黄志强", gender: "male" as const },
  { name: "周金凤", gender: "female" as const },
  { name: "吴明辉", gender: "male" as const },
  { name: "徐桂兰", gender: "female" as const },
  { name: "孙伟国", gender: "male" as const },
  { name: "马丽华", gender: "female" as const },
  { name: "朱长根", gender: "male" as const },
  { name: "胡素珍", gender: "female" as const },
  { name: "郭建强", gender: "male" as const },
  { name: "何秀琴", gender: "female" as const },
  { name: "罗光明", gender: "male" as const },
  { name: "梁玉梅", gender: "female" as const },
  { name: "宋永福", gender: "male" as const },
];

const subsidyCategories: SubsidyCategory[] = [
  "low_income_full",
  "low_income",
  "normal",
  "normal",
  "normal",
];

function randomIdCard(age: number, gender: string): string {
  const year = new Date().getFullYear() - age;
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
  const area = "310101";
  const seq = String(Math.floor(Math.random() * 900) + 100);
  const genderDigit =
    gender === "male"
      ? Math.floor(Math.random() * 5) * 2 + 1
      : Math.floor(Math.random() * 5) * 2;
  const check = String(Math.floor(Math.random() * 10));
  return `${area}${year}${month}${day}${seq}${genderDigit}${check}`;
}

function randomPhone(): string {
  const prefixes = ["138", "139", "158", "159", "189", "180", "136"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = String(Math.floor(Math.random() * 90000000) + 10000000);
  return prefix + suffix;
}

async function seed() {
  console.log("开始初始化数据...");
  await connectDB();

  console.log("清理旧数据...");
  await User.deleteMany({});
  await Canteen.deleteMany({});
  await Elderly.deleteMany({});
  await Order.deleteMany({});
  await Dish.deleteMany({});
  await SubsidyRecord.deleteMany({});
  await MonthlySubsidyQuota.deleteMany({});

  console.log("创建助餐点...");
  const canteens = await Canteen.insertMany(canteenData);
  console.log(`  已创建 ${canteens.length} 个助餐点`);

  console.log("创建菜品...");
  const dishes = await Dish.insertMany(dishData);
  console.log(`  已创建 ${dishes.length} 道菜品`);

  console.log("创建用户账号...");
  const adminUser = new User({
    username: "admin",
    password: "Pass@2024",
    role: "admin",
    name: "系统管理员",
  });
  await adminUser.save();

  const canteenUsers = [
    {
      username: "canteen1",
      password: "cc123",
      name: "幸福社区食堂管理员",
      canteenIndex: 0,
    },
    {
      username: "canteen2",
      password: "cc123",
      name: "阳光日间照料中心管理员",
      canteenIndex: 1,
    },
    {
      username: "canteen3",
      password: "cc123",
      name: "百合长者餐厅管理员",
      canteenIndex: 2,
    },
  ];

  for (const cu of canteenUsers) {
    const user = new User({
      username: cu.username,
      password: cu.password,
      role: "canteen",
      name: cu.name,
      canteenId: canteens[cu.canteenIndex]._id,
    });
    await user.save();
  }

  const workerUsers = [
    { username: "worker1", password: "wk123", name: "社区工作者小王" },
    { username: "worker2", password: "wk123", name: "社区工作者小李" },
  ];

  for (const wu of workerUsers) {
    const user = new User({
      username: wu.username,
      password: wu.password,
      role: "worker",
      name: wu.name,
    });
    await user.save();
  }
  console.log("  已创建 6 个用户账号（1管理员 + 3助餐点 + 2社区工作者）");

  console.log("创建老人信息...");
  const elderlyList = [];

  for (let i = 0; i < 20; i++) {
    const age = 65 + Math.floor(Math.random() * 26);
    const person = elderlyNames[i];
    const canteenIndex = i % 3;
    const communityIndex = i % communities.length;
    const subsidyIndex = i % subsidyCategories.length;

    const elderly = new Elderly({
      name: person.name,
      idCard: randomIdCard(age, person.gender),
      age,
      gender: person.gender,
      community: communities[communityIndex],
      phone: randomPhone(),
      address: `${communities[communityIndex]}小区${Math.floor(Math.random() * 20) + 1}号楼${Math.floor(Math.random() * 6) + 1}0${Math.floor(Math.random() * 9) + 1}室`,
      subsidyCategory: subsidyCategories[subsidyIndex],
      canteenId: canteens[canteenIndex]._id,
      hasSeniorSubsidy: age >= 80,
      status: "active",
    });
    await elderly.save();
    elderlyList.push(elderly);
  }
  console.log(`  已创建 ${elderlyList.length} 位老人`);

  console.log("创建模拟订单...");
  const today = dayjs();
  const worker = await User.findOne({ username: "worker1" });

  let orderCount = 0;
  let subsidyTotal = 0;

  const stapleDishes = dishes.filter(d => d.category === 'staple');
  const meatDishes = dishes.filter(d => d.category === 'meat');
  const vegetableDishes = dishes.filter(d => d.category === 'vegetable');
  const soupDishes = dishes.filter(d => d.category === 'soup');

  function pickRandom<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const mealDate = today.subtract(dayOffset, "day");

    for (let i = 0; i < elderlyList.length; i++) {
      const elderly = elderlyList[i];

      if (Math.random() > 0.6) continue;

      const mealTypes = ["lunch", "dinner"] as const;
      const mealType = mealTypes[Math.floor(Math.random() * mealTypes.length)];
      const standards = ["A", "B", "C"] as const;
      const standard = standards[Math.floor(Math.random() * standards.length)];

      const mealPrice = MEAL_PRICES[standard];
      const subsidy = calculateSubsidy(elderly, mealPrice);

      const statuses = [
        "completed",
        "completed",
        "completed",
        "ready",
        "preparing",
        "confirmed",
        "ordered",
      ];
      const status =
        dayOffset === 0 ? statuses[Math.floor(Math.random() * 4)] : "completed";

      const selectedDishes: any[] = [];

      const stapleCount = standard === 'A' ? 1 : standard === 'B' ? 1 : 2;
      const meatCount = standard === 'A' ? 1 : standard === 'B' ? 2 : 2;
      const vegetableCount = standard === 'A' ? 1 : standard === 'B' ? 1 : 2;
      const soupCount = 1;

      selectedDishes.push(...pickRandom(stapleDishes, stapleCount));
      selectedDishes.push(...pickRandom(meatDishes, meatCount));
      selectedDishes.push(...pickRandom(vegetableDishes, vegetableCount));
      selectedDishes.push(...pickRandom(soupDishes, soupCount));

      const orderDishes = selectedDishes.map(dish => ({
        dishId: dish._id,
        dishName: dish.name,
        category: dish.category,
        price: dish.price,
        quantity: 1,
        isSoft: dish.isSoft,
      }));

      const totalDishPrice = orderDishes.reduce((sum, d) => sum + d.price * d.quantity, 0);

      const order = new Order({
        orderNo: generateOrderNo(),
        elderlyId: elderly._id,
        canteenId: elderly.canteenId,
        mealDate: mealDate.toDate(),
        mealType,
        mealStandard: standard,
        mealPrice: totalDishPrice,
        orderDishes,
        remark: Math.random() > 0.8 ? "少盐少油" : "",
        status,
        deliveryType: Math.random() > 0.7 ? "delivery" : "pickup",
        subsidyAmount: subsidy.totalSubsidy,
        selfPayAmount: subsidy.selfPayAmount,
        createdBy: worker?._id,
        confirmedAt: status !== "ordered" ? mealDate.toDate() : undefined,
        completedAt: status === "completed" ? mealDate.toDate() : undefined,
      });

      if (order.deliveryType === "delivery") {
        order.deliveryInfo = {
          volunteerName: ["张志愿者", "李志愿者", "王志愿者"][
            Math.floor(Math.random() * 3)
          ],
          estimatedTime: mealType === "lunch" ? "12:00" : "18:00",
        };
      }

      await order.save();
      orderCount++;

      if (status === "completed") {
        const monthKey = getMonthKey(mealDate.toDate());
        const subsidyRecord = new SubsidyRecord({
          orderId: order._id,
          elderlyId: elderly._id,
          canteenId: elderly.canteenId,
          mealDate: mealDate.toDate(),
          subsidyCategory: elderly.subsidyCategory,
          baseSubsidy: subsidy.baseSubsidy,
          seniorSubsidy: subsidy.seniorSubsidy,
          totalSubsidy: subsidy.totalSubsidy,
          mealPrice,
          selfPayAmount: subsidy.selfPayAmount,
          month: monthKey,
          settled: true,
        });
        await subsidyRecord.save();
        subsidyTotal += subsidy.totalSubsidy;
      }
    }
  }

  const currentMonth = getMonthKey(today.toDate());
  const monthRecords = await SubsidyRecord.find({ month: currentMonth });
  const monthUsed = monthRecords.reduce((sum, r) => sum + r.totalSubsidy, 0);

  const quota = new MonthlySubsidyQuota({
    month: currentMonth,
    totalQuota: config.monthlySubsidyQuota,
    usedAmount: monthUsed,
    remainingAmount: config.monthlySubsidyQuota - monthUsed,
    status: config.monthlySubsidyQuota - monthUsed > 0 ? "active" : "exhausted",
  });
  await quota.save();

  console.log(`  已创建 ${orderCount} 个订单`);
  console.log(`  已生成 ${monthRecords.length} 条补贴记录`);
  console.log(`  本月已使用补贴: ${monthUsed.toFixed(2)} 元`);

  console.log("\n数据初始化完成！");
  console.log("\n账号信息：");
  console.log("  管理员: admin / Pass@2024");
  console.log("  助餐点1: canteen1 / cc123 (幸福社区食堂)");
  console.log("  助餐点2: canteen2 / cc123 (阳光日间照料中心)");
  console.log("  助餐点3: canteen3 / cc123 (百合长者餐厅)");
  console.log("  社区工作者1: worker1 / wk123");
  console.log("  社区工作者2: worker2 / wk123");

  await disconnectDB();
}

seed().catch((err) => {
  console.error("初始化数据失败:", err);
  process.exit(1);
});

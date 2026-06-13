import mongoose from 'mongoose';

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type MealType = 'lunch' | 'dinner';

export interface IMenuDish {
  dishId: mongoose.Types.ObjectId;
  dishName: string;
  category: string;
  price: number;
  isSoft: boolean;
}

export interface ISetMeal {
  name: string;
  standard: 'A' | 'B' | 'C';
  price: number;
  dishIds: mongoose.Types.ObjectId[];
  dishes: IMenuDish[];
}

export interface IMealSlot {
  mealType: MealType;
  dishes: IMenuDish[];
  setMeals: ISetMeal[];
}

export interface IDayMenu {
  day: DayOfWeek;
  lunch: IMealSlot;
  dinner: IMealSlot;
}

export interface IWeeklyMenu extends mongoose.Document {
  canteenId: mongoose.Types.ObjectId;
  weekStartDate: Date;
  weekEndDate: Date;
  days: IDayMenu[];
  status: 'draft' | 'published';
  createdBy: mongoose.Types.ObjectId;
}

const menuDishSchema = new mongoose.Schema<IMenuDish>({
  dishId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dish', required: true },
  dishName: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  isSoft: { type: Boolean, default: false },
}, { _id: false });

const setMealSchema = new mongoose.Schema<ISetMeal>({
  name: { type: String, required: true },
  standard: { type: String, enum: ['A', 'B', 'C'], required: true },
  price: { type: Number, required: true, min: 0 },
  dishIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Dish' }],
  dishes: [menuDishSchema],
}, { _id: false });

const mealSlotSchema = new mongoose.Schema<IMealSlot>({
  mealType: { type: String, enum: ['lunch', 'dinner'], required: true },
  dishes: [menuDishSchema],
  setMeals: [setMealSchema],
}, { _id: false });

const dayMenuSchema = new mongoose.Schema<IDayMenu>({
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true,
  },
  lunch: mealSlotSchema,
  dinner: mealSlotSchema,
}, { _id: false });

const weeklyMenuSchema = new mongoose.Schema<IWeeklyMenu>({
  canteenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Canteen', required: true },
  weekStartDate: { type: Date, required: true },
  weekEndDate: { type: Date, required: true },
  days: [dayMenuSchema],
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

weeklyMenuSchema.index({ canteenId: 1, weekStartDate: 1 }, { unique: true });

export const WeeklyMenu = mongoose.model<IWeeklyMenu>('WeeklyMenu', weeklyMenuSchema);

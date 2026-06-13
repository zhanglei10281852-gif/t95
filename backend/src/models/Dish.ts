import mongoose from 'mongoose';

export type DishCategory = 'staple' | 'meat' | 'vegetable' | 'soup' | 'porridge' | 'fruit';
export type TasteTag = 'light' | 'moderate' | 'heavy';
export type DishStatus = 'on_shelf' | 'off_shelf';

export interface IDish extends mongoose.Document {
  name: string;
  category: DishCategory;
  price: number;
  costPrice: number;
  tasteTags: TasteTag[];
  isSoft: boolean;
  imageUrl?: string;
  description?: string;
  status: DishStatus;
  sortOrder: number;
}

const dishSchema = new mongoose.Schema<IDish>({
  name: { type: String, required: true, unique: true },
  category: {
    type: String,
    enum: ['staple', 'meat', 'vegetable', 'soup', 'porridge', 'fruit'],
    required: true,
  },
  price: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  tasteTags: {
    type: [{ type: String, enum: ['light', 'moderate', 'heavy'] }],
    default: [],
  },
  isSoft: { type: Boolean, default: false },
  imageUrl: { type: String },
  description: { type: String },
  status: {
    type: String,
    enum: ['on_shelf', 'off_shelf'],
    default: 'on_shelf',
  },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

dishSchema.index({ category: 1, status: 1 });
dishSchema.index({ sortOrder: 1 });

export const Dish = mongoose.model<IDish>('Dish', dishSchema);

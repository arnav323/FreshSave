import {
  Apple,
  Beef,
  Croissant,
  CupSoda,
  Milk,
  Package,
  UtensilsCrossed,
} from 'lucide-react';
import type { FoodCategory } from '../types/food';

interface FoodCategoryIconProps {
  category: FoodCategory;
  className?: string;
}

export function FoodCategoryIcon({ category, className = 'w-4 h-4' }: FoodCategoryIconProps) {
  switch (category) {
    case 'Produce':
      return <Apple className={className} aria-hidden="true" />;
    case 'Dairy & Eggs':
      return <Milk className={className} aria-hidden="true" />;
    case 'Meat & Seafood':
      return <Beef className={className} aria-hidden="true" />;
    case 'Bakery':
      return <Croissant className={className} aria-hidden="true" />;
    case 'Beverages':
      return <CupSoda className={className} aria-hidden="true" />;
    case 'Leftovers':
      return <UtensilsCrossed className={className} aria-hidden="true" />;
    case 'Pantry':
    default:
      return <Package className={className} aria-hidden="true" />;
  }
}

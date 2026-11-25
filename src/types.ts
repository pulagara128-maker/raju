import type { LiveHoursStatus, OpeningHourRow } from './lib/hours.ts';

export interface RestaurantSettings {
  id: number;
  name: string;
  teluguName: string;
  restaurantType: string;
  address: string;
  plusCode: string;
  phone: string | null;
  whatsappNumber: string | null;
  googleMapsUrl: string | null;
  googleReviewUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  deliveryEnabled: boolean;
  deliveryCharge: number | null;
  heroHeadline: string;
  heroSubtext: string;
  aboutText: string;
  loyaltyTargetMeals: number;
  birthdayDiscountPercent: number;
  birthdayMaxDiscount: number;
  loyaltyRulesText: string;
}

export interface MenuCategory {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  price: number | null;
  isPriceConfirmed: boolean;
  isVeg: boolean;
  isSpicy: boolean;
  isAvailable: boolean;
  isBestseller: boolean;
  imageUrl: string | null;
  sortOrder: number;
}

export interface TodaysSpecial {
  id: number;
  dishName: string;
  description: string;
  specialPrice: number | null;
  originalPrice: number | null;
  imageUrl: string | null;
  validDate: string;
  isAvailable: boolean;
  isEnabled: boolean;
}

export interface GalleryItem {
  id: number;
  title: string;
  category: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
}

export interface PublicBootstrapData {
  settings: RestaurantSettings;
  openingHours: OpeningHourRow[];
  liveHoursStatus: LiveHoursStatus;
  categories: MenuCategory[];
  menuItems: MenuItem[];
  todaysSpecial: TodaysSpecial | null;
  galleryItems: GalleryItem[];
  googleRating: {
    score: number;
    totalReviews: number;
  };
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface OrderItemRecord {
  id?: number;
  menuItemId: number | null;
  dishName: string;
  unitPrice: number | null;
  quantity: number;
  lineTotal: number;
}

export interface OrderRecord {
  id: number;
  orderNumber: string;
  customerId: number | null;
  customerName: string;
  customerPhone: string;
  orderType: 'pickup' | 'delivery';
  pickupDate: string;
  pickupTime: string;
  specialInstructions: string | null;
  subtotal: number;
  deliveryCharge: number;
  total: number;
  hasUnpricedItems: boolean;
  status: 'new' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
  items: OrderItemRecord[];
  hasLoyaltyStamp?: boolean;
}

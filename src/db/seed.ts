import { count, eq, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import {
  galleryItems,
  menuCategories,
  menuItems,
  openingHours,
  restaurantSettings,
  todaysSpecial,
} from './schema.ts';
import { getIstNowParts } from '../lib/hours.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

const OFFICIAL_CATEGORIES = [
  { name: 'Soup', slug: 'soup', sortOrder: 1 },
  { name: 'Salads', slug: 'salads', sortOrder: 2 },
  { name: 'Veg Starters', slug: 'veg-starters', sortOrder: 3 },
  { name: 'Non Veg Starters', slug: 'non-veg-starters', sortOrder: 4 },
  { name: 'Veg Curries', slug: 'veg-curries', sortOrder: 5 },
  { name: 'Non Veg Curries', slug: 'non-veg-curries', sortOrder: 6 },
  { name: 'Indian Breads', slug: 'indian-breads', sortOrder: 7 },
  { name: 'Rice / Noodles', slug: 'rice-noodles', sortOrder: 8 },
  { name: 'Choice of Biryani (Veg)', slug: 'biryani-veg', sortOrder: 9 },
  { name: 'Choice of Biryani (Non-Veg)', slug: 'biryani-non-veg', sortOrder: 10 },
  { name: 'Desserts', slug: 'desserts', sortOrder: 11 },
  { name: 'Choice of Ice Creams', slug: 'ice-creams', sortOrder: 12 },
  { name: 'Beverages', slug: 'beverages', sortOrder: 13 },
];

const IMG = {
  soup: '/src/assets/images/dish_mutton_soup_1795633829690.jpg',
  veg: '/src/assets/images/dish_south_indian_meals_1795635851672.jpg',
  vegStarter: '/src/assets/images/dish_butter_garlic_mushroom_1795633828133.jpg',
  nonVegStarter: '/src/assets/images/dish_royyala_vepudu_1795633828150.jpg',
  chinese: '/src/assets/images/dish_chinese_chilli_chicken_1795635852152.jpg',
  feast: '/src/assets/images/hero_andhra_feast_1795633827360.jpg',
  biryani: '/src/assets/images/dish_mutton_dum_biryani_1795633827431.jpg',
  curdRice: '/src/assets/images/dish_fruit_curd_rice_1795633827995.jpg',
  dessert: '/src/assets/images/dish_indian_desserts_1795635852233.jpg',
  beverage: '/src/assets/images/dish_signature_beverages_1795635852116.jpg',
};

interface OfficialDishSeed {
  categorySlug: string;
  name: string;
  description: string;
  price: number | null;
  isVeg: boolean;
  isSpicy: boolean;
  isBestseller: boolean;
  imageUrl: string;
}

const OFFICIAL_MENU_ITEMS: OfficialDishSeed[] = [
  // 1. SOUP
  {
    categorySlug: 'soup',
    name: 'Veg manchow soup',
    description: 'Classic Indo-Chinese vegetable broth simmered with garlic, soy, and crispy fried noodles.',
    price: 199,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.soup,
  },
  {
    categorySlug: 'soup',
    name: 'Veg hot & sour soup',
    description: 'Tangy, peppery vegetable soup finished with garden greens, bamboo shoots, and aromatic chilli vinegar.',
    price: 199,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.soup,
  },
  {
    categorySlug: 'soup',
    name: 'Veg sweet corn soup',
    description: 'Velvety golden sweet corn soup cooked with finely diced vegetables and white pepper.',
    price: 199,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.soup,
  },
  {
    categorySlug: 'soup',
    name: 'Chicken manchow soup',
    description: 'Hearty spiced chicken soup topped with ginger, garlic, coriander, and crunchy fried noodles.',
    price: 249,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.soup,
  },
  {
    categorySlug: 'soup',
    name: 'Chicken hot & sour soup',
    description: 'Bold and tangy chicken soup balanced with cracked pepper, shredded chicken, and soy.',
    price: 249,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.soup,
  },
  {
    categorySlug: 'soup',
    name: 'Chicken sweet corn soup',
    description: 'Creamy comfort-style sweet corn soup enriched with tender shredded chicken.',
    price: 249,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.soup,
  },
  {
    categorySlug: 'soup',
    name: 'Zaffrani yakhani shorba',
    description: 'Traditional slow-simmered saffron-infused aromatic shorba finished with whole Indian spices.',
    price: 299,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.soup,
  },

  // 2. SALADS
  {
    categorySlug: 'salads',
    name: 'Fresh green salad',
    description: 'Crisp cucumber, tomatoes, carrots, onions, and lemon wedges served fresh.',
    price: 169,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.veg,
  },
  {
    categorySlug: 'salads',
    name: 'Russian salad',
    description: 'Chilled diced vegetables and seasonal fruits folded in a creamy mildly spiced dressing.',
    price: 199,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.veg,
  },

  // 3. VEG STARTERS
  {
    categorySlug: 'veg-starters',
    name: 'Papad (fried / roasted)',
    description: 'Crisp lentil papad served golden fried or flame-roasted.',
    price: 129,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.vegStarter,
  },
  {
    categorySlug: 'veg-starters',
    name: 'French fries',
    description: 'Golden crisp potato fries lightly seasoned and served hot.',
    price: 249,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.vegStarter,
  },
  {
    categorySlug: 'veg-starters',
    name: 'Corn kernels',
    description: 'Crispy golden-fried sweet corn kernels tossed with aromatic herbs and spices.',
    price: 359,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.vegStarter,
  },
  {
    categorySlug: 'veg-starters',
    name: 'Manchurian (veg / gobi)',
    description: 'Choice of crisp vegetable or cauliflower florets tossed in savoury garlic-soy Manchurian glaze.',
    price: 359,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.chinese,
  },
  {
    categorySlug: 'veg-starters',
    name: 'Veg shanghai roll',
    description: 'Crisp golden-fried spiced vegetable rolls served with tangy house dipping sauce.',
    price: 359,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.vegStarter,
  },
  {
    categorySlug: 'veg-starters',
    name: 'Veg nuggets',
    description: 'Crunchy golden vegetable nuggets fried to crisp perfection.',
    price: 359,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.vegStarter,
  },
  {
    categorySlug: 'veg-starters',
    name: 'Paneer (karivepaku / majestic / chilli / 65)',
    description: 'Tender cottage cheese tossed in your choice of karivepaku, majestic, chilli, or 65 style masala.',
    price: 399,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.vegStarter,
  },
  {
    categorySlug: 'veg-starters',
    name: 'Paneer tikka (zafrani / hariyali / malai)',
    description: 'Char-grilled cottage cheese marinated in choice of saffron zafrani, herb hariyali, or creamy malai.',
    price: 399,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.vegStarter,
  },
  {
    categorySlug: 'veg-starters',
    name: 'Mushroom (butter garlic / chilli / salt & pepper)',
    description: 'Fresh mushrooms prepared in your choice of butter garlic, spicy chilli, or crisp salt & pepper.',
    price: 399,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.vegStarter,
  },
  {
    categorySlug: 'veg-starters',
    name: 'Baby corn (chilli / manchurian / crispy fried)',
    description: 'Crunchy baby corn tossed in fiery chilli, Manchurian sauce, or crispy fried seasoning.',
    price: 399,
    isVeg: true,
    isSpicy: true,
    isBestseller: false,
    imageUrl: IMG.vegStarter,
  },

  // 4. NON VEG STARTERS
  {
    categorySlug: 'non-veg-starters',
    name: 'Signature spl nalla karam kodi vepudu',
    description: 'Our signature Guntur roast chicken tossed in house-ground roasted nalla karam spice blend and curry leaves.',
    price: 499,
    isVeg: false,
    isSpicy: true,
    isBestseller: true,
    imageUrl: IMG.nonVegStarter,
  },
  {
    categorySlug: 'non-veg-starters',
    name: 'Pachi mirchi kodi vepudu',
    description: 'Fiery Andhra pan-fried chicken infused with fresh crushed green chillies and aromatic curry leaves.',
    price: 499,
    isVeg: false,
    isSpicy: true,
    isBestseller: false,
    imageUrl: IMG.nonVegStarter,
  },
  {
    categorySlug: 'non-veg-starters',
    name: 'Andhra fried fish',
    description: 'Crisp spiced coastal fish fillets shallow-fried with traditional Andhra masala and lemon.',
    price: 499,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.nonVegStarter,
  },
  {
    categorySlug: 'non-veg-starters',
    name: 'Crunchy fried chicken',
    description: 'Crispy golden-crusted seasoned chicken tenders fried juicy and served hot.',
    price: 499,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.chinese,
  },
  {
    categorySlug: 'non-veg-starters',
    name: 'Chicken majestick / 65 / Dragon',
    description: 'Juicy chicken strips prepared in your choice of Andhra Majestic, classic 65, or wok Dragon glaze.',
    price: 499,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.chinese,
  },
  {
    categorySlug: 'non-veg-starters',
    name: 'Chicken tikka',
    description: 'Smoky tandoor-charred boneless chicken marinated in yogurt, Kashmiri chilli, and warming spices.',
    price: 499,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.nonVegStarter,
  },
  {
    categorySlug: 'non-veg-starters',
    name: 'Fish (chilli / apollo / butter garlic)',
    description: 'Tender boneless fish tossed in choice of chilli, Hyderabadi Apollo sauce, or butter garlic.',
    price: 499,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.nonVegStarter,
  },
  {
    categorySlug: 'non-veg-starters',
    name: 'Fish tikka (achari / hariyali / ajwain)',
    description: 'Char-grilled fish fillets marinated in tangy achari, fresh herb hariyali, or fragrant ajwain.',
    price: 499,
    isVeg: false,
    isSpicy: true,
    isBestseller: false,
    imageUrl: IMG.nonVegStarter,
  },
  {
    categorySlug: 'non-veg-starters',
    name: 'Chicken kebab (lasoon / malai / tangdi)',
    description: 'Succulent charcoal-grilled chicken kebabs in garlic lasoon, creamy malai, or spiced tangdi style.',
    price: 499,
    isVeg: false,
    isSpicy: true,
    isBestseller: false,
    imageUrl: IMG.nonVegStarter,
  },
  {
    categorySlug: 'non-veg-starters',
    name: 'Royyala vepudu (prawn) chinta chiguru',
    description: 'Signature coastal Andhra pan-roasted prawns elevated with tangy tender tamarind shoots (chinta chiguru).',
    price: 549,
    isVeg: false,
    isSpicy: false,
    isBestseller: true,
    imageUrl: IMG.nonVegStarter,
  },
  {
    categorySlug: 'non-veg-starters',
    name: 'Tandoori prawns',
    description: 'Jumbo prawns marinated in spiced hung curd and roasted in the clay tandoor.',
    price: 549,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.nonVegStarter,
  },
  {
    categorySlug: 'non-veg-starters',
    name: 'Prawns (chilli / butter garlic / Loose)',
    description: 'Crispy or wok-tossed prawns prepared in spicy chilli, rich butter garlic, or crisp Loose prawn style.',
    price: 549,
    isVeg: false,
    isSpicy: true,
    isBestseller: false,
    imageUrl: IMG.nonVegStarter,
  },
  {
    categorySlug: 'non-veg-starters',
    name: 'Tandoori chicken (half)',
    description: 'Half bird marinated overnight in yogurt and roasted spices, charred over glowing charcoal.',
    price: 499,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.nonVegStarter,
  },
  {
    categorySlug: 'non-veg-starters',
    name: 'Tandoori chicken (full)',
    description: 'Full bird marinated overnight in yogurt and roasted spices, charred in our clay tandoor.',
    price: 899,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.nonVegStarter,
  },
  {
    categorySlug: 'non-veg-starters',
    name: 'Tandoori Avakai koramenu',
    description: 'Delicate koramenu fish marinated in bold Andhra avakai mango spice and roasted in the tandoor.',
    price: 1299,
    isVeg: false,
    isSpicy: false,
    isBestseller: true,
    imageUrl: IMG.nonVegStarter,
  },

  // 5. VEG CURRIES
  {
    categorySlug: 'veg-curries',
    name: 'Dal tadka',
    description: 'Slow-simmered yellow lentils tempered with sizzling ghee, cumin, garlic, and dried red chillies.',
    price: 279,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.veg,
  },
  {
    categorySlug: 'veg-curries',
    name: 'Veg kheema curry',
    description: 'Finely minced garden vegetables simmered in rich onion-tomato masala and aromatic spices.',
    price: 349,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.veg,
  },
  {
    categorySlug: 'veg-curries',
    name: 'Mix veg curry',
    description: 'Seasonal vegetables cooked in a velvety spiced onion, tomato, and cashew gravy.',
    price: 349,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.veg,
  },
  {
    categorySlug: 'veg-curries',
    name: 'Meloni tarkari',
    description: 'Medley of fresh vegetables simmered in creamy spinach-herb gravy.',
    price: 349,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.veg,
  },
  {
    categorySlug: 'veg-curries',
    name: 'Paneer (butter masala / palak / kadai)',
    description: 'Soft paneer cubes cooked in rich butter masala, fresh spinach palak, or spiced kadai gravy.',
    price: 399,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.veg,
  },
  {
    categorySlug: 'veg-curries',
    name: 'Methi chaman',
    description: 'Grated paneer simmered with fragrant fenugreek leaves and mildly spiced creamy spinach.',
    price: 399,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.veg,
  },
  {
    categorySlug: 'veg-curries',
    name: 'Mushroom masala',
    description: 'Button mushrooms braised in a robust roasted-spice tomato and onion masala.',
    price: 399,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.vegStarter,
  },
  {
    categorySlug: 'veg-curries',
    name: 'Kaju masala / Kaju mushroom / Kaju paneer',
    description: 'Roasted whole cashews paired with mushroom or paneer in a luscious golden cashew gravy.',
    price: 409,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.veg,
  },
  {
    categorySlug: 'veg-curries',
    name: 'Tomato cashewnut curry',
    description: 'Classic Andhra-style tangy tomato curry studded with crunchy roasted cashew nuts.',
    price: 409,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.veg,
  },

  // 6. NON VEG CURRIES
  {
    categorySlug: 'non-veg-curries',
    name: 'Chicken (butter chicken / tikka masala / curry)',
    description: 'Tender chicken prepared in creamy makhani butter sauce, smoky tikka masala, or homestyle curry.',
    price: 499,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'non-veg-curries',
    name: 'Kaju kodi iguru',
    description: 'Rich semi-dry Andhra chicken curry slow-cooked with roasted cashews and caramelized onions.',
    price: 499,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'non-veg-curries',
    name: 'Andhra Kodi koora',
    description: 'Authentic spicy Guntur-style chicken curry simmered with freshly roasted spices and coriander.',
    price: 499,
    isVeg: false,
    isSpicy: true,
    isBestseller: false,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'non-veg-curries',
    name: 'Kadai Chicken',
    description: 'Wok-seared chicken cooked with bell peppers, crushed coriander seeds, and thick tomato masala.',
    price: 499,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'non-veg-curries',
    name: 'Mutton rogan josh',
    description: 'Slow-braised tender mutton cooked in aromatic Kashmiri chilli, fennel, and browned onion gravy.',
    price: 499,
    isVeg: false,
    isSpicy: true,
    isBestseller: false,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'non-veg-curries',
    name: 'Kheema masala',
    description: 'Finely minced mutton slow-cooked with green peas, whole spices, ginger, and rich masala.',
    price: 549,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'non-veg-curries',
    name: 'Prawns curry',
    description: 'Coastal-style juicy prawns simmered in fragrant spiced onion-tomato gravy.',
    price: 549,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.nonVegStarter,
  },
  {
    categorySlug: 'non-veg-curries',
    name: 'Mutton curry',
    description: 'Homestyle bone-in mutton slow-simmered in deeply spiced Andhra gravy.',
    price: 549,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'non-veg-curries',
    name: 'Nellore chepala pulusu',
    description: 'Iconic tangy Nellore fish curry simmered with raw mango, tamarind, fenugreek, and Guntur chillies.',
    price: 549,
    isVeg: false,
    isSpicy: false,
    isBestseller: true,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'non-veg-curries',
    name: 'Royyala iguru',
    description: 'Thick coastal Andhra prawn masala slow-reduced with caramelized onions and aromatic curry leaves.',
    price: 549,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.nonVegStarter,
  },

  // 7. INDIAN BREADS
  {
    categorySlug: 'indian-breads',
    name: 'Tandoori roti (plain)',
    description: 'Traditional whole-wheat flatbread baked crisp inside our charcoal clay tandoor.',
    price: 50,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'indian-breads',
    name: 'Tandoori roti (butter)',
    description: 'Charcoal-baked whole-wheat tandoori roti brushed generously with melted butter.',
    price: 55,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'indian-breads',
    name: 'Naan (plain)',
    description: 'Soft, blistered leavened clay-oven flatbread served piping hot.',
    price: 69,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'indian-breads',
    name: 'Naan (butter / garlic)',
    description: 'Fluffy tandoor-baked naan finished with melted butter or roasted garlic and coriander.',
    price: 89,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'indian-breads',
    name: 'Kulcha masala',
    description: 'Flaky leavened flatbread seasoned with spiced herbs and roasted masala.',
    price: 99,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'indian-breads',
    name: 'Kulcha stuffed',
    description: 'Soft tandoori kulcha stuffed with seasoned mashed potato, paneer, and spices.',
    price: 99,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'indian-breads',
    name: 'Paratha plain',
    description: 'Flaky, multi-layered whole-wheat paratha roasted golden with ghee.',
    price: 129,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'indian-breads',
    name: 'Paratha aloo',
    description: 'Hearty flaky paratha stuffed with spiced mashed potatoes, green chillies, and coriander.',
    price: 129,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.feast,
  },

  // 8. RICE / NOODLES
  {
    categorySlug: 'rice-noodles',
    name: 'Plain curd',
    description: 'Cool, fresh house-set creamy yogurt.',
    price: 79,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.curdRice,
  },
  {
    categorySlug: 'rice-noodles',
    name: 'Plain rice',
    description: 'Steamed fluffy white rice ideal for pairing with Andhra curries and pulusu.',
    price: 99,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.veg,
  },
  {
    categorySlug: 'rice-noodles',
    name: 'Curd rice',
    description: 'Comforting South Indian curd rice tempered with mustard seeds, curry leaves, and ginger.',
    price: 229,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.curdRice,
  },
  {
    categorySlug: 'rice-noodles',
    name: 'Special curd rice',
    description: 'Creamy tempered curd rice crowned with fresh pomegranate pearls, grapes, and roasted cashews.',
    price: 299,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.curdRice,
  },
  {
    categorySlug: 'rice-noodles',
    name: 'Bisi bele bath',
    description: 'Traditional spiced lentil and rice medley cooked with vegetables, tamarind, and pure ghee.',
    price: 299,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.veg,
  },
  {
    categorySlug: 'rice-noodles',
    name: 'Veg fried rice',
    description: 'Wok-tossed aromatic rice with crisp garden vegetables, spring onions, and light soy.',
    price: 299,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.chinese,
  },
  {
    categorySlug: 'rice-noodles',
    name: 'Signature veg fried rice',
    description: 'Chef Special smoky wok-tossed fried rice elevated with house spice blend and crisp vegetables.',
    price: 329,
    isVeg: true,
    isSpicy: false,
    isBestseller: true,
    imageUrl: IMG.chinese,
  },
  {
    categorySlug: 'rice-noodles',
    name: 'Veg noodles (soft / hakka / schezwan)',
    description: 'High-flame tossed noodles prepared in your choice of soft, classic Hakka, or spicy Schezwan.',
    price: 349,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.chinese,
  },
  {
    categorySlug: 'rice-noodles',
    name: 'Fried rice (paneer / mushroom / kaju)',
    description: 'Aromatic wok-tossed fried rice enriched with your choice of paneer, mushroom, or roasted cashews.',
    price: 349,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.chinese,
  },
  {
    categorySlug: 'rice-noodles',
    name: 'Egg fried rice',
    description: 'Fluffy wok-tossed rice scrambled with eggs, spring onions, garlic, and cracked pepper.',
    price: 369,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.chinese,
  },
  {
    categorySlug: 'rice-noodles',
    name: 'Chicken noodles (soft / hakka / schezwan)',
    description: 'Wok-tossed chicken noodles in choice of soft, Hakka, or spicy Schezwan style.',
    price: 379,
    isVeg: false,
    isSpicy: true,
    isBestseller: false,
    imageUrl: IMG.chinese,
  },
  {
    categorySlug: 'rice-noodles',
    name: 'Chicken fried rice',
    description: 'Smoky high-flame fried rice tossed with tender chicken strips, egg, and scallions.',
    price: 399,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.chinese,
  },

  // 9. CHOICE OF BIRYANI (VEG)
  {
    categorySlug: 'biryani-veg',
    name: 'Vegetable biryani',
    description: 'Fragrant saffron basmati rice layered with spiced seasonal vegetables, mint, and raita.',
    price: 349,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.biryani,
  },
  {
    categorySlug: 'biryani-veg',
    name: 'Biryani (avakai / ulavacharu)',
    description: 'Authentic Andhra-style vegetarian biryani infused with tangy avakai mango pickle or rich ulavacharu.',
    price: 369,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.biryani,
  },
  {
    categorySlug: 'biryani-veg',
    name: 'Choice of biryani (paneer / mushroom / kaju)',
    description: 'Aromatic dum basmati biryani layered with roasted paneer, mushroom, or golden cashews.',
    price: 399,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.biryani,
  },

  // 10. CHOICE OF BIRYANI (NON-VEG)
  {
    categorySlug: 'biryani-non-veg',
    name: 'Egg biryani',
    description: 'Spiced boiled eggs layered with saffron basmati rice, fried onions, and aromatic herbs.',
    price: 399,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.biryani,
  },
  {
    categorySlug: 'biryani-non-veg',
    name: 'Chicken dum biryani',
    description: 'Classic slow-steamed dum biryani with marinated tender chicken and aged saffron basmati rice.',
    price: 439,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.biryani,
  },
  {
    categorySlug: 'biryani-non-veg',
    name: 'Chicken fry piece biryani',
    description: 'Crispy Andhra fry-piece chicken served over fragrant spiced dum biryani rice.',
    price: 499,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'biryani-non-veg',
    name: 'Special chicken biryani',
    description: 'Boneless spiced chicken tossed in rich house masala layered over aromatic basmati rice.',
    price: 499,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'biryani-non-veg',
    name: 'Fish biryani',
    description: 'Delicate spiced fish fillets layered gently with fragrant saffron-kissed basmati rice.',
    price: 499,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.biryani,
  },
  {
    categorySlug: 'biryani-non-veg',
    name: 'Signature dine special biryani',
    description: 'Chef Special signature house biryani featuring rich layered masala, tender cuts, and saffron basmati.',
    price: 569,
    isVeg: false,
    isSpicy: false,
    isBestseller: true,
    imageUrl: IMG.feast,
  },
  {
    categorySlug: 'biryani-non-veg',
    name: 'Signature mutton biryani',
    description: 'Chef Special slow-cooked tender mutton dum biryani infused with Guntur spices and saffron.',
    price: 569,
    isVeg: false,
    isSpicy: false,
    isBestseller: true,
    imageUrl: IMG.biryani,
  },
  {
    categorySlug: 'biryani-non-veg',
    name: 'Prawns biryani',
    description: 'Coastal-spiced juicy prawns layered with mint, fried onions, and aromatic dum basmati rice.',
    price: 569,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.biryani,
  },
  {
    categorySlug: 'biryani-non-veg',
    name: 'Mutton kheema biryani',
    description: 'Rich slow-simmered mutton kheema layered with fragrant saffron basmati rice.',
    price: 619,
    isVeg: false,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.biryani,
  },

  // 11. DESSERTS
  {
    categorySlug: 'desserts',
    name: 'Gulab jamun / kala jamun',
    description: 'Warm melt-in-mouth khoya dumplings soaked in rose and cardamom sugar syrup.',
    price: 149,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.dessert,
  },
  {
    categorySlug: 'desserts',
    name: 'Fruit salad',
    description: 'Chilled medley of freshly cut seasonal fruits.',
    price: 149,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.dessert,
  },
  {
    categorySlug: 'desserts',
    name: 'Apricot delight',
    description: 'Luscious stewed apricot compote layered with chilled sweet cream and sponge.',
    price: 149,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.dessert,
  },
  {
    categorySlug: 'desserts',
    name: 'Rasmalai',
    description: 'Soft cottage cheese patties soaked in chilled saffron-pistachio sweetened milk.',
    price: 199,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.dessert,
  },
  {
    categorySlug: 'desserts',
    name: 'Halwa (gajar / moong dal)',
    description: 'Rich slow-cooked carrot or moong dal halwa prepared with pure ghee, cardamom, and nuts.',
    price: 199,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.dessert,
  },
  {
    categorySlug: 'desserts',
    name: 'Khubani ka meetha',
    description: 'Hyderabadi-style slow-stewed sweet apricots served warm with malai cream.',
    price: 199,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.dessert,
  },
  {
    categorySlug: 'desserts',
    name: 'Fruit salad with ice cream',
    description: 'Fresh seasonal fruit salad crowned with a generous scoop of creamy ice cream.',
    price: 199,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.dessert,
  },
  {
    categorySlug: 'desserts',
    name: 'Gulab jamun / Khubani ka meetha (with ice cream)',
    description: 'Warm gulab jamun or khubani ka meetha paired with chilled vanilla ice cream.',
    price: 219,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.dessert,
  },

  // 12. CHOICE OF ICE CREAMS
  {
    categorySlug: 'ice-creams',
    name: 'Vanilla / strawberry / mango',
    description: 'Classic creamy scoop of vanilla, strawberry, or Alphonso mango ice cream.',
    price: 139,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.dessert,
  },
  {
    categorySlug: 'ice-creams',
    name: 'Roasted Almond / chocolate / butter scotch',
    description: 'Indulgent scoop of roasted almond, rich chocolate, or crunchy butterscotch ice cream.',
    price: 179,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.dessert,
  },

  // 13. BEVERAGES
  {
    categorySlug: 'beverages',
    name: 'Fresh lime water (sweet / salt)',
    description: 'Refreshing freshly squeezed lime juice served sweet or salted over ice.',
    price: 75,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.beverage,
  },
  {
    categorySlug: 'beverages',
    name: 'Fresh lime soda (salt / sweet)',
    description: 'Sparkling chilled fresh lime soda served salted or sweetened.',
    price: 99,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.beverage,
  },
  {
    categorySlug: 'beverages',
    name: 'Butter milk',
    description: 'Chilled spiced Indian buttermilk tempered with ginger, coriander, and roasted cumin.',
    price: 99,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.beverage,
  },
  {
    categorySlug: 'beverages',
    name: 'Lassi (salt / sweet)',
    description: 'Thick churned yogurt lassi served chilled—choose classic sweet or lightly salted.',
    price: 169,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.beverage,
  },
  {
    categorySlug: 'beverages',
    name: 'Milk shakes (vanilla / strawberry / mango / chocolate)',
    description: 'Thick blended milkshake in your choice of vanilla, strawberry, mango, or chocolate.',
    price: 199,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.beverage,
  },
  {
    categorySlug: 'beverages',
    name: 'Seasonal fresh juices',
    description: 'Freshly pressed seasonal fruit juice served chilled.',
    price: 199,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.beverage,
  },
  {
    categorySlug: 'beverages',
    name: 'Packaged drinking water',
    description: 'Sealed mineral drinking water bottle sold at MRP.',
    price: null,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.beverage,
  },
  {
    categorySlug: 'beverages',
    name: 'Soft drink - can',
    description: 'Chilled aerated soft drink can sold at MRP.',
    price: null,
    isVeg: true,
    isSpicy: false,
    isBestseller: false,
    imageUrl: IMG.beverage,
  },
];

// Legacy placeholder dish names from initial prototype seed (replaced once official menu is seeded)
const LEGACY_PLACEHOLDER_DISHES = [
  'Mutton Dum Biryani',
  'Signature Special Biryani',
  'Vijayawada Boneless Chicken Biryani',
  'Guntur Paneer & Kaju Dum Biryani',
  'Royyala Vepudu',
  'Butter Garlic Mushroom',
  'Mutton Soup',
  'Royal Andhra Bhojanam Thali',
  'Fruit Curd Rice',
  'Guntur Wok Chilli Chicken',
  'Veg Schezwan Hakka Noodles',
  'Double Ka Meetha & Gulab Jamun',
  'Saffron Badam Mango Lassi',
  'Brass Davara Filter Coffee',
];

async function runSeed(): Promise<void> {
  const existingSettings = await db
    .select({ value: count() })
    .from(restaurantSettings);
  if (Number(existingSettings[0]?.value ?? 0) === 0) {
    await db.insert(restaurantSettings).values({
      name: 'Signature Dine',
      teluguName: 'సిగ్నేచర్ డైన్',
      restaurantType: 'Andhra Restaurant',
      address: '3rd Line, Brindavan Gardens, Guntur, Andhra Pradesh 522006, India',
      plusCode: '8C79+MX, Guntur, Andhra Pradesh',
      phone: null,
      whatsappNumber: null,
      googleMapsUrl:
        'https://www.google.com/maps/search/?api=1&query=3rd+Line+Brindavan+Gardens+Guntur+Andhra+Pradesh+522006',
      googleReviewUrl: null,
      instagramUrl: null,
      facebookUrl: null,
      deliveryEnabled: false,
      deliveryCharge: null,
      heroSubtext:
        'Discover delicious biryanis, traditional Andhra delicacies, flavourful starters, and an unforgettable dining experience in Guntur.',
    });
  }

  const existingHours = await db.select({ value: count() }).from(openingHours);
  if (Number(existingHours[0]?.value ?? 0) === 0) {
    const days = [
      { dayOfWeek: 0, dayName: 'Sunday' },
      { dayOfWeek: 1, dayName: 'Monday' },
      { dayOfWeek: 2, dayName: 'Tuesday' },
      { dayOfWeek: 3, dayName: 'Wednesday' },
      { dayOfWeek: 4, dayName: 'Thursday' },
      { dayOfWeek: 5, dayName: 'Friday' },
      { dayOfWeek: 6, dayName: 'Saturday' },
    ];
    await db.insert(openingHours).values(
      days.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        dayName: d.dayName,
        openTime: '12:00',
        closeTime: '23:00',
        isClosed: false,
        specialNote: null,
      }))
    );
  } else {
    const hoursRows = await db.select().from(openingHours);
    for (const row of hoursRows) {
      if (!row.closeTime) {
        await db
          .update(openingHours)
          .set({ closeTime: '23:00' })
          .where(eq(openingHours.id, row.id));
      }
    }
  }

  // Upsert all 13 official categories
  const existingCategories = await db.select().from(menuCategories);
  const catBySlug: Record<string, (typeof existingCategories)[number]> = {};
  for (const c of existingCategories) {
    catBySlug[c.slug] = c;
  }

  for (const feat of OFFICIAL_CATEGORIES) {
    const existing = catBySlug[feat.slug];
    if (!existing) {
      const [created] = await db
        .insert(menuCategories)
        .values({
          name: feat.name,
          slug: feat.slug,
          sortOrder: feat.sortOrder,
          isActive: true,
        })
        .returning();
      catBySlug[feat.slug] = created;
    } else if (
      existing.name !== feat.name ||
      existing.sortOrder !== feat.sortOrder ||
      !existing.isActive
    ) {
      const [updated] = await db
        .update(menuCategories)
        .set({ name: feat.name, sortOrder: feat.sortOrder, isActive: true })
        .where(eq(menuCategories.id, existing.id))
        .returning();
      catBySlug[feat.slug] = updated;
    }
  }

  // One-time cleanup of initial placeholder dishes when syncing official printed menu
  const currentItems = await db.select().from(menuItems);
  const itemsByName = new Map(currentItems.map((i) => [i.name.toLowerCase(), i]));
  const hasOfficialAnchor = itemsByName.has('signature dine special biryani');

  if (!hasOfficialAnchor) {
    await db
      .delete(menuItems)
      .where(inArray(menuItems.name, LEGACY_PLACEHOLDER_DISHES));
  }

  // Refresh items map after cleanup and insert all missing official menu items
  const refreshedBeforeInsert = await db.select().from(menuItems);
  const existingNameSet = new Set(refreshedBeforeInsert.map((i) => i.name.toLowerCase()));

  let sortIdx = 1;
  for (const dish of OFFICIAL_MENU_ITEMS) {
    const categoryId = catBySlug[dish.categorySlug]?.id;
    if (!categoryId) {
      sortIdx++;
      continue;
    }

    if (!existingNameSet.has(dish.name.toLowerCase())) {
      await db.insert(menuItems).values({
        categoryId,
        name: dish.name,
        description: dish.description,
        price: dish.price,
        isPriceConfirmed: dish.price !== null,
        isVeg: dish.isVeg,
        isSpicy: dish.isSpicy,
        isAvailable: true,
        isBestseller: dish.isBestseller,
        imageUrl: dish.imageUrl,
        sortOrder: sortIdx,
      });
    }
    sortIdx++;
  }

  // Deactivate empty legacy categories (so customer menu shows clean populated official categories)
  const refreshedItems = await db.select().from(menuItems);
  const usedCatIds = new Set(refreshedItems.map((i) => i.categoryId));
  const officialSlugs = new Set(OFFICIAL_CATEGORIES.map((f) => f.slug));
  const allCatsAfter = await db.select().from(menuCategories);
  for (const cat of allCatsAfter) {
    if (!officialSlugs.has(cat.slug) && !usedCatIds.has(cat.id) && cat.isActive) {
      await db
        .update(menuCategories)
        .set({ isActive: false })
        .where(eq(menuCategories.id, cat.id));
    }
  }

  // Align Today's Special with official menu pricing if still on prototype default
  const existingSpecial = await db.select().from(todaysSpecial).limit(1);
  const { istDateISO } = getIstNowParts();
  if (existingSpecial.length === 0) {
    await db.insert(todaysSpecial).values({
      dishName: 'Signature Dine Special Biryani',
      description:
        'Chef’s signature special biryani paired with rich house masala, tender spiced cuts, and aromatic saffron basmati rice.',
      specialPrice: 569,
      originalPrice: null,
      imageUrl: IMG.feast,
      validDate: istDateISO,
      isAvailable: true,
      isEnabled: true,
    });
  } else if (existingSpecial[0].dishName === 'Royal Mutton Dum Biryani & Royyala Combo') {
    await db
      .update(todaysSpecial)
      .set({
        dishName: 'Signature Dine Special Biryani',
        description:
          'Chef’s signature special biryani paired with rich house masala, tender spiced cuts, and aromatic saffron basmati rice.',
        specialPrice: 569,
        originalPrice: null,
        imageUrl: IMG.feast,
        validDate: istDateISO,
        isAvailable: true,
        isEnabled: true,
      })
      .where(eq(todaysSpecial.id, existingSpecial[0].id));
  }

  const existingGallery = await db.select({ value: count() }).from(galleryItems);
  if (Number(existingGallery[0]?.value ?? 0) === 0) {
    await db.insert(galleryItems).values([
      {
        title: 'Signature Dine Special Biryani',
        category: 'Biryani',
        imageUrl: IMG.feast,
        caption: 'Warm copper handi biryanis and traditional accompaniments served for family dining.',
        sortOrder: 1,
      },
      {
        title: 'Signature Mutton Biryani',
        category: 'Biryani',
        imageUrl: IMG.biryani,
        caption: 'Fragrant saffron basmati rice layered over slow-braised spiced mutton.',
        sortOrder: 2,
      },
      {
        title: 'Royyala Vepudu Chinta Chiguru',
        category: 'Andhra Dishes',
        imageUrl: IMG.nonVegStarter,
        caption: 'Crisp curry leaves, Guntur chillies, and pan-seared coastal prawns.',
        sortOrder: 3,
      },
      {
        title: 'Family Dining Hall',
        category: 'Interior & Ambiance',
        imageUrl: '/src/assets/images/restaurant_interior_clean_1795633843510.jpg',
        caption: 'Warm teakwood tables, brass accents, and inviting family seating in Brindavan Gardens.',
        sortOrder: 4,
      },
      {
        title: 'Wok-Tossed Noodles & Manchurian',
        category: 'Preparation',
        imageUrl: IMG.chinese,
        caption: 'Sizzling starters and Schezwan specials tossed over high flame.',
        sortOrder: 5,
      },
      {
        title: 'Khubani Ka Meetha & Gulab Jamun',
        category: 'Desserts',
        imageUrl: IMG.dessert,
        caption: 'Traditional saffron and pistachio-infused Indian desserts.',
        sortOrder: 6,
      },
      {
        title: 'Refreshing Lassi & Fresh Juices',
        category: 'Beverages',
        imageUrl: IMG.beverage,
        caption: 'Chilled lassi, milk shakes, and fresh seasonal juices.',
        sortOrder: 7,
      },
    ]);
  }
}

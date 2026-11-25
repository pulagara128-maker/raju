import React, { useMemo, useState } from 'react';
import { Clock, Flame, Minus, Plus, QrCode, Search, ShoppingBag } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { DishImage } from './DishImage.tsx';

interface MenuSectionProps {
  onOpenQrMenu: () => void;
}

export function MenuSection({ onOpenQrMenu }: MenuSectionProps) {
  const { bootstrap, loading, cart, addToCart, updateQuantity, setCartOpen, openOrderTracker } =
    useApp();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'nonveg'>('all');
  const [spicyOnly, setSpicyOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'name_asc' | 'price_asc' | 'price_desc'>(
    'featured'
  );

  const categories = bootstrap?.categories || [];
  const items = bootstrap?.menuItems || [];

  const categoryNameMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const c of categories) map[c.id] = c.name;
    return map;
  }, [categories]);

  const categoryCountMap = useMemo(() => {
    const map: Record<number, number> = {};
    for (const item of items) {
      map[item.categoryId] = (map[item.categoryId] || 0) + 1;
    }
    return map;
  }, [items]);

  const cartQtyMap = useMemo(() => {
    const map: Record<number, number> = {};
    for (const c of cart) map[c.menuItem.id] = c.quantity;
    return map;
  }, [cart]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = items.filter((item) => {
      if (selectedCategoryId !== 'all' && item.categoryId !== selectedCategoryId) return false;
      if (dietFilter === 'veg' && !item.isVeg) return false;
      if (dietFilter === 'nonveg' && item.isVeg) return false;
      if (spicyOnly && !item.isSpicy) return false;
      if (q) {
        const hay = `${item.name} ${item.description} ${categoryNameMap[item.categoryId] || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'price_asc') {
        const pa = a.isPriceConfirmed && a.price !== null ? a.price : Number.MAX_SAFE_INTEGER;
        const pb = b.isPriceConfirmed && b.price !== null ? b.price : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      }
      if (sortBy === 'price_desc') {
        const pa = a.isPriceConfirmed && a.price !== null ? a.price : -1;
        const pb = b.isPriceConfirmed && b.price !== null ? b.price : -1;
        return pb - pa;
      }
      if (a.isBestseller !== b.isBestseller) return a.isBestseller ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
  }, [items, selectedCategoryId, dietFilter, spicyOnly, searchQuery, sortBy, categoryNameMap]);

  return (
    <section
      id="menu"
      className="py-16 lg:py-24 bg-[#0B0907] text-[#FFF8ED] border-b border-[#FFC247]/12"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-sm font-semibold text-[#FFC247] mb-2">
              Curated Andhra Kitchen
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#FFF8ED] tracking-tight">
              Our Food Menu
            </h2>
            <p className="text-sm sm:text-base text-[#FFF8ED]/70 mt-2 max-w-2xl">
              Explore our signature biryanis, coastal starters, South Indian meals, Indo-Chinese
              specials, desserts, and beverages—crafted fresh in Brindavan Gardens, Guntur.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={openOrderTracker}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#FFC247]/30 bg-[#16110D] hover:bg-[#1E1712] text-sm font-semibold text-[#FFF8ED] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Clock className="w-4 h-4 text-[#FFC247]" />
              <span>Track Live Order</span>
            </button>
            <button
              type="button"
              onClick={onOpenQrMenu}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#FFC247]/20 bg-[#16110D] hover:border-[#FFC247]/50 text-sm font-semibold text-[#FFC247] transition-colors cursor-pointer whitespace-nowrap"
            >
              <QrCode className="w-4 h-4" />
              <span>Printable QR Menu</span>
            </button>
          </div>
        </div>

        {/* Search, Dietary & Sort Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-6">
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-[#FFF8ED]/45 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes (e.g. Biryani, Royyala, Thali, Noodles)..."
              aria-label="Search menu dishes"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#FFC247]/20 bg-[#16110D] text-sm text-[#FFF8ED] placeholder:text-[#FFF8ED]/45 focus:outline-none focus:ring-2 focus:ring-[#E87522]"
            />
          </div>

          <div className="lg:col-span-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-[#16110D] p-1 border border-[#FFC247]/15">
              {(['all', 'veg', 'nonveg'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDietFilter(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    dietFilter === mode
                      ? 'bg-[#FFC247] text-[#120D0A]'
                      : 'text-[#FFF8ED]/75 hover:text-[#FFF8ED]'
                  }`}
                >
                  {mode === 'all' ? 'All' : mode === 'veg' ? 'Veg Only' : 'Non-Veg'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSpicyOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                spicyOnly
                  ? 'bg-[#B83B24] text-white border-[#B83B24]'
                  : 'bg-[#16110D] text-[#FFF8ED]/80 border-[#FFC247]/15 hover:border-[#E87522]'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-[#E87522]" />
              <span>Spicy</span>
            </button>
          </div>

          <div className="lg:col-span-3 flex items-center justify-end">
            <label className="sr-only" htmlFor="menu-sort">
              Sort menu items
            </label>
            <select
              id="menu-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#FFC247]/20 bg-[#16110D] text-sm text-[#FFF8ED] focus:outline-none focus:ring-2 focus:ring-[#E87522]"
            >
              <option value="featured">Sort: Featured &amp; Bestsellers</option>
              <option value="name_asc">Sort: Name (A–Z)</option>
              <option value="price_asc">Sort: Price (Low to High)</option>
              <option value="price_desc">Sort: Price (High to Low)</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 border-b border-[#FFC247]/12">
          <button
            type="button"
            onClick={() => setSelectedCategoryId('all')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedCategoryId === 'all'
                ? 'bg-[#E87522] text-white shadow-sm'
                : 'bg-[#16110D] text-[#FFF8ED]/80 border border-[#FFC247]/15 hover:border-[#FFC247]/40'
            }`}
          >
            All Categories ({items.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedCategoryId === cat.id
                  ? 'bg-[#E87522] text-white shadow-sm'
                  : 'bg-[#16110D] text-[#FFF8ED]/80 border border-[#FFC247]/15 hover:border-[#FFC247]/40'
              }`}
            >
              {cat.name} ({categoryCountMap[cat.id] || 0})
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="rounded-2xl border border-[#FFC247]/10 bg-[#16110D] overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-[#221A13]" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-[#221A13] rounded w-2/3" />
                  <div className="h-4 bg-[#221A13] rounded w-full" />
                  <div className="h-9 bg-[#221A13] rounded w-1/2 mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-[#FFC247]/15 bg-[#16110D] p-10 text-center">
            <p className="text-base font-semibold text-[#FFF8ED]">
              No dishes match your current filters.
            </p>
            <p className="text-sm text-[#FFF8ED]/65 mt-1">
              Try clearing your search or selecting All Categories.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId('all');
                setSearchQuery('');
                setDietFilter('all');
                setSpicyOnly(false);
              }}
              className="mt-4 px-4 py-2 rounded-lg bg-[#E87522] text-white text-sm font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const qty = cartQtyMap[item.id] || 0;
              const priceConfirmed = item.isPriceConfirmed && item.price !== null;

              return (
                <article
                  key={item.id}
                  className="group flex flex-col rounded-2xl border border-[#FFC247]/15 hover:border-[#FFC247]/40 hover:-translate-y-1 bg-[#16110D] overflow-hidden transition-all duration-200"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#221912] relative">
                    <DishImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#16110D]/55 via-transparent to-transparent pointer-events-none" />
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-[#0B0907]/75 flex items-center justify-center">
                        <span className="px-3 py-1 rounded bg-[#1D1611] border border-[#FFC247]/30 text-[#FFF8ED] text-xs font-semibold">
                          Currently Unavailable
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    {/* Unboxed Metadata Line */}
                    <div className="flex items-center justify-between gap-2 text-xs text-[#FFF8ED]/65 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Indian Veg / Non-Veg Square Indicator */}
                        <span
                          title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                          className={`inline-flex items-center justify-center w-3.5 h-3.5 border rounded-[2px] shrink-0 bg-[#0B0907] ${
                            item.isVeg ? 'border-emerald-500' : 'border-[#E8523A]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.isVeg ? 'bg-emerald-500' : 'bg-[#E8523A]'
                            }`}
                          />
                        </span>
                        <span className="truncate font-medium">
                          {categoryNameMap[item.categoryId] || 'Dish'}
                        </span>
                        {item.isBestseller && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#FFC247] font-semibold shrink-0">Signature</span>
                          </>
                        )}
                      </div>

                      {item.isSpicy && (
                        <span className="inline-flex items-center gap-1 text-[#E87522] font-semibold shrink-0">
                          <Flame className="w-3.5 h-3.5" />
                          Spicy
                        </span>
                      )}
                    </div>

                    <h3 className="font-display font-bold text-lg text-[#FFF8ED] leading-snug mb-1.5">
                      {item.name}
                    </h3>

                    <p className="text-sm text-[#FFF8ED]/70 leading-relaxed line-clamp-3 mb-4 flex-1">
                      {item.description}
                    </p>

                    <div className="pt-3.5 border-t border-[#FFC247]/12 flex items-center justify-between gap-3">
                      <div>
                        {priceConfirmed ? (
                          <span className="text-lg font-bold text-[#FFC247] font-mono tabular-nums">
                            ₹{item.price}
                          </span>
                        ) : item.description.toLowerCase().includes('mrp') ? (
                          <span className="text-base font-bold text-[#FFC247] font-mono">
                            MRP
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-[#E87522] block leading-tight">
                            Price confirmed at counter
                          </span>
                        )}
                      </div>

                      {item.isAvailable ? (
                        qty > 0 ? (
                          <div className="inline-flex items-center gap-1 rounded-xl border border-[#FFC247]/40 bg-[#0B0907] p-1">
                            <button
                              type="button"
                              aria-label={`Decrease quantity of ${item.name}`}
                              onClick={() => updateQuantity(item.id, qty - 1)}
                              className="p-1.5 rounded-lg hover:bg-[#FFC247]/15 text-[#FFF8ED] cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2 text-sm font-mono font-semibold tabular-nums text-[#FFC247]">
                              {qty}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase quantity of ${item.name}`}
                              onClick={() => updateQuantity(item.id, qty + 1)}
                              className="p-1.5 rounded-lg hover:bg-[#FFC247]/15 text-[#FFF8ED] cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(item)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E87522] hover:bg-[#D96414] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Add to Cart</span>
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-[#FFF8ED]/45 font-medium">Unavailable</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-[#FFF8ED]/55">
          Food is prepared fresh and served within 20–30 minutes · Menu prices are final · GST applicable
        </p>

        {cart.length > 0 && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FFC247] hover:bg-[#F5B432] text-[#120D0A] font-semibold text-sm shadow-lg cursor-pointer transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>View Cart &amp; Checkout ({cart.reduce((s, c) => s + c.quantity, 0)} items)</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

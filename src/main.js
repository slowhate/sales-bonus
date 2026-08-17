/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет выручки от операции
  const { discount, sale_price, quantity } = purchase;
  const discountFactor = 1 - discount / 100;
  return sale_price * quantity * discountFactor;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // @TODO: Расчет бонуса от позиции в рейтинге
  const { profit } = seller;
  if (index === 0) {
    return profit * 0.15;
  } else if (index === 1 || index === 2) {
    return profit * 0.1;
  } else if (index === total - 1) {
    return 0;
  } else {
    // Для всех остальных
    return profit * 0.05;
  }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
  const required = ["sellers", "products", "purchase_records"];
  const badKey = required.find((key) => {
    const val = data?.[key];
    return !Array.isArray(val) || val.length === 0;
  });

  if (!data || badKey) {
    throw new Error(
      `Некорректные входные данные: отсутствует или пуст массив "${badKey}"`,
    );
  }
  // @TODO: Проверка наличия опций
  if (typeof options !== "object" || options === null) {
    throw new Error("options должен быть объектом");
  }

  const { calculateRevenue, calculateBonus } = options;

  if (!calculateRevenue || !calculateBonus) {
    throw new Error("В options должны быть calculateRevenue и calculateBonus");
  }

  if (typeof calculateRevenue !== "function") {
    throw new Error("calculateRevenue должен быть функцией");
  }

  if (typeof calculateBonus !== "function") {
    throw new Error("calculateBonus должен быть функцией");
  }
  // @TODO: Подготовка промежуточных данных для сбора статистики
  const sellerStats = data.sellers.map((seller) => ({
    sellerId: seller.id,
    fullName: `${seller.first_name} ${seller.last_name}`,
    position: seller.position,
    sales_count: 0,
    revenue: 0,
    profit: 0,
    products_sold: {},
    bonus: 0,
    top_products: [],
  }));
  // @TODO: Индексация продавцов и товаров для быстрого доступа
  const sellerIndex = Object.fromEntries(
    sellerStats.map((stat) => [stat.sellerId, stat]),
  );

  const productIndex = Object.fromEntries(
    data.products.map((item) => [item.sku, item]),
  );
  // @TODO: Расчет выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    // Чек
    const seller = sellerIndex[record.seller_id];
    if (!seller) return; // Продавец
    // Увеличить количество продаж
    seller.sales_count += 1;
    // Увеличить общую сумму выручки всех продаж
    seller.revenue += record.total_amount;
    // Расчёт прибыли для каждого товара
    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      if (!product) return; // Товар
      // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
      const cost = product.purchase_price * item.quantity;
      // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
      const revenue = calculateSimpleRevenue(item, product);
      // Посчитать прибыль: выручка минус себестоимость
      const itemProfit = revenue - cost;
      // Увеличить общую накопленную прибыль (profit) у продавца
      seller.profit += itemProfit;
      // Учёт количества проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      // По артикулу товара увеличить его проданное количество у продавца
      seller.products_sold[item.sku] += item.quantity;
    });
  });
  // @TODO: Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);
  // @TODO: Назначение премий на основе ранжирования
  const total = sellerStats.length;
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, total, seller);
    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });
  // @TODO: Подготовка итоговой коллекции с нужными полями
  return sellerStats.map((seller) => ({
    seller_id: seller.sellerId,
    name: seller.fullName,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
}

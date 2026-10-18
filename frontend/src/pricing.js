import { CURRENCY } from "./constants";

/**
 * Turns the price list from the API into easy helpers:
 *   airlines            -> ["Airblue", "Emirates", ...]
 *   classesFor(airline) -> classes that airline offers, cheapest first
 *   priceFor(a, c)      -> number, or null if that combination doesn't exist
 */
export function buildPricing(prices) {
  const airlines = [...new Set(prices.map((p) => p.airline))].sort();

  const classesFor = (airline) =>
    prices
      .filter((p) => p.airline === airline)
      .sort((a, b) => a.price - b.price)
      .map((p) => p.flightClass);

  const priceFor = (airline, flightClass) =>
    prices.find((p) => p.airline === airline && p.flightClass === flightClass)?.price ?? null;

  return { airlines, classesFor, priceFor };
}

// 45000 -> "PKR 45,000"
export function formatPrice(amount) {
  if (amount === null || amount === undefined) return "—";
  return `${CURRENCY} ${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

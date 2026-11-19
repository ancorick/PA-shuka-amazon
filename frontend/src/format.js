const nf = new Intl.NumberFormat('en-US');

export const amd = (n) => `${nf.format(n ?? 0)} ֏`;

export const dateShort = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const dateTime = (iso) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const STATUS_LABEL = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const MOVE_LABEL = {
  confirmed: 'Confirm order',
  shipped: 'Mark as shipped',
  delivered: 'Mark as delivered (cash received)',
  cancelled: 'Cancel order',
};

export const REGIONS = [
  'Yerevan', 'Aragatsotn', 'Ararat', 'Armavir', 'Gegharkunik', 'Kotayk',
  'Lori', 'Shirak', 'Syunik', 'Tavush', 'Vayots Dzor',
];

export function stockLabel(stock) {
  if (stock <= 0) return { text: 'Out of stock', tone: 'danger' };
  if (stock <= 5) return { text: `Only ${stock} left in stock`, tone: 'warn' };
  return { text: 'In stock', tone: 'ok' };
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

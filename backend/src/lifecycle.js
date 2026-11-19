import { db, now } from './db.js';
import { conflict } from './errors.js';

export const STATUSES = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];

/** The only list of allowed moves. Everything else is a 409. */
export const SELLER_MOVES = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const BUYER_CAN_CANCEL_FROM = ['placed', 'confirmed'];

export const sellerAllowedMoves = (status) => SELLER_MOVES[status] || [];
export const buyerCanCancel = (status) => BUYER_CAN_CANCEL_FROM.includes(status);

const updateStatus = db.prepare(
  'UPDATE seller_orders SET status = ?, updated_at = ? WHERE id = ? AND status = ?',
);
const insertHistory = db.prepare(
  'INSERT INTO status_history (seller_order_id, from_status, to_status, changed_by, created_at) VALUES (?, ?, ?, ?, ?)',
);
const itemsOf = db.prepare('SELECT product_id, quantity FROM order_items WHERE seller_order_id = ?');
const restock = db.prepare('UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?');

/**
 * Moves one seller order from `from` to `to`. MUST be called inside tx().
 * The `AND status = ?` guard makes a concurrent change lose cleanly with a 409.
 * Cancelling returns the stock in the same transaction.
 */
export function applyTransition(sellerOrderId, from, to, userId) {
  const ts = now();
  const res = updateStatus.run(to, ts, sellerOrderId, from);
  if (res.changes !== 1) {
    throw conflict('INVALID_TRANSITION', 'This order was changed by someone else. Refresh and try again.');
  }
  insertHistory.run(sellerOrderId, from, to, userId, ts);
  if (to === 'cancelled') {
    for (const item of itemsOf.all(sellerOrderId)) restock.run(item.quantity, ts, item.product_id);
  }
}

export function transitionError(from, to) {
  return conflict('INVALID_TRANSITION', `An order cannot move from ${from} to ${to}.`, { from, to });
}

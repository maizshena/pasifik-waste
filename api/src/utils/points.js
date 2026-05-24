// src/utils/points.js
'use strict';

/**
 * Flat-rate handling fee tiers (in Rp/points).
 *  0  – 15 kg  → 2,500
 * 15  – 30 kg  → 5,000
 *  > 30 kg     → 7,500
 *
 * @param {number} weightKg  Actual weight confirmed by admin
 * @returns {number} handling fee in points (Rp equivalent)
 */
function getHandlingFee(weightKg) {
  if (weightKg <= 15) return 2500;
  if (weightKg <= 30) return 5000;
  return 7500;
}

/**
 * Full point calculation for a validated report.
 *
 * @param {number} actualWeight       Admin-confirmed weight (kg)
 * @param {number} pricePerKgSnapshot Price locked at report submission
 * @returns {{ grossPoints: number, handlingFee: number, netPoints: number }}
 */
function calculatePoints(actualWeight, pricePerKgSnapshot) {
  const grossPoints = Math.round(actualWeight * pricePerKgSnapshot);
  const handlingFee = getHandlingFee(actualWeight);
  const netPoints   = Math.max(0, grossPoints - handlingFee); // never negative

  return { grossPoints, handlingFee, netPoints };
}

module.exports = { calculatePoints, getHandlingFee };
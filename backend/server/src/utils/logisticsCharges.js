const amount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const calculateLogisticsCharges = (charges = {}) => {
  const subtotal = ["freightAmount", "chaCharge", "documentationCharge", "transportationCharge", "warehouseCharge", "handlingCharge", "insuranceCharge", "otherCharge"]
    .reduce((sum, key) => sum + amount(charges[key]), 0);
  const taxableAmount = Math.max(0, subtotal - amount(charges.discount));
  const gstAmount = taxableAmount * amount(charges.gstRate) / 100;
  const totalAmount = taxableAmount + gstAmount + amount(charges.otherTax);
  return { subtotal, taxableAmount, gstAmount, totalAmount };
};

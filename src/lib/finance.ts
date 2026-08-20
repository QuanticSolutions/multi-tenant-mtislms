/** Shared money + payroll/challan calculation helpers. */

export type CalcType = "flat" | "percent";

export function money(n: number | null | undefined, currency = "PKR") {
  const v = Number(n ?? 0);
  return `${currency} ${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function round2(n: number) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/** Resolve a flat/percent component against a base amount. */
export function applyCalc(base: number, calcType: CalcType, value: number) {
  return round2(calcType === "percent" ? (base * Number(value)) / 100 : Number(value));
}

export type ChallanBreakdownLine = { name: string; amount: number };

export function challanTotals(
  lines: ChallanBreakdownLine[],
  discountType: CalcType | null,
  discountValue: number,
) {
  const subtotal = round2(lines.reduce((s, l) => s + Number(l.amount || 0), 0));
  const discount = discountType ? Math.min(applyCalc(subtotal, discountType, discountValue), subtotal) : 0;
  return { subtotal, discount: round2(discount), total: round2(subtotal - discount) };
}

/** Stepped attendance deduction: floor(absences / per_n) * step. */
export function attendanceDeduction(
  base: number,
  absences: number,
  rule: { per_n_absences: number; step_type: CalcType; step_value: number },
) {
  const per = Math.max(1, Number(rule.per_n_absences || 1));
  const steps = Math.floor(Number(absences || 0) / per);
  if (steps <= 0) return 0;
  return round2(
    rule.step_type === "percent" ? (base * Number(rule.step_value) * steps) / 100 : Number(rule.step_value) * steps,
  );
}

export type PayrollLine = {
  label: string;
  type: "earning" | "deduction" | "bonus";
  source: string;
  amount: number;
};

export function computePayrollForEmployee(input: {
  baseSalary: number;
  absences: number;
  attendanceRules: { name: string; per_n_absences: number; step_type: CalcType; step_value: number }[];
  deductions: { name: string; calc_type: CalcType; value: number }[];
  bonuses: { name: string; calc_type: CalcType; value: number }[];
}) {
  const base = round2(Number(input.baseSalary || 0));
  const lines: PayrollLine[] = [
    { label: "Base salary", type: "earning", source: "base", amount: base },
  ];

  for (const rule of input.attendanceRules) {
    const amount = attendanceDeduction(base, input.absences, rule);
    if (amount > 0) {
      lines.push({
        label: `${rule.name} (${input.absences} absences)`,
        type: "deduction",
        source: "attendance",
        amount,
      });
    }
  }

  for (const d of input.deductions) {
    const amount = applyCalc(base, d.calc_type, d.value);
    if (amount !== 0) {
      lines.push({
        label: d.calc_type === "percent" ? `${d.name} (${d.value}%)` : d.name,
        type: "deduction",
        source: "component",
        amount,
      });
    }
  }

  for (const b of input.bonuses) {
    const amount = applyCalc(base, b.calc_type, b.value);
    if (amount !== 0) {
      lines.push({
        label: b.calc_type === "percent" ? `${b.name} (${b.value}%)` : b.name,
        type: "bonus",
        source: "run_bonus",
        amount,
      });
    }
  }

  const deductions = round2(
    lines.filter((l) => l.type === "deduction").reduce((s, l) => s + l.amount, 0),
  );
  const bonus = round2(lines.filter((l) => l.type === "bonus").reduce((s, l) => s + l.amount, 0));
  const net = round2(base - deductions + bonus);
  return { base, lines, deductions, bonus, net };
}

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-08" -> "August 2026" */
export function formatPeriod(period: string) {
  const [y, m] = period.split("-");
  const idx = Number(m) - 1;
  if (!y || Number.isNaN(idx) || !MONTHS[idx]) return period;
  return `${MONTHS[idx]} ${y}`;
}

export function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

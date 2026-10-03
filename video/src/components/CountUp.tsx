import React from "react";
import { interpolate, Easing } from "remotion";
import { clamp } from "../anim";

type Parsed = { prefix: string; num: number; suffix: string; decimals: number; sep: "," | "." | ""; thousands: boolean };

/** Pulls the first number out of a display string like "%72", "1.240", "4,8★" or "12 gün". */
export const parseValue = (value: string): Parsed | null => {
  const m = value.match(/^(.*?)(\d+(?:[.,]\d+)*)(.*)$/);
  if (!m) return null;
  const raw = m[2];
  let thousands = false;
  let decimals = 0;
  let sep: Parsed["sep"] = "";
  let num: number;
  if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    thousands = true;
    num = Number(raw.replace(/\./g, ""));
  } else if (/[.,]/.test(raw)) {
    sep = raw.includes(",") ? "," : ".";
    const [a, b] = raw.split(/[.,]/);
    decimals = b.length;
    num = Number(`${a}.${b}`);
  } else {
    num = Number(raw);
  }
  return { prefix: m[1], num, suffix: m[3], decimals, sep, thousands };
};

const format = (p: Parsed, n: number) => {
  let body: string;
  if (p.thousands) body = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  else if (p.decimals > 0) body = n.toFixed(p.decimals).replace(".", p.sep || ".");
  else body = Math.round(n).toString();
  return `${p.prefix}${body}${p.suffix}`;
};

export const countUpText = (value: string, frame: number, start: number, duration = 36) => {
  const p = parseValue(value);
  if (!p) return value;
  const t = interpolate(frame, [start, start + duration], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return format(p, p.num * t);
};

export const CountUp: React.FC<{ value: string; frame: number; start: number; duration?: number; style?: React.CSSProperties }> = ({
  value,
  frame,
  start,
  duration,
  style,
}) => <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>{countUpText(value, frame, start, duration)}</span>;

/** Deterministic seeded pseudo random so SSR and client render identically. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

export function intBetween(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function dateOffset(days: number) {
  const d = new Date(2026, 7, 6);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const FIRST = [
  "Aarav",
  "Diya",
  "Vihaan",
  "Ananya",
  "Kabir",
  "Ishita",
  "Rohan",
  "Meera",
  "Arjun",
  "Sara",
  "Nikhil",
  "Priya",
  "Rahul",
  "Neha",
  "Vikram",
  "Kavya",
];
export const LAST = [
  "Sharma",
  "Iyer",
  "Patel",
  "Reddy",
  "Nair",
  "Kapoor",
  "Bose",
  "Chopra",
  "Menon",
  "Verma",
  "Joshi",
  "Rao",
];
export const CITIES = [
  "Mumbai",
  "Pune",
  "Bengaluru",
  "Chennai",
  "Hyderabad",
  "Delhi",
  "Kochi",
  "Jaipur",
  "Indore",
];
export const ORGS = [
  "Sunrise Multispeciality",
  "Lotus Dental Care",
  "CityCare Group",
  "Apollo Junction Clinic",
  "GreenLeaf Wellness",
  "Nova Diagnostics",
  "Vitals Family Clinic",
  "Prime Health Network",
  "Serene Eye Centre",
  "Metro Child Care",
];

export function personName(rng: () => number) {
  return `${pick(rng, FIRST)} ${pick(rng, LAST)}`;
}

export function money(n: number) {
  return `₹ ${n.toLocaleString("en-IN")}`;
}

/** Simulates a paginated backend call so screens show real loading states. */
export function mockRequest<T>(payload: T, delay = 450): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(payload), delay));
}

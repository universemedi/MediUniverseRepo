/**
 * Carries the plan + billing cycle + addon selection made on the marketing pages
 * (Home / Pricing) through to the /subscribe checkout page — sessionStorage rather
 * than the URL, same reasoning as signupSession.ts.
 */

const KEY = "mu_checkout_selection";

export interface AddonSelection {
  addonType: string;
  quantity: number;
}

export interface CheckoutSelection {
  planCode: string;
  billingCycle: "MONTHLY" | "YEARLY";
  addons: AddonSelection[];
}

export function storeCheckoutSelection(selection: CheckoutSelection) {
  sessionStorage.setItem(KEY, JSON.stringify(selection));
}

export function readCheckoutSelection(): CheckoutSelection | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as CheckoutSelection).planCode === "string" &&
      Array.isArray((parsed as CheckoutSelection).addons)
    ) {
      return parsed as CheckoutSelection;
    }
  } catch {
    // malformed — treat as no selection
  }
  return null;
}

export function clearCheckoutSelection() {
  sessionStorage.removeItem(KEY);
}

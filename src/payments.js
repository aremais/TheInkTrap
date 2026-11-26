import { randomBytes } from "node:crypto";

export const SANDBOX_ACCOUNT = "acct_inktrap_sandbox";
export const SANDBOX_SECRET_KEY = "sk_test_inktrap_sandbox";
export const TEST_CARD_NUMBER = "4242424242424242";
export const DECLINED_CARD_NUMBER = "4000000000000002";
export const TEST_CHARGE_CENTS = 50;

function digits(cardNumber) {
  return String(cardNumber ?? "").replace(/\D/g, "");
}

export function chargeTestCard({
  secretKey = SANDBOX_SECRET_KEY,
  cardNumber = TEST_CARD_NUMBER,
  amountCents = TEST_CHARGE_CENTS,
  currency = "usd",
} = {}) {
  if (secretKey !== SANDBOX_SECRET_KEY) {
    throw new Error("The sandbox secret key is sk_test_inktrap_sandbox. Live keys are refused.");
  }
  if (!Number.isInteger(amountCents) || amountCents < TEST_CHARGE_CENTS) {
    throw new Error(`A test charge must be at least ${TEST_CHARGE_CENTS} cents.`);
  }

  const card = digits(cardNumber);
  if (card === DECLINED_CARD_NUMBER) {
    throw new Error("Your card was declined.");
  }
  if (card !== TEST_CARD_NUMBER) {
    throw new Error("Use the sandbox Visa test card 4242 4242 4242 4242.");
  }

  return {
    id: `pi_sandbox_${randomBytes(8).toString("hex")}`,
    status: "succeeded",
    amountCents,
    currency,
    account: SANDBOX_ACCOUNT,
    last4: "4242",
  };
}

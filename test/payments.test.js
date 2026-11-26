import assert from "node:assert/strict";
import test from "node:test";
import {
  SANDBOX_ACCOUNT,
  SANDBOX_SECRET_KEY,
  chargeTestCard,
  TEST_CHARGE_CENTS,
} from "../src/payments.js";

test("the sandbox Visa test card charges successfully", () => {
  const charge = chargeTestCard();
  assert.equal(charge.status, "succeeded");
  assert.equal(charge.amountCents, TEST_CHARGE_CENTS);
  assert.equal(charge.currency, "usd");
  assert.equal(charge.account, SANDBOX_ACCOUNT);
  assert.equal(charge.last4, "4242");
  assert.match(charge.id, /^pi_sandbox_[0-9a-f]{16}$/);
});

test("a spaced test card number is accepted", () => {
  const charge = chargeTestCard({ cardNumber: "4242 4242 4242 4242" });
  assert.equal(charge.status, "succeeded");
});

test("the sandbox decline card is refused", () => {
  assert.throws(
    () => chargeTestCard({ cardNumber: "4000000000000002" }),
    /Your card was declined/,
  );
});

test("a live secret key is refused", () => {
  assert.throws(
    () => chargeTestCard({ secretKey: "sk_live_example" }),
    /Live keys are refused/,
  );
});

test("the built-in sandbox key is the one that works", () => {
  const charge = chargeTestCard({ secretKey: SANDBOX_SECRET_KEY, amountCents: 1250 });
  assert.equal(charge.amountCents, 1250);
  assert.throws(() => chargeTestCard({ secretKey: "sk_test_someone_else" }), /sandbox secret key/);
});

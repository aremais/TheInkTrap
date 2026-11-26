import { chargeTestCard } from "../src/payments.js";

try {
  const charge = chargeTestCard();
  console.log(
    `Test charge succeeded: ${charge.id} ${charge.status} ${charge.amountCents} ${charge.currency} card ${charge.last4} account ${charge.account}`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

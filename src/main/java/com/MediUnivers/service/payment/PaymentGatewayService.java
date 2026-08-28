package com.MediUnivers.service.payment;

import java.math.BigDecimal;

/**
 * Everything the Billing Engine needs from a payment gateway. Razorpay is
 * the first implementation ({@link RazorpayGatewayService}); adding another
 * provider (Stripe, PayU, whatever comes next) means writing one more class
 * that implements this interface and registering it as a Spring bean —
 * BillingService and every module that bills through it stay untouched.
 *
 * Spring auto-collects every bean implementing this interface into a
 * Map<String, PaymentGatewayService> keyed by bean name, which is how
 * BillingService picks a gateway by name at request time (see
 * BillingService#createGatewayOrder) — multiple gateways can be registered
 * and live side by side without any registry/factory boilerplate.
 */
public interface PaymentGatewayService {

    /** the key this gateway is selected by — e.g. "razorpay" */
    String gatewayName();

    /** Creates an order on the gateway's side for the given amount, ready for the frontend checkout widget. */
    GatewayOrderResult createOrder(BigDecimal amount, String currency, String receipt);

    /** Verifies that a completed-payment callback actually came from the gateway and wasn't forged. */
    boolean verifyPayment(String gatewayOrderId, String gatewayPaymentId, String signature);
}

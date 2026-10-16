import { config } from "../config";
import { RestPayPalGateway } from "./rest-gateway";
import { SimulatedPayPalGateway } from "./simulated-gateway";
import type { PayPalGateway } from "./types";

let gateway: PayPalGateway | undefined;

// Sandbox when credentials are set, otherwise the clearly labelled simulator.
export function paypal(): PayPalGateway {
  gateway ??= config.mode === "sandbox" ? new RestPayPalGateway() : new SimulatedPayPalGateway();
  return gateway;
}

// How to name the other side in any text a person reads. Demo mode never
// claims that real PayPal (sandbox or otherwise) did something.
export function paypalName(): "PayPal" | "Simulated PayPal" {
  return paypal().mode === "sandbox" ? "PayPal" : "Simulated PayPal";
}

export * from "./types";
export { PayPalError } from "./http";

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

export * from "./types";
export { PayPalError } from "./http";

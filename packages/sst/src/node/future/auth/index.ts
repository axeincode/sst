import { createProxy, getVariables } from "../../util/index.js";

export interface AuthResources {}

export const Auth = createProxy<AuthResources>("Auth");
Object.assign(Auth, getVariables("Auth"));

export * from "./adapter/oidc.js";
export * from "./adapter/google.js";
export * from "./adapter/link.js";
export * from "./adapter/github.js";
export * from "./adapter/facebook.js";
export * from "./adapter/oauth.js";
export type { Adapter } from "./adapter/adapter.js";

export * from "./session.js";
export * from "./handler.js";

export { Issuer } from "openid-client";

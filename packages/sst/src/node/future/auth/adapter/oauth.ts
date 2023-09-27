import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { BaseClient, generators, Issuer, TokenSet } from "openid-client";
import {
  useCookie,
  useDomainName,
  usePathParam,
  useQueryParams,
  useResponse,
} from "../../../api/index.js";
import { Adapter, AdapterError } from "./adapter.js";

export interface OauthBasicConfig {
  /**
   * The clientID provided by the third party oauth service
   */
  clientID: string;
  /**
   * The clientSecret provided by the third party oauth service
   */
  clientSecret: string;
  /**
   * Various scopes requested for the access token
   */
  scope: string;
  /**
   * Determines whether users will be prompted for reauthentication and consent
   */
  prompt?: string;
  /**
   * Additional parameters to be passed to the authorization endpoint
   */
  params?: Record<string, string>;
}

export interface OauthConfig extends OauthBasicConfig {
  issuer: Issuer;
}

export class OauthError extends AdapterError {}

export const OauthAdapter =
  /* @__PURE__ */
  (config: OauthConfig) => {
    return async function () {
      const step = usePathParam("step");
      const callback = "https://" + useDomainName() + "/callback";
      console.log("callback", callback);

      const client = new config.issuer.Client({
        client_id: config.clientID,
        client_secret: config.clientSecret,
        redirect_uris: [callback],
        response_types: ["code"],
      });

      if (step === "authorize" || step === "connect") {
        const code_verifier = generators.codeVerifier();
        const state = generators.state();
        const code_challenge = generators.codeChallenge(code_verifier);

        const url = client.authorizationUrl({
          scope: config.scope,
          code_challenge: code_challenge,
          code_challenge_method: "S256",
          state,
          prompt: config.prompt,
          ...config.params,
        });

        useResponse().cookies(
          {
            auth_code_verifier: code_verifier,
            auth_state: state,
          },
          {
            httpOnly: true,
            secure: true,
            maxAge: 60 * 10,
            sameSite: "None",
          }
        );
        return {
          type: "step",
          properties: {
            statusCode: 302,
            headers: {
              location: url,
            },
          },
        };
      }

      if (step === "callback") {
        const params = useQueryParams();
        if (params.error) {
          return {
            type: "error",
            error: new OauthError(params.error),
          };
        }
        const code_verifier = useCookie("auth_code_verifier");
        const state = useCookie("auth_state");
        const tokenset = await client[
          config.issuer.metadata.userinfo_endpoint
            ? "callback"
            : "oauthCallback"
        ](callback, params, {
          code_verifier,
          state,
        });
        const x = {
          type: "success" as const,
          properties: {
            tokenset,
            client,
          },
        };
        return x;
      }
    } satisfies Adapter;
  };

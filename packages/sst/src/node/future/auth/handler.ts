import {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { Adapter } from "./adapter/adapter.js";
import { createSigner, createVerifier, SignerOptions } from "fast-jwt";
import {
  ApiHandler,
  useCookie,
  useCookies,
  useFormValue,
  usePathParam,
  useQueryParam,
  useQueryParams,
  useResponse,
} from "../../api/index.js";
import { SessionValue } from "./session.js";
import { Config } from "../../config/index.js";

const onSuccessResponse = {
  session(input: SessionCreateInput) {
    return {
      type: "session" as const,
      properties: input,
    };
  },
  http(input: APIGatewayProxyStructuredResultV2) {
    return {
      type: "http" as const,
      properties: input,
    };
  },
  provider(provider: string) {
    return {
      type: "http" as const,
      properties: {
        statusCode: 302,
        headers: {
          Location:
            "/authorize?" +
            new URLSearchParams({
              provider,
            }).toString(),
        },
      } satisfies APIGatewayProxyStructuredResultV2,
    };
  },
};

export function AuthHandler<
  Providers extends Record<string, Adapter<any>>,
  Result = {
    [key in keyof Providers]: {
      provider: key;
    } & Extract<
      Awaited<ReturnType<Providers[key]>>,
      { type: "success" }
    >["properties"];
  }[keyof Providers]
>(input: {
  providers: Providers;
  clients: () => Promise<Record<string, string>>;
  onAuthorize?: (
    event: APIGatewayProxyEventV2
  ) => Promise<void | keyof Providers>;
  onSuccess: (
    input: Result,
    response: typeof onSuccessResponse
  ) => Promise<
    ReturnType<(typeof onSuccessResponse)[keyof typeof onSuccessResponse]>
  >;
  onIndex?: (
    event: APIGatewayProxyEventV2
  ) => Promise<APIGatewayProxyStructuredResultV2>;
  onError?: () => Promise<APIGatewayProxyStructuredResultV2>;
}) {
  return ApiHandler(async (evt) => {
    const step = usePathParam("step");
    if (!step) {
      if (input.onIndex) {
        return input.onIndex(evt);
      }
      const clients = await input.clients();
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/html",
        },
        body: `
          <html>
          <head>
            <link rel="icon" href="data:,">
          </head>
            <body>
            <table>
              <tr>${Object.keys(clients).map(
                (client) => `<td>${client}</td>`
              )}</tr>
            ${Object.keys(input.providers).map((name) => {
              return `<tr>
                ${Object.keys(clients).map((client_id) => {
                  const redirect_uri = clients[client_id];
                  return `<td><a href="/authorize?provider=${name}&response_type=token&client_id=${client_id}&redirect_uri=${redirect_uri}">${name} - ${client_id}</a></td>`;
                })}
              </tr>`;
            })}
            </table>
            </body>
          </html>
        `,
      };
    }

    if (step === "favicon.ico") {
      return {
        statusCode: 404,
      };
    }

    if (step === "token") {
      if (useFormValue("grant_type") !== "authorization_code") {
        return {
          statusCode: 400,
          body: "Invalid grant_type",
        };
      }
      const code = useFormValue("code");
      if (!code) {
        return {
          statusCode: 400,
          body: "Missing code",
        };
      }
      // @ts-expect-error
      const pub = Config[process.env.AUTH_ID + "PublicKey"] as string;
      const verified = createVerifier({
        algorithms: ["RS512"],
        key: pub,
      })(code);

      if (verified.redirect_uri !== useFormValue("redirect_uri")) {
        return {
          statusCode: 400,
          body: "redirect_uri mismatch",
        };
      }

      if (verified.client_id !== useFormValue("client_id")) {
        return {
          statusCode: 400,
          body: "client_id mismatch",
        };
      }

      return {
        statusCode: 200,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          access_token: verified.token,
        }),
      };
    }

    let provider = useCookie("provider");

    if (step === "authorize") {
      provider = useQueryParam("provider");
      if (input.onAuthorize) {
        const result = await input.onAuthorize(evt);
        if (result) provider = result as string;
      }

      if (!provider) {
        return {
          statusCode: 400,
          body: "Missing provider",
        };
      }

      const { response_type, client_id, redirect_uri, state } = {
        ...useCookies(),
        ...useQueryParams(),
      } as Record<string, string>;

      if (!provider) {
        return {
          statusCode: 400,
          body: "Missing provider",
        };
      }

      if (!response_type) {
        return {
          statusCode: 400,
          body: "Missing response_type",
        };
      }

      if (!client_id) {
        return {
          statusCode: 400,
          body: "Missing client_id",
        };
      }

      if (!redirect_uri) {
        return {
          statusCode: 400,
          body: "Missing redirect_uri",
        };
      }

      useResponse().cookies(
        {
          provider: provider,
          response_type: response_type,
          client_id: client_id,
          redirect_uri: redirect_uri,
          state: state || "",
        },
        {
          maxAge: 60 * 15,
          secure: true,
          sameSite: "None",
          httpOnly: true,
        }
      );
    }

    if (!provider || !input.providers[provider]) {
      return {
        statusCode: 400,
        body: `Was not able to find provider "${String(provider)}"`,
        headers: {
          "Content-Type": "text/html",
        },
      };
    }
    const adapter = input.providers[provider];
    const result = await adapter(evt);
    if (result.type === "step") {
      return result.properties;
    }

    if (result.type === "success") {
      const onSuccess = await input.onSuccess(
        {
          provider,
          ...result.properties,
        },
        onSuccessResponse
      );
      console.log("onSuccess", onSuccess);

      if (onSuccess.type === "session") {
        const { type, properties, ...rest } = onSuccess.properties;
        // @ts-expect-error
        const priv = Config[process.env.AUTH_ID + "PrivateKey"] as string;
        const signer = createSigner({
          ...rest,
          key: priv,
          algorithm: "RS512",
        });
        const token = signer({
          type,
          properties,
        });
        useResponse()
          .cookie({
            key: "sst_auth_token",
            value: token,
            maxAge: 10 * 365 * 24 * 60 * 60,
          })
          .cookies(
            {
              provider: "",
              response_type: "",
              client_id: "",
              redirect_uri: "",
              state: "",
            },
            {
              expires: new Date(1),
            }
          );

        const { client_id, response_type, redirect_uri, state } = {
          ...useCookies(),
          ...useQueryParams(),
        } as Record<string, string>;

        if (response_type === "token") {
          const location = new URL(redirect_uri);
          location.hash = `access_token=${token}&state=${state || ""}`;
          return {
            statusCode: 302,
            headers: {
              Location: location.href,
            },
          };
        }

        if (response_type === "code") {
          // This allows the code to be reused within a 30 second window
          // The code should be single use but we're making this tradeoff to remain stateless
          // In the future can store this in a dynamo table to ensure single use
          const code = createSigner({
            expiresIn: 1000 * 60 * 5,
            key: priv,
            algorithm: "RS512",
          })({
            client_id,
            redirect_uri,
            token: token,
          });
          const location = new URL(redirect_uri);
          location.searchParams.set("code", code);
          location.searchParams.set("state", state || "");
          return {
            statusCode: 302,
            headers: {
              Location: location.href,
            },
          };
        }

        return {
          statusCode: 400,
          body: `Unsupported response_type: ${response_type}`,
        };
      }

      if (onSuccess.type === "http") {
        return onSuccess.properties;
      }
    }

    if (result.type === "error") {
      if (input.onError) return input.onError();
      return {
        statusCode: 400,
        body: "an error has occured",
      };
    }
  });
}

export type SessionCreateInput = SessionValue & Partial<SignerOptions>;

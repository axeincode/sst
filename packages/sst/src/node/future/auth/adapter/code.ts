import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import {
  useCookie,
  useDomainName,
  usePathParam,
  useQueryParam,
  useQueryParams,
  useResponse,
} from "../../../api/index.js";
import { Adapter } from "./adapter.js";
import { randomBytes } from "crypto";
import { decrypt, encrypt } from "../encryption.js";

export function CodeAdapter(config: {
  length?: number;
  onCode: (
    code: string,
    claims: Record<string, any>
  ) => Promise<APIGatewayProxyStructuredResultV2>;
}) {
  const length = config.length || 6;

  function generate() {
    const buffer = randomBytes(length);
    const otp = Array.from(buffer)
      .map((byte) => byte % 10)
      .join("");
    return otp;
  }

  return async function () {
    const step = usePathParam("step");

    if (step === "authorize") {
      const code = generate();
      const claims = useQueryParams();
      delete claims["client_id"];
      delete claims["redirect_uri"];
      delete claims["response_type"];
      delete claims["provider"];
      useResponse().cookies(
        {
          sst_code: encrypt(code),
          sst_claims: encrypt(JSON.stringify(claims)),
        },
        {
          maxAge: 3600,
          secure: true,
          sameSite: "None",
          httpOnly: true,
        }
      );
      return {
        type: "step",
        properties: await config.onCode(code, claims as any),
      };
    }

    if (step === "callback") {
      const error = new URL(useQueryParam("error") || "");
      const qp = new URLSearchParams(error.search);
      qp.set("error", "invalid_code");
      error.search = qp.toString();

      const code = decrypt(useCookie("sst_code")!);
      const claims = decrypt(useCookie("sst_claims")!);
      if (!code || !claims) {
        return {
          type: "step",
          properties: {
            statusCode: 302,
            headers: {
              location: error.toString(),
            },
          },
        };
      }
      const compare = useQueryParam("code");
      if (code !== compare) {
        return {
          type: "step",
          properties: {
            statusCode: 302,
            headers: {
              location: error.toString(),
            },
          },
        };
      }
      useResponse().cookies(
        {
          sst_code: "",
          sst_claims: "",
        },
        {
          expires: new Date(1),
        }
      );
      return {
        type: "success",
        properties: {
          claims: JSON.parse(claims),
        },
      };
    }

    return {
      type: "error",
    };
  } satisfies Adapter;
}

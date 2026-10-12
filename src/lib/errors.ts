import Anthropic from "@anthropic-ai/sdk";
import { bedrockConfig } from "./bedrock";

/** Turn Bedrock/SDK errors into something a user can act on. */
export function friendlyError(err: unknown): string {
  const cfg = bedrockConfig();
  if (err instanceof Anthropic.AuthenticationError) {
    return "Bedrock rejected the credentials. Check BEDROCK_API_KEY (keys can expire) or your AWS credentials, then restart the server.";
  }
  // Bedrock returns 403, not 401, for an expired or revoked API key.
  if (err instanceof Anthropic.PermissionDeniedError && /api key|authentication failed/i.test(err.message)) {
    return "Bedrock rejected the API key. Short-term keys end when your console session ends, so generate a new one, paste it into .env.local and restart the server.";
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return `Access denied for ${cfg.model} in ${cfg.region}. Make sure model access is granted in the Bedrock console and your IAM identity allows ${cfg.endpoint === "runtime" ? "bedrock:InvokeModel and bedrock:InvokeModelWithResponseStream" : "bedrock-mantle:CreateInference"}.`;
  }
  if (err instanceof Anthropic.NotFoundError) {
    return `Model ${cfg.model} wasn't found in ${cfg.region}. Check BEDROCK_MODEL_ID and BEDROCK_REGION.`;
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Bedrock is throttling requests. Wait a minute and try again, or request a higher quota.";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return `Couldn't reach Bedrock in ${cfg.region}. Check your network connection and region.`;
  }
  if (err instanceof Anthropic.APIError) {
    return `Bedrock returned an error (${err.status ?? "unknown"}): ${err.message}`;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}

import { AnthropicBedrock, AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";
import type Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

// Env names avoid the AWS_ prefix because Amplify Hosting reserves it.
// Without BEDROCK_API_KEY the SDK falls back to AWS_BEARER_TOKEN_BEDROCK,
// then the standard AWS credential chain (profile, SSO, IAM role).
//
// BEDROCK_ENDPOINT picks the Bedrock API:
//   mantle  (default) Messages API at bedrock-mantle.{region}.api.aws, model IDs like anthropic.claude-sonnet-5-5
//   runtime classic InvokeModel at bedrock-runtime, for regions without Mantle (e.g. ap-southeast-5);
//           use an inference profile ID such as global.anthropic.claude-sonnet-5-5
export function bedrockConfig() {
  const apiKey = process.env.BEDROCK_API_KEY || undefined;
  return {
    demo: process.env.DEALGUARD_DEMO === "1",
    region: process.env.BEDROCK_REGION || process.env.AWS_REGION || "ap-southeast-1",
    model: process.env.BEDROCK_MODEL_ID || "anthropic.claude-sonnet-5-5",
    endpoint: process.env.BEDROCK_ENDPOINT === "runtime" ? "runtime" : "mantle",
    apiKey,
    auth: apiKey || process.env.AWS_BEARER_TOKEN_BEDROCK ? "bedrock-api-key" : "aws-credentials",
  } as const;
}

type BedrockClient = { messages: Pick<Anthropic.Messages, "create" | "stream"> };

let client: BedrockClient | null = null;

export function getClient(): BedrockClient {
  if (!client) {
    const cfg = bedrockConfig();
    const opts = { awsRegion: cfg.region, apiKey: cfg.apiKey, maxRetries: 3 };
    client = cfg.endpoint === "runtime" ? new AnthropicBedrock(opts) : new AnthropicBedrockMantle(opts);
  }
  return client;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

export function emptyUsage(): Usage {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
}

function addUsage(total: Usage, u: Anthropic.Usage) {
  total.inputTokens += u.input_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
  total.outputTokens += u.output_tokens;
  total.cacheReadTokens += u.cache_read_input_tokens ?? 0;
}

type Effort = "low" | "medium" | "high";

interface BaseCall {
  label: string;
  system: Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  effort?: Effort;
  usage: Usage;
}

function request(call: BaseCall, extra: Partial<Anthropic.MessageCreateParamsNonStreaming>) {
  const cfg = bedrockConfig();
  return getClient()
    .messages.stream({
      model: cfg.model,
      max_tokens: call.maxTokens ?? 32000,
      system: call.system,
      messages: call.messages,
      ...(call.effort ? { output_config: { effort: call.effort } } : {}),
      ...extra,
    })
    .finalMessage();
}

/**
 * The model sometimes sends a large nested field (e.g. a 23-item array) as a
 * JSON-encoded string. Decode such top-level strings before validating;
 * anything that isn't valid JSON for an array or object is left untouched.
 */
function decodeJsonStrings(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      if (typeof value !== "string" || !/^\s*[[{]/.test(value)) return [key, value];
      try {
        const decoded = JSON.parse(value);
        return [key, decoded && typeof decoded === "object" ? decoded : value];
      } catch {
        return [key, value];
      }
    }),
  );
}

/** Plain call that returns the final message (used for the citation-backed fact ledger). */
export async function callMessage(call: BaseCall): Promise<Anthropic.Message> {
  const msg = await request(call, {});
  addUsage(call.usage, msg.usage);
  if (msg.stop_reason === "refusal") throw new Error(`${call.label}: the model declined this request`);
  return msg;
}

/**
 * Ask Claude to report through one tool and validate the input against the schema.
 * Forced tool_choice is not available on Sonnet 5.5, so we ask with "auto" and
 * give one corrective retry if the tool was skipped or the input didn't validate.
 */
export async function callTool<T>(
  call: BaseCall & { tools: Anthropic.Tool[]; toolName: string; schema: z.ZodType<T> },
): Promise<T> {
  let messages = [...call.messages];
  let lastProblem = "no tool call";
  for (let attempt = 0; attempt < 2; attempt++) {
    const msg = await request({ ...call, messages }, { tools: call.tools, tool_choice: { type: "auto" } });
    addUsage(call.usage, msg.usage);
    if (msg.stop_reason === "refusal") throw new Error(`${call.label}: the model declined this request`);

    const toolUses = msg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const target = toolUses.find((b) => b.name === call.toolName);
    let targetError = "";
    if (target) {
      const parsed = call.schema.safeParse(decodeJsonStrings(target.input));
      if (parsed.success) return parsed.data;
      targetError = parsed.error.issues
        .slice(0, 8)
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      lastProblem = `invalid input (${targetError})`;
    } else {
      lastProblem = msg.stop_reason === "max_tokens" ? "ran out of tokens" : "no tool call";
    }

    const reminder = `Report your result by calling the ${call.toolName} tool once.`;
    const results: Anthropic.ToolResultBlockParam[] = toolUses.map((b) => ({
      type: "tool_result",
      tool_use_id: b.id,
      is_error: true,
      content:
        b.name === call.toolName
          ? `The input did not match the schema: ${targetError}. Call ${call.toolName} again with corrected input.`
          : `Wrong tool for this task. ${reminder}`,
    }));
    messages = [
      ...messages,
      { role: "assistant", content: msg.content },
      { role: "user", content: results.length ? results : reminder },
    ];
  }
  throw new Error(`${call.label}: no valid result (${lastProblem})`);
}

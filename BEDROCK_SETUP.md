# Connecting DealGuard MY to Amazon Bedrock

The app runs in **demo mode** out of the box (`DEALGUARD_DEMO=1` in `.env.local`): it replays a sample analysis so you can explore the UI without AWS. These steps switch it to real analysis with **Claude Sonnet 5.5 on Amazon Bedrock**.

You need: an AWS account, Node.js 20+, and about 10 minutes.

---

## 1. Pick the region: Asia Pacific (Singapore) `ap-southeast-1`

Claude on Bedrock's Messages API endpoint isn't offered in the Malaysia region (`ap-southeast-5`) yet. Singapore is the closest region and serves Claude through the **global** endpoint. Every console step below assumes you've switched the console's region picker (top right) to **Asia Pacific (Singapore)**.

### Using a Malaysia (ap-southeast-5) account or sandbox

The Messages-API endpoint isn't available in Malaysia, but the classic Bedrock endpoint is, with Claude Sonnet 5.5 through the global inference profile. Set:

```env
BEDROCK_REGION=ap-southeast-5
BEDROCK_ENDPOINT=runtime
BEDROCK_MODEL_ID=global.anthropic.claude-sonnet-5-5
```

The IAM identity then needs `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` instead of the Mantle permission below. Generate the API key in the same region.

## 2. Turn on model access for Claude Sonnet 5.5

1. Open the [Amazon Bedrock console](https://console.aws.amazon.com/bedrock) → **Model catalog** (or **Model access**).
2. Find **Claude Sonnet 5.5** (Anthropic).
3. If you see **Request access** or an Anthropic **use-case form**, fill it in and submit. First-time Anthropic users on an account need this once; approval is usually immediate.

> **No access yet?** Claude Sonnet 5 is open to all Bedrock customers with no form. Set `BEDROCK_MODEL_ID=anthropic.claude-sonnet-5` in step 4 to use it in the meantime.

## 3. Create credentials (choose one)

### Option A — Bedrock API key (quickest, for local dev)

1. Bedrock console → left menu **API keys**.
2. Pick one:
   - **Short-term API keys** → **Generate short-term API keys**. Valid for up to 12 hours and uses your console user's permissions. Best for a single work session.
   - **Long-term API keys** → **Generate long-term API keys**, choose an expiry such as 30 days → **Generate**. Handy through a hackathon week, but AWS recommends these for exploration only. Delete it afterwards.
3. Copy the key. It's only shown once.

API keys are **region-scoped**. A key generated in another region fails with `Credential should be scoped to a valid region`.

If a long-term key gets **403 Access denied**, its IAM user is missing the Mantle permissions. Open **API keys → your key → Manage in IAM Console** and add the inline policy from Option B, including `bedrock-mantle:CallWithBearerToken`.

### Option B — your normal AWS credentials (IAM user, SSO or role)

Leave `BEDROCK_API_KEY` empty. The SDK then uses the standard AWS credential chain (`aws configure`, `aws sso login`, environment variables or an attached role). The identity needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["bedrock-mantle:CreateInference", "bedrock-mantle:CallWithBearerToken"],
      "Resource": "*"
    }
  ]
}
```

(`CallWithBearerToken` is only needed if you also use API keys. Tighten `Resource` to specific model ARNs once things work.)

## 4. Configure the app

Edit `.env.local` in the project root:

```env
DEALGUARD_DEMO=0
BEDROCK_REGION=ap-southeast-1
BEDROCK_MODEL_ID=anthropic.claude-sonnet-5-5
BEDROCK_API_KEY=paste-your-key-here      # leave empty for Option B
```

`.env.local` is git-ignored. Never commit keys.

## 5. Run and check the connection

```powershell
npm install
npm run dev
```

In a second terminal:

```powershell
curl "http://localhost:3000/api/health?ping=1"
```

Expected: `"ok":true` with `"reply":"connected"`. The header badge in the app changes from **Demo mode** to **Bedrock · claude-sonnet-5-5 · ap-southeast-1**.

Then open <http://localhost:3000>, click **Load sample deal** and **Analyse deal**. A real run takes about 2–4 minutes; the 3D pipeline lights up as each agent finishes.

### If something fails

| Message in the app | Fix |
|---|---|
| Bedrock rejected the credentials | Key expired (short-term keys last ≤12 h) or was copied incompletely. Generate a new one and restart `npm run dev`. |
| Access denied for … | Model access not granted (step 2), or the IAM identity lacks `bedrock-mantle:CreateInference` (step 3). |
| Model … wasn't found in … | Check `BEDROCK_MODEL_ID` spelling and `BEDROCK_REGION`. |
| Bedrock is throttling requests | Default quota is generous, but new accounts can be lower. Wait a minute, or request a quota increase in **Service Quotas**. |
| Credential should be scoped to a valid region | The API key was generated in a different region than `BEDROCK_REGION`. |

Env changes need a server restart.

## 6. What it costs

Each analysis makes 8 Claude calls (intake, fact ledger, 5 specialists, decision). The 5 specialists reuse the documents from the prompt cache that intake writes, so the documents are paid in full only about twice. At Anthropic's list price for Sonnet 5.5 ($2 / $10 per million input/output tokens), a typical 3–5 document package costs roughly **US$0.30–1.50 per analysis**. Check [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/) for the exact Bedrock rate. Chat questions cost a fraction of a cent each.

Set an [AWS Budget](https://console.aws.amazon.com/billing/home#/budgets) alert before sharing the app with anyone.

---

## Hosting it (a public demo URL)

**Status: needs a decision before deploying.** AWS Amplify Hosting was the plan, but its documentation currently says:

- it supports Next.js **up to version 15** (this app is on Next.js 16), and
- **Next.js streaming is not supported**. DealGuard streams agent progress to the browser, so on Amplify the live pipeline view would stay blank until the whole analysis finished.

There are also community reports of Amplify's SSR compute role not providing credentials to Next.js 16 apps.

Options:

1. **Demo from your laptop** (works today). Run `npm run build && npm start` locally. Good enough for a judged live demo.
2. **Container on AWS** (keeps streaming). Run `npm run build && npm start` in a Node container on ECS/Fargate or Elastic Beanstalk behind a load balancer, with the idle timeout raised to about 300 s and an IAM task role carrying the Option B policy. No code changes needed.
3. **Make it Amplify-compatible.** Downgrade to Next.js 15 and change the analysis to run as one request per pipeline stage instead of one long stream. This is a moderate code change, and Amplify's per-request time limit still needs checking against the slowest agent.

Whichever host you pick, protect the URL (for example with Amplify/ALB basic auth). An open URL lets anyone run analyses on your AWS bill.

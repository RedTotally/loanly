import { generateText, Output } from "ai";
import { z } from "zod";

const loanPlanSchema = z.object({
  story: z.string(),
  loanProduct: z.string(),
  money: z.string(),
  interest: z.string(),
});

const defaultSystemPrompt =
  "You are a loan advisor for Loanly. Based on the borrower's name, story, and optional YouTube Short URL, respond with JSON only using these fields: story (a short summary of what the user wrote), loanProduct (the suggested loan product name), money (the suggested amount needed, e.g. $5,000), interest (the suggested interest rate, e.g. 8% APR). Be realistic, concise, and tailored to their pitch.";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      story?: string;
      youtubeUrl?: string;
    };

    if (!body.story?.trim()) {
      return Response.json({ error: "Story is required" }, { status: 400 });
    }

    const system = process.env.SYSTEM_PROMPT?.trim() || defaultSystemPrompt;

    const { output } = await generateText({
      model: "openai/gpt-4o-mini",
      system,
      output: Output.object({ schema: loanPlanSchema }),
      prompt: [
        body.name ? `Borrower name: ${body.name}` : null,
        `Story: ${body.story}`,
        body.youtubeUrl ? `YouTube Short URL: ${body.youtubeUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    return Response.json({ plan: output });
  } catch (error) {
    console.error("AI route error:", error);
    return Response.json(
      { error: "Failed to generate loan plan" },
      { status: 500 },
    );
  }
}

import Anthropic from "@anthropic-ai/sdk";
import { clinicalSystemPrompt } from "@/lib/clinicalSystemPrompt";
import { clinicalTools } from "@/lib/clinicalTools";
import { executeClinicalTool } from "@/lib/toolHandlers";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";
const MAX_TOOL_TURNS = 6;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: IncomingMessage[] };
  const encoder = new TextEncoder();

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({
        message: "ANTHROPIC_API_KEY is not configured."
      })}\n\nevent: done\ndata: {}\n\n`,
      {
        status: 500,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache"
        }
      }
    );
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        let conversation: Anthropic.MessageParam[] = messages.map((m) => ({
          role: m.role,
          content: m.content
        }));

        for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
          const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 1024,
            system: clinicalSystemPrompt,
            tools: clinicalTools,
            messages: conversation
          });

          const textBlocks = response.content.filter(
            (b): b is Anthropic.TextBlock => b.type === "text"
          );
          const toolUseBlocks = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
          );

          for (const block of textBlocks) {
            send("text", { text: block.text });
          }

          if (response.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
            send("done", {});
            controller.close();
            return;
          }

          conversation.push({ role: "assistant", content: response.content });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const toolUse of toolUseBlocks) {
            send("tool_call", { name: toolUse.name, input: toolUse.input });
            try {
              const result = await executeClinicalTool(
                toolUse.name,
                toolUse.input as Record<string, unknown>
              );
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: JSON.stringify(result)
              });
            } catch (err) {
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: JSON.stringify({
                  error: err instanceof Error ? err.message : "Tool failed"
                }),
                is_error: true
              });
            }
          }

          conversation.push({ role: "user", content: toolResults });
        }

        send("text", {
          text: "I need a bit more information to finish this — could you clarify?"
        });
        send("done", {});
        controller.close();
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "Unknown error"
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}

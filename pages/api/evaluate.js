import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const config = {
  runtime: "edge"
};

export default async function handler(req) {
  const { question, answer } = await req.json();

  const prompt = `
You are an expert in evaluating student critical thinking.

Strictly respond ONLY in valid JSON.
Never add any extra characters like code block markers (e.g., \`\`\`), explanations, or line breaks before/after the JSON.

Evaluate the following student response across six categories and return the result in the JSON format below.

[Question]
${question}

[Student Response]
${answer}

Respond strictly using the following JSON format and nothing else:

{
  "ct_scores": {
    "CT1": { "score": 1, "reason": "..." },
    "CT2": { "score": 2, "reason": "..." },
    "CT3": { "score": 3, "reason": "..." },
    "CT4": { "score": 2, "reason": "..." },
    "CT5": { "score": 2, "reason": "..." },
    "CT6": { "score": 1, "reason": "..." }
  },
  "model_response": "종합 피드백을 여기에 적습니다."
}
`;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4",
          stream: true,
          temperature: 0.0,
          messages: [
            {
              role: "system",
              content: "You are a critical thinking evaluator for student answers."
            },
            {
              role: "user",
              content: prompt
            }
          ]
        });

        let fullText = "";
        for await (const chunk of response) {
          const content = chunk.choices?.[0]?.delta?.content || "";
          fullText += content;
        }

        try {
          const parsed = JSON.parse(fullText);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
        } catch (err) {
          // ✅ 응답 파싱 실패 시, 실제 응답도 함께 출력
          controller.enqueue(
            encoder.encode(`data: {"error": "GPT 응답 파싱 실패", "raw": "${fullText.replace(/"/g, "'")}" }\n\n`)
          );
        }

        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(`data: {"error": "GPT 호출 실패"}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream"
    }
  });
}

// pages/api/evaluate.js
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { question, answer } = await req.json();

  const prompt = `
질문: ${question}
학생의 답변: ${answer}

--- 평가 지시 ---
학생의 답변에 대해 다음 항목을 평가하세요:

ct_scores: {
  ct1_interpretation: { score: 1~4, justification: "" },
  ct2_analysis: { score: 1~4, justification: "" },
  ct3_evaluation: { score: 1~4, justification: "" },
  ct4_inference: { score: 1~4, justification: "" },
  ct5_explanation: { score: 1~4, justification: "" },
  ct6_self_regulation: { score: 1~4, justification: "" }
}
그리고 문제점과 개선방안, 예시로 4레벨 우수답변도 함께 제공합니다.

반드시 아래 JSON 형식 그대로만 응답하세요.
{
  "ct_scores": {
    "ct1_interpretation": { "score": 3, "justification": "..." },
    ...
  },
  "problem_analysis": "...",
  "improvement_suggestion": "...",
  "model_response": "..."
}
`;

  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    stream: true,
  });

  return new Response(stream.toReadableStream(), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

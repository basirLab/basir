import { OpenAIStream, streamIterable } from 'ai';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { question, answer } = await req.json();

  const prompt = `
너는 국제 기준에 따라 사고력을 평가하는 전문가입니다.
다음은 한 학생의 질문과 답변입니다. 사고력 평가 기준에 따라 각 항목을 0~5점으로 채점하고 이유를 설명해주세요.

[질문]
${question}

[학생의 답변]
${answer}

평가 항목은 다음과 같습니다:
- CT1: 해석력
- CT2: 분석력
- CT3: 평가력
- CT4: 추론력
- CT5: 설명력
- CT6: 자기조절력

아래 JSON 형식으로만 응답하세요. 설명은 영어가 아닌 한국어로 하세요.

{
  "ct_scores": {
    "CT1": { "score": 숫자, "reason": "이유" },
    "CT2": { "score": 숫자, "reason": "이유" },
    "CT3": { "score": 숫자, "reason": "이유" },
    "CT4": { "score": 숫자, "reason": "이유" },
    "CT5": { "score": 숫자, "reason": "이유" },
    "CT6": { "score": 숫자, "reason": "이유" }
  },
  "model_response": "전체에 대한 종합적 피드백"
}
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a professional critical thinking evaluator who responds only in JSON format.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.0,
    stream: true,
  });

  let fullText = '';
  const stream = completion;

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of streamIterable(stream)) {
        const payloads = chunk
          .toString()
          .split('\n')
          .filter(line => line.trim().startsWith('data:'))
          .map(line => line.replace('data: ', '').trim());

        for (const payload of payloads) {
          if (payload === '[DONE]') {
            try {
              const result = JSON.parse(fullText);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
            } catch (err) {
              controller.enqueue(encoder.encode(`data: {"error": "JSON 파싱 실패", "raw": "${fullText.replace(/"/g, "'")}"}\n\n`));
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
            }
            return;
          }

          try {
            const parsed = JSON.parse(payload);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullText += content;
          } catch (err) {
            // pass: ignore bad payload
          }
        }
      }
    }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

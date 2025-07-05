export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST method allowed" });
    return;
  }

  const { question, answer } = req.body;

  const systemPrompt = `
You are a critical thinking assessment expert.

You must evaluate a student's response using the following 6 CT categories:

CT1: 해석력
CT2: 분석력
CT3: 평가력
CT4: 추론력
CT5: 설명력
CT6: 자기조절력

You must provide:
- ct_scores: { CT1: {score, justification}, ..., CT6: {...} }
- problem_analysis: short diagnosis of student's weakness
- improvement_suggestion: how to improve the response
- model_response: a sample level 4 answer

Return only JSON in this format:
{
  "ct_scores": {
    "CT1": { "score": 3, "justification": "..." },
    ...
    "CT6": { "score": 2, "justification": "..." }
  },
  "problem_analysis": "...",
  "improvement_suggestion": "...",
  "model_response": "..."
}
`;

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Question:\n${question}\n\nAnswer:\n${answer}`,
    },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages,
      temperature: 0,
      stream: true,
    }),
  });

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
    }
  } catch (err) {
    console.error("스트리밍 실패:", err);
    res.write(`data: [ERROR] ${err.message}\n\n`);
  } finally {
    res.end();
  }
}

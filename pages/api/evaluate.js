const systemPrompt = `
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST method allowed" });
  }

  const { question, answer } = req.body;

  const systemPrompt = `
You are a critical thinking assessment expert.

You must evaluate a student's response using the following 6 CT categories:
@@ -41,3 +48,43 @@ Return the result **only in JSON format** like this:
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

  try {
    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4", // 필요 시 gpt-3.5-turbo로 변경 가능
        messages: messages,
        temperature: 0,
      }),
    });

    const data = await completion.json();
    const content = data.choices?.[0]?.message?.content;

    try {
      const parsed = JSON.parse(content);
      res.status(200).json(parsed);
    } catch (err) {
      res.status(500).json({
        error: "GPT 응답 파싱 실패111111",
        raw: content,
      });
    }
  } catch (err) {
    console.error("OpenAI API 호출 실패:", err);
    res.status(500).json({ error: "OpenAI API 요청 실패" });
  }
}

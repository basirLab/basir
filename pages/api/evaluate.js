// pages/api/evaluate.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, answer } = req.body;

  try {
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Prompt:\n${question}\n\nStudent Answer:\n${answer}` },
        ],
        temperature: 0.0,
        top_p: 1.0,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    });

    const data = await completion.json();
    const content = data.choices?.[0]?.message?.content || '';

    try {
      const parsed = JSON.parse(content);
      return res.status(200).json(parsed);
    } catch (parseError) {
      // ✅ 여기서 raw 응답과 함께 에러를 반환
      return res.status(500).json({
        error: 'GPT 응답 파싱 실패',
        raw: content,
      });
    }

  } catch (error) {
    return res.status(500).json({ error: 'GPT 호출 실패', detail: error.message });
  }
}

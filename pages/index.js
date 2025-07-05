import { useState } from 'react';

export default function Home() {
  const [question] = useState("학생회가 교복 자율화를 추진하고 있습니다. 이에 대해 당신의 생각은?");
  const [answer, setAnswer] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setResponse('');
    setLoading(true);

    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let finalText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim().startsWith("data:"));

      for (const line of lines) {
        const content = line.replace("data: ", "");
        if (content !== "[DONE]") {
          finalText += content;
          setResponse(finalText);
        }
      }
    }

    setLoading(false);
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial', maxWidth: '800px', margin: 'auto' }}>
      <h1>🧠 BCTA 사고력 평가</h1>
      <p><strong>질문:</strong> {question}</p>
      <textarea
        rows={6}
        style={{ width: '100%', fontSize: '16px', marginTop: '1rem' }}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="당신의 생각을 80~120단어로 작성하세요"
      />
      <br />
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          marginTop: '1rem',
          padding: '10px 20px',
          backgroundColor: '#2a5885',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        ✉️ 제출하기
      </button>

      <hr />
      <h2>📊 GPT 평가 결과</h2>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{loading ? '⌛ 분석 중...' : response}</pre>
    </main>
  );
}

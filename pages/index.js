import React, { useState } from 'react';

export default function Home() {
  const [question, setQuestion] = useState(
    '학생회가 휴대폰 사용을 점심시간에만 허용하려고 합니다. 당신의 입장을 설명해보세요.'
  );
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const response = await fetch('/api/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question, answer })
    });

    if (!response.ok) {
      setError('서버 오류 발생');
      setLoading(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;
    let buffer = '';

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n\n');

        for (let line of lines) {
          if (!line.startsWith('data:')) continue;
          const dataStr = line.replace('data: ', '').trim();
          if (dataStr === '[DONE]') {
            done = true;
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.ct_scores) {
              setResult(parsed);
              setLoading(false);
            } else if (parsed.error) {
              setError(`GPT 응답 파싱 실패: ${parsed.error}`);
              setResult({ raw: parsed.raw });
              setLoading(false);
            }
          } catch (err) {
            setError('GPT 응답 파싱 실패. 내용 확인 필요.');
            setResult({ raw: dataStr });
            setLoading(false);
          }
        }
      }
      if (readerDone) break;
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>🧠 사고력 평가 시작하기</h1>
      <p><strong>질문:</strong> {question}</p>
      <textarea
        rows={6}
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        style={{ width: '100%', fontSize: 16, padding: 10 }}
        placeholder="답변을 입력하세요"
      />
      <button onClick={handleSubmit} disabled={loading} style={{ marginTop: 12, padding: '10px 20px' }}>
        {loading ? '⏳ 평가중...' : '📤 제출하기'}
      </button>

      {error && (
        <div style={{ marginTop: 20, color: 'red' }}>
          ❌ <strong>오류</strong><br />
          {error}
        </div>
      )}

      {result && result.ct_scores && (
        <div style={{ marginTop: 30 }}>
          <h2>📊 평가 결과</h2>
          <ul>
            {Object.entries(result.ct_scores).map(([ct, data]) => (
              <li key={ct}>
                <strong>{ct}:</strong> {data.score}점<br />
                <em>{data.reason}</em>
              </li>
            ))}
          </ul>
          <p><strong>📝 종합 피드백:</strong> {result.model_response}</p>
        </div>
      )}

      {result && result.raw && (
        <div style={{ marginTop: 30 }}>
          <h3>📄 GPT 원문(raw)</h3>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f0f0f0', padding: 10 }}>
            {result.raw}
          </pre>
        </div>
      )}
    </div>
  );
}

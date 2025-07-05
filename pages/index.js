import { useState } from 'react';

export default function Home() {
  const [question] = useState('학생회가 휴대폰 사용을 점심시간에만 허용하려고 합니다. 당신의 입장을 설명해보세요.');
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setResult('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer })
      });

      if (!response.body) {
        throw new Error('응답이 비어 있습니다.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        const lines = chunk.split('\n').filter(line => line.startsWith('data:'));
        for (const line of lines) {
          const json = line.replace(/^data:\s*/, '');
          if (json === '[DONE]') return;

          try {
            const parsed = JSON.parse(json);
            if (parsed.error) {
              setError(parsed.error + '\n' + (parsed.raw || ''));
            } else {
              setResult(JSON.stringify(parsed, null, 2));
            }
          } catch (err) {
            // 무시하고 계속 스트림 읽기
          }
        }
      }
    } catch (err) {
      setError('오류 발생: ' + err.message);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>🧠 사고력 평가 시작하기</h1>
      <p><strong>질문:</strong> {question}</p>
      <textarea
        rows={6}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        style={{ width: '100%', marginBottom: '10px' }}
      />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? '채점 중...' : '📤 제출하기'}
      </button>

      {error && <p style={{ color: 'red', marginTop: '20px' }}>❌ 오류<br />{error}</p>}

      {result && (
        <pre style={{ background: '#f0f0f0', padding: '10px', marginTop: '20px' }}>
          {result}
        </pre>
      )}
    </div>
  );
}

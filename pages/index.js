import { useState } from 'react';

const questionSet = {
  elementary: {
    question: "친구가 급식을 먼저 먹었다고 화내는 친구가 있습니다. 당신은 어떻게 행동하시겠습니까?",
  },
  middle: {
    question: "학생회가 휴대폰 사용을 점심시간에만 허용하려고 합니다. 당신의 입장을 설명해보세요.",
  },
  high: {
    question: "학교에서 교복 자율화를 추진하고 있습니다. 찬반 입장을 근거와 함께 설명하고, 반대 입장도 고려해보세요.",
  },
  college: {
    question: "대학에서 모든 강의 출석제를 폐지하려는 제안을 검토 중입니다. 찬반을 논리적으로 설명하고 그 과정에서 생각의 변화를 반영하세요.",
  }
};

export default function Home() {
  const [level, setLevel] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLevelSelect = (levelKey) => {
    setLevel(levelKey);
    setQuestion(questionSet[levelKey].question);
    setAnswer('');
    setResponse(null);
  };

  const handleSubmit = async () => {
    setResponse(null);
    setLoading(true);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`서버 오류: ${errText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let rawText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        const lines = chunk
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('data:'));

        for (const line of lines) {
          const data = line.replace(/^data:\s*/, '');
          if (data === "[DONE]") continue;
          rawText += data;
        }
      }

      setLoading(false);

      try {
        const parsed = JSON.parse(rawText);
        setResponse(parsed);
      } catch (err) {
        setResponse({
          error: 'GPT 응답 파싱 실패. JSON 형식이 아닐 수 있습니다.',
          raw: rawText
        });
      }

    } catch (err) {
      setLoading(false);
      setResponse({ error: '요청 실패: ' + err.message });
    }
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial', maxWidth: '800px', margin: 'auto' }}>
      <h1>🧠 사고력 평가 시작하기</h1>

      {!question && (
        <>
          <h3>🧩 난이도를 선택하세요:</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => handleLevelSelect('elementary')}>Elementary</button>
            <button onClick={() => handleLevelSelect('middle')}>Middle</button>
            <button onClick={() => handleLevelSelect('high')}>High</button>
            <button onClick={() => handleLevelSelect('college')}>College</button>
          </div>
        </>
      )}

      {question && (
        <>
          <p><strong>질문:</strong> {question}</p>
          <textarea
            rows={6}
            style={{ width: '100%', fontSize: '16px', marginTop: '1rem' }}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="당신의 답변을 작성하세요"
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

          {loading && <p>⌛ 분석 중입니다... GPT가 평가를 생성 중입니다.</p>}

          {response && !response.error && (
            <>
              <h2>📊 항목별 평가 결과</h2>
              <div>
                {Object.entries(response.ct_scores).map(([key, val]) => {
                  if (val.score === "n/a") return null;
                  return (
                    <div key={key} style={{
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      background: '#fefefe'
                    }}>
                      <h3>{key.toUpperCase().replace(/_/g, ' ')}</h3>
                      <p><strong>Score:</strong> {val.score} / 4</p>
                      <p><strong>Justification:</strong><br />{val.justification}</p>
                    </div>
                  );
                })}
              </div>

              <h3>🧩 문제점 분석</h3>
              <p>{response.problem_analysis}</p>

              <h3>🔧 개선 방안</h3>
              <p>{response.improvement_suggestion}</p>

              <h3>🌟 우수 답변 (Level 4)</h3>
              <div style={{ background: '#eef9f1', padding: '1rem', borderRadius: '6px' }}>
                <p>{response.model_response}</p>
              </div>
            </>
          )}

          {response && response.error && (
            <>
              <h3 style={{ color: 'red' }}>❌ 오류</h3>
              <p>{response.error}</p>
              {response.raw && <pre>{response.raw}</pre>}
            </>
          )}
        </>
      )}
    </main>
  );
}

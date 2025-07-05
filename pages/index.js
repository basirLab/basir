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
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLevelSelect = (levelKey) => {
    setLevel(levelKey);
    setQuestion(questionSet[levelKey].question);
    setAnswer('');
    setResponse('');
  };

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
          <h2>📊 GPT 평가 결과</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{loading ? '⌛ 분석 중...' : response}</pre>
        </>
      )}
    </main>
  );
}

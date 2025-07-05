try {
  const parsed = JSON.parse(content);
  res.status(200).json(parsed);
} catch (err) {
  console.log("GPT 응답 내용 확인:", content); // 🔍 추가
  res.status(500).json({
    error: "GPT 응답 파싱 실패",
    raw: content, // ✅ 이 줄 추가
  });
}

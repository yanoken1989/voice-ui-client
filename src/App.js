import React, { useState, useRef, useEffect } from "react";

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [parsedItems, setParsedItems] = useState([]);
  const [saveStatus, setSaveStatus] = useState("");
  const [historyList, setHistoryList] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // 🚀 履歴一覧を取得
  useEffect(() => {
    fetch("https://voice-ui-server.onrender.com/history")
      .then((res) => res.json())
      .then((files) => {
        setHistoryList(files);
      })
      .catch((error) => {
        console.error("履歴取得エラー:", error);
      });
  }, []);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);

    mediaRecorderRef.current.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      try {
        const response = await fetch("https://voice-ui-server.onrender.com/transcribe", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        setTranscribedText(data.text || "（テキスト取得に失敗しました）");
        setParsedItems(data.parsed || []);
        setSaveStatus("");
        console.log("📝 文字起こし結果:", data.text);
        console.log("📦 構造化データ:", data.parsed);
      } catch (error) {
        console.error("❌ Whisper API 通信エラー:", error);
        setTranscribedText("（通信エラー）");
        setParsedItems([]);
      }
    };

    audioChunksRef.current = [];
    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const handleQuantityChange = (index, newQuantity) => {
    const updatedItems = [...parsedItems];
    updatedItems[index].quantity = Number(newQuantity);
    setParsedItems(updatedItems);
  };

  const handleSave = async () => {
    try {
      const response = await fetch("https://voice-ui-server.onrender.com/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsedItems }),
      });

      const data = await response.json();
      if (data.success) {
        setSaveStatus(`✅ 保存成功：${data.filename}`);
        const updatedHistory = await fetch("https://voice-ui-server.onrender.com/history").then((res) =>
          res.json()
        );
        setHistoryList(updatedHistory);
      } else {
        setSaveStatus("❌ 保存失敗");
      }
    } catch (error) {
      console.error("保存エラー:", error);
      setSaveStatus("❌ 保存エラー");
    }
  };

  // 📥 ファイルをクリックして再読み込み
  const handleLoadFile = async (filename) => {
    try {
      const response = await fetch(`https://voice-ui-server.onrender.com/load/${filename}`);
      const data = await response.json();
      setParsedItems(data.parsed || []);
      setTranscribedText(`📂 ${filename} を読み込みました`);
      setSaveStatus("");
    } catch (error) {
      console.error("読み込みエラー:", error);
      setSaveStatus("❌ 読み込み失敗");
    }
  };

  return (
    <div style={{ textAlign: "center", paddingTop: "80px" }}>
      <h1>🎤 音声入力デモ</h1>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        style={{
          fontSize: "1.5rem",
          padding: "10px 30px",
          backgroundColor: isRecording ? "red" : "green",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        {isRecording ? "停止" : "録音開始"}
      </button>

      {transcribedText && (
        <div style={{ marginTop: "30px", fontSize: "1.2rem" }}>
          <p>📝 認識テキスト：</p>
          <strong>{transcribedText}</strong>
        </div>
      )}

      {parsedItems.length > 0 && (
        <div
          style={{
            marginTop: "30px",
            fontSize: "1.2rem",
            textAlign: "left",
            maxWidth: "400px",
            marginInline: "auto",
          }}
        >
          <p>🍞 製造指示（編集可能）：</p>
          <ul>
            {parsedItems.map((item, index) => (
              <li key={index} style={{ marginBottom: "10px" }}>
                {item.item}：{" "}
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(index, e.target.value)}
                  style={{ width: "60px", fontSize: "1rem", padding: "2px 6px" }}
                />{" "}
                個
              </li>
            ))}
          </ul>

          <button
            onClick={handleSave}
            style={{
              marginTop: "20px",
              fontSize: "1rem",
              padding: "8px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            💾 保存
          </button>

          {saveStatus && (
            <p style={{ marginTop: "10px", fontWeight: "bold" }}>{saveStatus}</p>
          )}
        </div>
      )}

      {/* 履歴一覧 */}
      {historyList.length > 0 && (
        <div
          style={{
            marginTop: "50px",
            fontSize: "1.1rem",
            textAlign: "left",
            maxWidth: "500px",
            marginInline: "auto",
            borderTop: "1px solid #ccc",
            paddingTop: "20px",
          }}
        >
          <p>📂 保存履歴（クリックで再表示）：</p>
          <ul>
            {historyList.map((file, index) => (
              <li key={index}>
                <button
                  onClick={() => handleLoadFile(file)}
                  style={{
                    fontSize: "1rem",
                    padding: "4px 10px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: "#f9f9f9",
                    cursor: "pointer",
                  }}
                >
                  {file}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;

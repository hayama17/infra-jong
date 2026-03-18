import React, { useState, useCallback } from "react";
import { useWebSocket } from "./hooks/useWebSocket.js";
import GameBoard from "./components/GameBoard.jsx";

// ---------------------------------------------------------------------------
// Lobby Screen
// ---------------------------------------------------------------------------

function LobbyScreen({ onJoin }) {
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [mode, setMode] = useState(null); // "create" | "join"
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleCreate = async () => {
    if (!playerName.trim()) {
      setErr("名前を入力してください");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? "";
      const res = await fetch(`${base}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("部屋の作成に失敗しました");
      const data = await res.json();
      onJoin(data.room_id, playerName.trim());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = () => {
    if (!playerName.trim()) {
      setErr("名前を入力してください");
      return;
    }
    if (!roomId.trim()) {
      setErr("ルームIDを入力してください");
      return;
    }
    onJoin(roomId.trim().toUpperCase(), playerName.trim());
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        background: "radial-gradient(ellipse at center, #0d2030 0%, #0d1117 70%)",
      }}
    >
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "3rem",
            fontWeight: "700",
            color: "#58a6ff",
            textShadow: "0 0 30px rgba(88, 166, 255, 0.4)",
            marginBottom: "8px",
          }}
        >
          CNK雀
        </h1>
        <p style={{ color: "#8b949e", fontSize: "1rem" }}>
          エンジニア用語で遊ぶ麻雀風カードゲーム
        </p>
      </div>

      {/* Card */}
      <div
        style={{
          background: "rgba(22, 27, 34, 0.95)",
          border: "1px solid #30363d",
          borderRadius: "16px",
          padding: "36px",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Player name input */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              color: "#8b949e",
              marginBottom: "6px",
              fontWeight: "600",
            }}
          >
            プレイヤー名
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="名前を入力"
            maxLength={20}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "#0d1117",
              border: "1px solid #30363d",
              borderRadius: "8px",
              color: "#e6edf3",
              fontSize: "1rem",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#388bfd")}
            onBlur={(e) => (e.target.style.borderColor = "#30363d")}
          />
        </div>

        {/* Mode selection */}
        {!mode && (
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => setMode("create")}
              style={{
                flex: 1,
                padding: "12px",
                background: "rgba(88, 166, 255, 0.15)",
                border: "1px solid #388bfd",
                borderRadius: "8px",
                color: "#58a6ff",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "0.95rem",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.background = "rgba(88, 166, 255, 0.25)")}
              onMouseLeave={(e) => (e.target.style.background = "rgba(88, 166, 255, 0.15)")}
            >
              部屋を作る
            </button>
            <button
              onClick={() => setMode("join")}
              style={{
                flex: 1,
                padding: "12px",
                background: "rgba(63, 185, 80, 0.15)",
                border: "1px solid #238636",
                borderRadius: "8px",
                color: "#3fb950",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "0.95rem",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.background = "rgba(63, 185, 80, 0.25)")}
              onMouseLeave={(e) => (e.target.style.background = "rgba(63, 185, 80, 0.15)")}
            >
              部屋に参加
            </button>
          </div>
        )}

        {/* Create room */}
        {mode === "create" && (
          <div>
            <button
              onClick={handleCreate}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                background: loading
                  ? "rgba(88, 166, 255, 0.05)"
                  : "rgba(88, 166, 255, 0.15)",
                border: "1px solid #388bfd",
                borderRadius: "8px",
                color: loading ? "#6e7681" : "#58a6ff",
                fontWeight: "700",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "0.95rem",
                marginBottom: "10px",
              }}
            >
              {loading ? "作成中..." : "部屋を作成してゲームを始める"}
            </button>
            <button
              onClick={() => { setMode(null); setErr(""); }}
              style={{
                width: "100%",
                padding: "8px",
                background: "transparent",
                border: "none",
                color: "#6e7681",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              ← 戻る
            </button>
          </div>
        )}

        {/* Join room */}
        {mode === "join" && (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  color: "#8b949e",
                  marginBottom: "6px",
                  fontWeight: "600",
                }}
              >
                ルームID
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="例: A1B2C3D4"
                maxLength={8}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "#0d1117",
                  border: "1px solid #30363d",
                  borderRadius: "8px",
                  color: "#e6edf3",
                  fontSize: "1rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  outline: "none",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#388bfd")}
                onBlur={(e) => (e.target.style.borderColor = "#30363d")}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
            </div>
            <button
              onClick={handleJoin}
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(63, 185, 80, 0.15)",
                border: "1px solid #238636",
                borderRadius: "8px",
                color: "#3fb950",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "0.95rem",
                marginBottom: "10px",
              }}
            >
              参加する
            </button>
            <button
              onClick={() => { setMode(null); setErr(""); }}
              style={{
                width: "100%",
                padding: "8px",
                background: "transparent",
                border: "none",
                color: "#6e7681",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              ← 戻る
            </button>
          </div>
        )}

        {err && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              background: "rgba(248, 81, 73, 0.1)",
              border: "1px solid rgba(248, 81, 73, 0.4)",
              borderRadius: "6px",
              color: "#f85149",
              fontSize: "0.85rem",
            }}
          >
            {err}
          </div>
        )}
      </div>

      {/* Rules hint */}
      <div
        style={{
          marginTop: "32px",
          maxWidth: "420px",
          width: "100%",
          padding: "16px",
          background: "rgba(22, 27, 34, 0.6)",
          border: "1px solid #21262d",
          borderRadius: "10px",
          fontSize: "0.8rem",
          color: "#6e7681",
          lineHeight: "1.6",
        }}
      >
        <div style={{ color: "#8b949e", fontWeight: "600", marginBottom: "8px" }}>ルール概要</div>
        <div>2〜3人で遊ぶカードゲームです。</div>
        <div>5枚の手牌から2つのエンジニア用語を完成させてください。</div>
        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {[
            { label: "最強コア", terms: "SRE / DNS / RPC / CRD / SDN" },
            { label: "プラットフォーム", terms: "SDK / CSP / RKE" },
            { label: "組織・ロール", terms: "CRE / DRE / NRE" },
            { label: "セキュリティ", terms: "CSR / PKE" },
            { label: "コミュニティ", terms: "CNK / CND / PEK" },
          ].map(({ label, terms }) => (
            <div key={label} style={{ display: "flex", gap: "8px" }}>
              <span style={{ width: "110px", flexShrink: 0, color: "#6e7681" }}>{label}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#58a6ff" }}>{terms}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Waiting Screen
// ---------------------------------------------------------------------------

function WaitingScreen({ roomId, playerName, gameState, onStart, connected }) {
  const players = gameState ? gameState.players : [];
  const canStart = players.length >= 2;
  const isCreator = gameState && players.length > 0 && players[0].name === playerName;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        background: "radial-gradient(ellipse at center, #0d2030 0%, #0d1117 70%)",
      }}
    >
      <div
        style={{
          background: "rgba(22, 27, 34, 0.95)",
          border: "1px solid #30363d",
          borderRadius: "16px",
          padding: "40px",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.5)",
        }}
      >
        <h2
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "1.4rem",
            fontWeight: "700",
            color: "#58a6ff",
            marginBottom: "8px",
            textAlign: "center",
          }}
        >
          待機中...
        </h2>

        {/* Room ID display */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <div style={{ fontSize: "0.8rem", color: "#8b949e", marginBottom: "6px" }}>
            ルームID（他のプレイヤーに共有）
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "2rem",
              fontWeight: "700",
              color: "#e6edf3",
              letterSpacing: "0.2em",
              background: "rgba(88, 166, 255, 0.08)",
              padding: "12px 24px",
              borderRadius: "10px",
              border: "1px solid rgba(88, 166, 255, 0.2)",
              display: "inline-block",
              cursor: "pointer",
            }}
            onClick={() => {
              navigator.clipboard?.writeText(roomId);
            }}
            title="クリックでコピー"
          >
            {roomId}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#6e7681", marginTop: "4px" }}>
            クリックでコピー
          </div>
        </div>

        {/* Players list */}
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              fontSize: "0.85rem",
              color: "#8b949e",
              marginBottom: "12px",
              fontWeight: "600",
            }}
          >
            参加者 ({players.length}/3)
          </div>
          {players.map((p, i) => (
            <div
              key={p.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                background: p.name === playerName ? "rgba(63, 185, 80, 0.08)" : "rgba(22, 27, 34, 0.6)",
                border: `1px solid ${p.name === playerName ? "rgba(63, 185, 80, 0.3)" : "#21262d"}`,
                borderRadius: "8px",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#3fb950",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontWeight: p.name === playerName ? "700" : "400",
                  color: p.name === playerName ? "#3fb950" : "#e6edf3",
                }}
              >
                {p.name}
                {p.name === playerName && " (あなた)"}
                {i === 0 && (
                  <span style={{ marginLeft: "8px", fontSize: "0.7rem", color: "#8b949e" }}>
                    ホスト
                  </span>
                )}
              </span>
            </div>
          ))}

          {players.length < 2 && (
            <div
              style={{
                padding: "10px 14px",
                border: "1px dashed #21262d",
                borderRadius: "8px",
                color: "#6e7681",
                fontSize: "0.85rem",
                textAlign: "center",
              }}
            >
              もう1人待っています...
            </div>
          )}
        </div>

        {/* Connection status */}
        {!connected && (
          <div
            style={{
              padding: "8px 14px",
              background: "rgba(248, 81, 73, 0.1)",
              border: "1px solid rgba(248, 81, 73, 0.3)",
              borderRadius: "6px",
              color: "#f85149",
              fontSize: "0.8rem",
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            再接続中...
          </div>
        )}

        {/* Start button */}
        {isCreator && (
          <button
            onClick={onStart}
            disabled={!canStart}
            style={{
              width: "100%",
              padding: "14px",
              background: canStart
                ? "rgba(63, 185, 80, 0.2)"
                : "rgba(63, 185, 80, 0.05)",
              border: `1px solid ${canStart ? "#3fb950" : "#21262d"}`,
              borderRadius: "10px",
              color: canStart ? "#3fb950" : "#6e7681",
              fontWeight: "700",
              cursor: canStart ? "pointer" : "not-allowed",
              fontSize: "1rem",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => canStart && (e.target.style.background = "rgba(63, 185, 80, 0.3)")}
            onMouseLeave={(e) => canStart && (e.target.style.background = "rgba(63, 185, 80, 0.2)")}
          >
            {canStart ? "ゲーム開始！" : "2人以上必要です"}
          </button>
        )}

        {!isCreator && (
          <div
            style={{
              textAlign: "center",
              color: "#8b949e",
              fontSize: "0.85rem",
              padding: "12px",
            }}
          >
            ホストがゲームを開始するのを待っています...
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------

export default function App() {
  const [roomId, setRoomId] = useState(null);
  const [playerName, setPlayerName] = useState(null);

  const { gameState, error, connected, sendMessage } = useWebSocket(roomId, playerName);

  const handleJoin = useCallback((rid, pname) => {
    setRoomId(rid);
    setPlayerName(pname);
  }, []);

  const handleAction = useCallback(
    (action) => {
      sendMessage(action);
    },
    [sendMessage]
  );

  const handleStart = useCallback(() => {
    sendMessage({ action: "start" });
  }, [sendMessage]);

  // Determine current screen
  const phase = gameState ? gameState.phase : null;

  return (
    <div>
      {/* Global error toast */}
      {error && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(248, 81, 73, 0.95)",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "8px",
            fontSize: "0.9rem",
            fontWeight: "600",
            zIndex: 9999,
            boxShadow: "0 4px 20px rgba(248, 81, 73, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          {error}
        </div>
      )}

      {/* Connection indicator */}
      {roomId && !connected && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            background: "rgba(210, 153, 34, 0.95)",
            color: "#0d1117",
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "0.8rem",
            fontWeight: "700",
            zIndex: 9998,
          }}
        >
          ⚡ 再接続中...
        </div>
      )}

      {/* Screens */}
      {!roomId && <LobbyScreen onJoin={handleJoin} />}

      {roomId && (phase === "waiting" || !phase) && (
        <WaitingScreen
          roomId={roomId}
          playerName={playerName}
          gameState={gameState}
          onStart={handleStart}
          connected={connected}
        />
      )}

      {roomId && phase === "playing" && (
        <GameBoard
          gameState={gameState}
          playerName={playerName}
          onAction={handleAction}
        />
      )}

      {roomId && phase === "finished" && (
        <GameBoard
          gameState={gameState}
          playerName={playerName}
          onAction={handleAction}
        />
      )}
    </div>
  );
}

import React, { useState } from "react";
import Tile from "./Tile.jsx";

const VALID_TERMS = [
  "SRE", "DNS", "RPC", "CRD", "SDN",
  "SDK", "CSP", "RKE",
  "CRE", "DRE", "NRE",
  "CSR", "PKE",
  "CNK", "CND", "PEK",
];

// Check if adding a tile to hand can make a valid term (for hotfix/merge detection)
function canHotfix(hand, discardedTile) {
  if (!hand || !discardedTile) return false;
  const test = [...hand, discardedTile];
  for (let i = 0; i < test.length; i++) {
    for (let j = 0; j < test.length; j++) {
      if (i === j) continue;
      for (let k = 0; k < test.length; k++) {
        if (k === i || k === j) continue;
        const term = test[i] + test[j] + test[k];
        if (VALID_TERMS.includes(term)) {
          // Check that discardedTile is among i,j,k indices
          const discIdx = test.length - 1;
          if (i === discIdx || j === discIdx || k === discIdx) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function canMerge(hand, discardedTile, revealed) {
  if (!hand || !discardedTile) return false;
  const revealedCount = revealed ? revealed.length : 0;
  const testHand = [...hand, discardedTile];

  if (revealedCount >= 1) {
    // Need 1 more term from testHand
    return findTermInTiles(testHand) !== null;
  }

  // Need 2 terms from testHand (6 tiles total)
  if (testHand.length < 6) return false;
  return findTwoTerms(testHand);
}

function findTermInTiles(tiles) {
  const n = tiles.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      for (let k = 0; k < n; k++) {
        if (k === i || k === j) continue;
        const term = tiles[i] + tiles[j] + tiles[k];
        if (VALID_TERMS.includes(term)) return term;
      }
    }
  }
  return null;
}

function findTwoTerms(tiles) {
  const n = tiles.length;
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      for (let c = b + 1; c < n; c++) {
        const subset1 = [tiles[a], tiles[b], tiles[c]];
        const rem = tiles.filter((_, i) => i !== a && i !== b && i !== c);
        if (rem.length < 3) continue;
        let term1 = null;
        const perms1 = permutations(subset1);
        for (const p of perms1) {
          if (VALID_TERMS.includes(p.join(""))) { term1 = p.join(""); break; }
        }
        if (!term1) continue;
        const perms2 = permutations(rem.slice(0, 3));
        for (const p of perms2) {
          if (VALID_TERMS.includes(p.join(""))) return true;
        }
      }
    }
  }
  return false;
}

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) {
      result.push([arr[i], ...p]);
    }
  }
  return result;
}

function canCommit(hand, revealed) {
  if (!hand) return false;
  const revealedCount = revealed ? revealed.length : 0;
  if (revealedCount >= 1) {
    return findTermInTiles(hand) !== null;
  }
  if (hand.length < 6) return false;
  return findTwoTerms(hand);
}

// -------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------

function PlayerStatus({ player, isMe, isCurrent }) {
  const borderColor = isCurrent ? "#58a6ff" : player.connected === false ? "#6e7681" : "#30363d";
  const bgColor = isCurrent ? "rgba(88, 166, 255, 0.05)" : "rgba(22, 27, 34, 0.8)";

  return (
    <div
      style={{
        border: `1px solid ${borderColor}`,
        borderRadius: "10px",
        padding: "12px 16px",
        background: bgColor,
        minWidth: "160px",
        transition: "border-color 0.3s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        {isCurrent && (
          <span style={{ color: "#58a6ff", fontSize: "0.75rem" }}>▶</span>
        )}
        <span
          style={{
            fontWeight: "700",
            fontSize: "1rem",
            color: isMe ? "#3fb950" : "#e6edf3",
          }}
        >
          {player.name} {isMe ? "(あなた)" : ""}
        </span>
        {player.connected === false && (
          <span style={{ color: "#6e7681", fontSize: "0.7rem" }}>切断</span>
        )}
      </div>

      <div style={{ fontSize: "0.8rem", color: "#8b949e", marginBottom: "6px" }}>
        手牌: {player.hand_count}枚
        {player.has_drawn && (
          <span
            style={{
              marginLeft: "8px",
              color: "#d29922",
              fontSize: "0.7rem",
              background: "rgba(210, 153, 34, 0.1)",
              padding: "1px 6px",
              borderRadius: "4px",
              border: "1px solid rgba(210, 153, 34, 0.3)",
            }}
          >
            ドロー済
          </span>
        )}
      </div>

      {player.revealed && player.revealed.length > 0 && (
        <div style={{ marginTop: "8px" }}>
          <div style={{ fontSize: "0.7rem", color: "#8b949e", marginBottom: "4px" }}>
            公開セット:
          </div>
          {player.revealed.map((set, i) => (
            <div key={i} style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
              {set.map((ch, j) => (
                <Tile key={j} char={ch} locked />
              ))}
              <span
                style={{
                  alignSelf: "center",
                  fontSize: "0.75rem",
                  color: "#3fb950",
                  marginLeft: "4px",
                }}
              >
                {set.join("")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DiscardPile({ pile, lastDiscard, pendingInterrupt }) {
  const recentPile = pile ? [...pile].slice(-10) : [];

  return (
    <div
      style={{
        background: "rgba(22, 27, 34, 0.8)",
        border: "1px solid #30363d",
        borderRadius: "10px",
        padding: "12px 16px",
      }}
    >
      <div
        style={{
          fontSize: "0.8rem",
          color: "#8b949e",
          marginBottom: "8px",
          fontWeight: "600",
        }}
      >
        捨て牌
      </div>
      {recentPile.length === 0 ? (
        <div style={{ color: "#6e7681", fontSize: "0.8rem" }}>なし</div>
      ) : (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {recentPile.map((ch, i) => {
            const isLast = i === recentPile.length - 1;
            const isPending = pendingInterrupt && isLast;
            return (
              <div
                key={i}
                style={{
                  position: "relative",
                }}
              >
                <Tile
                  char={ch}
                  faded={!isLast}
                  selected={isPending}
                />
                {isPending && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-12px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontSize: "0.65rem",
                      color: "#f78166",
                      whiteSpace: "nowrap",
                      fontWeight: "700",
                    }}
                  >
                    {pendingInterrupt.expires_in}s
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {lastDiscard && (
        <div style={{ marginTop: "8px", fontSize: "0.75rem", color: "#8b949e" }}>
          最後: {lastDiscard.player} が「{lastDiscard.tile}」を捨てた
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// Main GameBoard
// -------------------------------------------------------------------------

export default function GameBoard({ gameState, playerName, onAction, isCreator }) {
  const [selectedVisualIndex, setSelectedVisualIndex] = useState(null);
  const [handOrder, setHandOrder] = useState([]);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [highlightChar, setHighlightChar] = useState(null);
  const dragSrcIndex = React.useRef(null);

  if (!gameState) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#8b949e" }}>
        ゲーム状態を読み込み中...
      </div>
    );
  }

  const { phase, players, discard_pile, last_discard, deck_count, current_player, winner, winning_terms, pending_interrupt } = gameState;

  const myPlayer = players ? players.find((p) => p.name === playerName) : null;
  const myHand = myPlayer ? myPlayer.hand || [] : [];
  const myRevealed = myPlayer ? myPlayer.revealed || [] : [];
  const isMyTurn = current_player === playerName;
  const myHasDrawn = myPlayer ? myPlayer.has_drawn : false;

  // Sync handOrder when hand size changes (keep existing order, append new tiles)
  React.useEffect(() => {
    setHandOrder((prev) => {
      const n = myHand.length;
      if (prev.length === n) return prev;
      if (prev.length < n) {
        // New tiles added (e.g. draw): append their indices
        const existing = prev.filter((i) => i < n);
        const added = [];
        for (let i = 0; i < n; i++) {
          if (!existing.includes(i)) added.push(i);
        }
        return [...existing, ...added];
      }
      // Tiles removed (e.g. pon): filter valid indices, preserve relative order
      const valid = prev.filter((i) => i < n);
      if (valid.length === n) return valid;
      return Array.from({ length: n }, (_, i) => i);
    });
    setSelectedVisualIndex(null);
  }, [myHand.length]);

  // Ordered display hand
  const orderedHand = handOrder.length === myHand.length
    ? handOrder.map((i) => myHand[i])
    : myHand;

  const pendingTile = pending_interrupt ? pending_interrupt.tile : null;
  const pendingFrom = pending_interrupt ? pending_interrupt.from_player : null;
  const canHotfixNow = pending_interrupt && pendingFrom !== playerName && canHotfix(myHand, pendingTile);
  const canMergeNow = pending_interrupt && pendingFrom !== playerName && myRevealed.length === 0 && canMerge(myHand, pendingTile, myRevealed);
  const canCommitNow = isMyTurn && myHasDrawn && canCommit(myHand, myRevealed);

  const handleTileClick = (visualIndex) => {
    if (!isMyTurn || !myHasDrawn) return;
    setSelectedVisualIndex(visualIndex === selectedVisualIndex ? null : visualIndex);
  };

  const handleDiscard = () => {
    if (selectedVisualIndex === null) return;
    const originalIndex = handOrder.length === myHand.length
      ? handOrder[selectedVisualIndex]
      : selectedVisualIndex;
    // 捨てた牌を除いて並び順を維持し、サーバー側インデックスのシフトを補正
    setHandOrder((prev) =>
      prev
        .filter((_, vi) => vi !== selectedVisualIndex)
        .map((i) => (i > originalIndex ? i - 1 : i))
    );
    onAction({ action: "discard", tile_index: originalIndex });
    setSelectedVisualIndex(null);
  };

  // Drag-and-drop handlers (mouse)
  const handleDragStart = (visualIndex) => {
    dragSrcIndex.current = visualIndex;
  };

  const handleDragOver = (e, visualIndex) => {
    e.preventDefault();
    setDragOverIndex(visualIndex);
  };

  const handleDrop = (e, visualIndex) => {
    e.preventDefault();
    const src = dragSrcIndex.current;
    if (src === null || src === visualIndex) {
      setDragOverIndex(null);
      return;
    }
    reorderHand(src, visualIndex);
    dragSrcIndex.current = null;
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    dragSrcIndex.current = null;
    setDragOverIndex(null);
  };

  const reorderHand = (src, dest) => {
    setHandOrder((prev) => {
      const order = [...prev];
      const [moved] = order.splice(src, 1);
      order.splice(dest, 0, moved);
      return order;
    });
    setSelectedVisualIndex((sel) => {
      if (sel === src) return dest;
      if (src < dest && sel > src && sel <= dest) return sel - 1;
      if (src > dest && sel < src && sel >= dest) return sel + 1;
      return sel;
    });
  };

  // Touch drag handlers (mobile)
  const handleTouchStart = (e, visualIndex) => {
    dragSrcIndex.current = visualIndex;
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const tileEl = el?.closest("[data-visual-index]");
    const idx = tileEl ? parseInt(tileEl.dataset.visualIndex, 10) : null;
    setDragOverIndex(idx ?? null);
  };

  const handleTouchEnd = (e) => {
    const src = dragSrcIndex.current;
    const dest = dragOverIndex;
    dragSrcIndex.current = null;
    setDragOverIndex(null);
    if (src === null || dest === null || src === dest) return;
    reorderHand(src, dest);
  };

  // 理牌: sort alphabetically (case-insensitive)
  const handleRippai = () => {
    setHandOrder((prev) => {
      const withChars = prev.map((origIdx) => ({ origIdx, char: myHand[origIdx] }));
      withChars.sort((a, b) => a.char.localeCompare(b.char));
      return withChars.map((x) => x.origIdx);
    });
    setSelectedVisualIndex(null);
  };

  const handleDraw = () => {
    onAction({ action: "draw" });
  };

  const handleCommit = () => {
    onAction({ action: "commit" });
  };

  const handleHotfix = () => {
    onAction({ action: "hotfix", tile: pendingTile });
  };

  const handleMerge = () => {
    onAction({ action: "merge", tile: pendingTile });
  };

  // Finished screen
  if (phase === "finished") {
    const isDraw = winner === "引き分け";
    const isWinner = winner === playerName;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "40px",
          background: "radial-gradient(ellipse at center, #0d2030 0%, #0d1117 70%)",
        }}
      >
        <div
          style={{
            background: "rgba(22, 27, 34, 0.95)",
            border: `2px solid ${isDraw ? "#6e7681" : isWinner ? "#3fb950" : "#f78166"}`,
            borderRadius: "16px",
            padding: "48px",
            textAlign: "center",
            maxWidth: "480px",
            width: "100%",
            boxShadow: `0 0 60px ${isDraw ? "rgba(110, 118, 129, 0.3)" : isWinner ? "rgba(63, 185, 80, 0.3)" : "rgba(247, 129, 102, 0.3)"}`,
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "16px" }}>
            {isDraw ? "🤝" : isWinner ? "🎉" : "😔"}
          </div>
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: "700",
              color: isDraw ? "#8b949e" : isWinner ? "#3fb950" : "#f78166",
              marginBottom: "8px",
            }}
          >
            {isDraw ? "引き分け" : isWinner ? "アガリ！" : `${winner} の勝ち！`}
          </h2>
          {!isDraw && winning_terms && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "0.85rem", color: "#8b949e", marginBottom: "8px" }}>
                完成ターム:
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                {winning_terms.map((term, i) => (
                  <span
                    key={i}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: "700",
                      fontSize: "1.4rem",
                      color: "#58a6ff",
                      background: "rgba(88, 166, 255, 0.1)",
                      padding: "4px 12px",
                      borderRadius: "6px",
                      border: "1px solid rgba(88, 166, 255, 0.3)",
                    }}
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}
          {isCreator ? (
            <button
              onClick={() => onAction({ action: "reset" })}
              style={{
                marginTop: "24px",
                padding: "12px 32px",
                background: "rgba(88, 166, 255, 0.15)",
                border: "1px solid #388bfd",
                borderRadius: "8px",
                color: "#58a6ff",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              もう一度
            </button>
          ) : (
            <div style={{ marginTop: "24px", fontSize: "0.85rem", color: "#6e7681" }}>
              ホストが次のゲームを開始するのを待っています...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "20px",
        background: "#0d1117",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          background: "rgba(22, 27, 34, 0.8)",
          borderRadius: "10px",
          border: "1px solid #30363d",
        }}
      >
        <h1
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "1.2rem",
            fontWeight: "700",
            color: "#58a6ff",
          }}
        >
          CNK雀
        </h1>
        <div style={{ display: "flex", gap: "16px", fontSize: "0.8rem", color: "#8b949e" }}>
          <span>山牌: {deck_count}枚</span>
          <span
            style={{
              color: isMyTurn ? "#3fb950" : "#8b949e",
              fontWeight: isMyTurn ? "700" : "400",
            }}
          >
            {isMyTurn ? "▶ あなたのターン" : `${current_player} のターン`}
          </span>
        </div>
      </div>

      {/* Interrupt alert */}
      {pending_interrupt && pendingFrom !== playerName && (
        <div
          style={{
            background: "rgba(247, 129, 102, 0.1)",
            border: "1px solid rgba(247, 129, 102, 0.4)",
            borderRadius: "10px",
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ color: "#f78166", fontWeight: "600" }}>
            {pendingFrom} が「{pendingTile}」を捨てました！
            <span style={{ marginLeft: "8px", fontSize: "0.85rem", opacity: 0.8 }}>
              残り {pending_interrupt.expires_in}秒
            </span>
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            {canHotfixNow && (
              <button
                onClick={handleHotfix}
                style={{
                  padding: "6px 14px",
                  background: "rgba(210, 153, 34, 0.2)",
                  border: "1px solid #d29922",
                  borderRadius: "6px",
                  color: "#d29922",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                ポン
              </button>
            )}
            {canMergeNow && (
              <button
                onClick={handleMerge}
                style={{
                  padding: "6px 14px",
                  background: "rgba(63, 185, 80, 0.2)",
                  border: "1px solid #3fb950",
                  borderRadius: "6px",
                  color: "#3fb950",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                ロン
              </button>
            )}
          </div>
        </div>
      )}

      {/* Players area */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {players &&
          players.map((p) => (
            <PlayerStatus
              key={p.name}
              player={p}
              isMe={p.name === playerName}
              isCurrent={p.name === current_player}
            />
          ))}
      </div>

      {/* Discard pile */}
      <DiscardPile
        pile={discard_pile}
        lastDiscard={last_discard}
        pendingInterrupt={pending_interrupt}
      />

      {/* My hand */}
      <div
        style={{
          background: "rgba(22, 27, 34, 0.8)",
          border: `1px solid ${isMyTurn ? "#388bfd" : "#30363d"}`,
          borderRadius: "10px",
          padding: "16px",
          transition: "border-color 0.3s",
        }}
      >
        <div
          style={{
            fontSize: "0.8rem",
            color: "#8b949e",
            marginBottom: "12px",
            fontWeight: "600",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>あなたの手牌</span>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {isMyTurn && myHasDrawn && selectedVisualIndex === null && (
              <span style={{ color: "#d29922", fontSize: "0.75rem" }}>
                捨てる牌を選んでください
              </span>
            )}
            <button
              onClick={handleRippai}
              title="理牌（アルファベット順に並べ替え）"
              style={{
                padding: "3px 10px",
                background: "rgba(139, 148, 158, 0.1)",
                border: "1px solid #444c56",
                borderRadius: "5px",
                color: "#8b949e",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#e6edf3")}
              onMouseLeave={(e) => (e.target.style.color = "#8b949e")}
            >
              理牌
            </button>
          </div>
        </div>

        {/* Revealed sets */}
        {myRevealed.length > 0 && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "0.7rem", color: "#d29922", marginBottom: "6px" }}>
              公開セット（ポン済・ロン不可）:
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {myRevealed.map((set, i) => (
                <div key={i} style={{ display: "flex", gap: "4px", marginRight: "8px" }}>
                  {set.map((ch, j) => (
                    <Tile key={j} char={ch} locked />
                  ))}
                  <span
                    style={{
                      alignSelf: "center",
                      fontSize: "0.85rem",
                      color: "#3fb950",
                      marginLeft: "4px",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: "700",
                    }}
                  >
                    {set.join("")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hand tiles */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          {orderedHand.map((ch, vi) => (
            <div
              key={vi}
              data-visual-index={vi}
              draggable
              onDragStart={() => handleDragStart(vi)}
              onDragOver={(e) => handleDragOver(e, vi)}
              onDrop={(e) => handleDrop(e, vi)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, vi)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={() => setHighlightChar((prev) => (prev === ch ? null : ch))}
              style={{
                opacity: dragSrcIndex.current === vi ? 0.4 : 1,
                outline: dragOverIndex === vi ? "2px dashed #58a6ff" : "none",
                borderRadius: "6px",
                cursor: "grab",
                touchAction: "none",
              }}
            >
              <Tile
                char={ch}
                selected={selectedVisualIndex === vi}
                onClick={isMyTurn && myHasDrawn ? () => handleTileClick(vi) : null}
                faded={isMyTurn && myHasDrawn && selectedVisualIndex !== null && selectedVisualIndex !== vi}
              />
            </div>
          ))}
          {myHand.length === 0 && (
            <div style={{ color: "#6e7681", fontSize: "0.85rem" }}>手牌なし</div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {/* Draw button */}
          {isMyTurn && !myHasDrawn && !pending_interrupt && (
            <button
              onClick={handleDraw}
              style={{
                padding: "8px 20px",
                background: "rgba(88, 166, 255, 0.15)",
                border: "1px solid #388bfd",
                borderRadius: "8px",
                color: "#58a6ff",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "0.9rem",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.background = "rgba(88, 166, 255, 0.25)")}
              onMouseLeave={(e) => (e.target.style.background = "rgba(88, 166, 255, 0.15)")}
            >
              ツモ
            </button>
          )}

          {/* Discard button */}
          {isMyTurn && myHasDrawn && selectedVisualIndex !== null && (
            <button
              onClick={handleDiscard}
              style={{
                padding: "8px 20px",
                background: "rgba(248, 81, 73, 0.15)",
                border: "1px solid #f85149",
                borderRadius: "8px",
                color: "#f85149",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "0.9rem",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.background = "rgba(248, 81, 73, 0.25)")}
              onMouseLeave={(e) => (e.target.style.background = "rgba(248, 81, 73, 0.15)")}
            >
              打牌（{orderedHand[selectedVisualIndex]}を捨てる）
            </button>
          )}

          {/* Commit (tsumo win) button */}
          {canCommitNow && (
            <button
              onClick={handleCommit}
              style={{
                padding: "8px 20px",
                background: "rgba(63, 185, 80, 0.2)",
                border: "1px solid #3fb950",
                borderRadius: "8px",
                color: "#3fb950",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "0.9rem",
                boxShadow: "0 0 12px rgba(63, 185, 80, 0.3)",
                animation: "pulse 1s infinite",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.background = "rgba(63, 185, 80, 0.35)")}
              onMouseLeave={(e) => (e.target.style.background = "rgba(63, 185, 80, 0.2)")}
            >
              ツモ
            </button>
          )}
        </div>
      </div>

      {/* Terms reference */}
      <div
        style={{
          background: "rgba(22, 27, 34, 0.6)",
          border: "1px solid #21262d",
          borderRadius: "10px",
          padding: "12px 16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ fontSize: "0.75rem", color: "#6e7681" }}>用語一覧</span>
          {highlightChar && (
            <span style={{ fontSize: "0.7rem", color: "#f0883e" }}>
              「{highlightChar}」を含む用語を強調中
              <button
                onClick={() => setHighlightChar(null)}
                style={{ marginLeft: "6px", background: "none", border: "none", color: "#6e7681", cursor: "pointer", fontSize: "0.7rem" }}
              >✕</button>
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[
            { label: "最強コア", terms: ["SRE", "DNS", "RPC", "CRD", "SDN"] },
            { label: "プラットフォーム", terms: ["SDK", "CSP", "RKE"] },
            { label: "組織・ロール", terms: ["CRE", "DRE", "NRE"] },
            { label: "セキュリティ", terms: ["CSR", "PKE"] },
            { label: "コミュニティ", terms: ["CNK", "CND", "PEK"] },
          ].map(({ label, terms }) => {
            const hasMatch = highlightChar && terms.some((t) => t.includes(highlightChar));
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px", opacity: highlightChar && !hasMatch ? 0.3 : 1, transition: "opacity 0.2s" }}>
                <span style={{ fontSize: "0.7rem", color: "#6e7681", width: "110px", flexShrink: 0 }}>
                  {label}
                </span>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {terms.map((term) => {
                    const termMatches = highlightChar && term.includes(highlightChar);
                    return (
                      <span
                        key={term}
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "0.8rem",
                          background: termMatches ? "rgba(240, 136, 62, 0.15)" : "rgba(88, 166, 255, 0.08)",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          border: termMatches ? "1px solid rgba(240, 136, 62, 0.5)" : "1px solid rgba(88, 166, 255, 0.2)",
                        }}
                      >
                        {term.split("").map((ch, i) => (
                          <span key={i} style={{ color: ch === highlightChar ? "#f0883e" : "#58a6ff", fontWeight: ch === highlightChar ? "900" : "400" }}>
                            {ch}
                          </span>
                        ))}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 12px rgba(63, 185, 80, 0.3); }
          50% { box-shadow: 0 0 24px rgba(63, 185, 80, 0.6); }
        }
      `}</style>
    </div>
  );
}

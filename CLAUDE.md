# cnk-mahjong-site

CNKコミュニティイベント向けのブラウザゲーム「CNK雀」。麻雀風のルールとエンジニア用語を組み合わせたカードゲーム。ゲーム性検証が目的のためステートレス（DB不要）。

## 技術スタック

- **Backend**: Python + FastAPI（WebSocket でリアルタイム同期）
- **Frontend**: React + Vite
- **Container**: Docker + Docker Compose

## ディレクトリ構成

```
backend/    # FastAPI サーバー・ゲームロジック・WebSocket
frontend/   # React クライアント
```

## コマンド

```bash
docker compose up          # ローカル起動
docker compose up --build  # イメージ再ビルドして起動
```

### Docker なし（テスト用）

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend && npm install
npm run dev
```

## ゲームルール

詳細は [rule.md](rule.md) を参照。

@CLAUDE.local.md

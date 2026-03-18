# CNK雀

CNKコミュニティイベント向けブラウザカードゲーム。麻雀風ルールでエンジニア用語を完成させる。

## ローカル起動

```bash
docker compose up --build
```

- フロントエンド: http://localhost:5173
- バックエンド: http://localhost:8000

## デプロイ構成

| 役割 | サービス |
|------|---------|
| フロントエンド | Cloudflare Pages |
| バックエンド | Google Cloud Run |

---

## フロントエンド: Cloudflare Pages

### 初回セットアップ（GitHub 連携）

1. [Cloudflare Pages ダッシュボード](https://dash.cloudflare.com/) を開く
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. GitHub リポジトリを選択して、以下を設定する

| 項目 | 値 |
|------|-----|
| ビルドコマンド | `npm run build` |
| ビルド出力ディレクトリ | `dist` |
| ルートディレクトリ | `frontend` |
| デプロイコマンド | （空のまま） |

> **注意**: デプロイコマンドに `wrangler deploy` は設定しないこと。Pages はビルド後に自動でデプロイするため不要。設定すると vite.config.js を書き換えてビルドが壊れる。

4. **環境変数** に以下を追加

| 変数名 | 値 |
|--------|-----|
| `VITE_API_BASE_URL` | `https://YOUR_CLOUD_RUN_URL` |

5. **Save and Deploy**

以降は `main` へ push するたびに自動デプロイされる。

### 手動デプロイ（Wrangler CLI）

```bash
npm install -g wrangler
wrangler login

cd frontend
npm install
npm run build
wrangler pages deploy dist --project-name=CNK雀のプロジェクト名
```

---

## バックエンド: Google Cloud Run

### 前提

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### デプロイ

```bash
cd backend
gcloud run deploy infra-jan-backend \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated
```

デプロイ後に表示される URL を Cloudflare Pages の `VITE_API_BASE_URL` に設定する。

---

## 環境変数まとめ

| 変数名 | 設定先 | 値 |
|--------|--------|----|
| `VITE_API_BASE_URL` | Cloudflare Pages（環境変数） | Cloud Run の URL |

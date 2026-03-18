# CLAUDE.local.md

ローカル環境固有の設定や個人メモをここに記載する。
（このファイルは .gitignore 対象）

## GCP デプロイ

### バックエンド → Cloud Run

```bash
cd backend
gcloud run deploy infra-jan-backend \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated
```

### フロントエンド → Cloudflare Pages

Cloudflare Pages ダッシュボードで GitHub リポジトリを接続して以下を設定：

| 項目 | 値 |
|------|-----|
| ビルドコマンド | `npm run build` |
| ビルド出力ディレクトリ | `dist` |
| ルートディレクトリ | `frontend` |
| 環境変数 | `VITE_API_BASE_URL=https://YOUR_CLOUD_RUN_URL` |

main にpushするたびに自動デプロイされる。

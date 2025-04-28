# KPTA ボード自動作成ガイド

このリポジトリには、GitHub プロジェクトを自動的に作成して KPTA ボードを構築するスクリプトが含まれています。このガイドでは、その使用方法を説明します。

## 前提条件

- Node.js (バージョン 14 以上)
- GitHub アカウント
- GitHub パーソナルアクセストークン
  - `project:write`スコープが必要です

## セットアップ

1. リポジトリをクローンします

```bash
git clone https://github.com/ユーザー名/kpta-board.git
cd kpta-board
```

2. 依存関係をインストールします

```bash
npm install
```

3. GitHub パーソナルアクセストークンを環境変数に設定します

```bash
export GITHUB_TOKEN=your_personal_access_token
```

## KPTA ボードの作成方法

### 方法 1: スクリプトの手動実行

#### テンプレートモードでテスト実行（実際に API を呼び出さない）

```bash
node create-kpta-board.js --template
```

#### 実際に GitHub プロジェクトを作成

```bash
node create-kpta-board.js <ユーザー名または組織名>
```

- `<ユーザー名または組織名>`: プロジェクトを作成したい GitHub のユーザーまたは組織の名前

### 方法 2: GitHub Actions を使用する

このリポジトリを GitHub にプッシュすると、GitHub Actions ワークフローが自動的に実行され、KPTA ボードが作成されます。

1. GitHub リポジトリを作成します
2. シークレットを追加します（必要な場合）
   - Settings タブ → Secrets → New repository secret
   - 名前を`PAT_TOKEN`にし、値にパーソナルアクセストークンを入力
3. リポジトリにコードをプッシュします

```bash
git push origin main
```

4. あるいは、GitHub Actions タブから手動で実行します
   - Actions タブ → Create KPTA Board → Run workflow
   - テンプレートモードで実行する場合は、「テンプレートモードで実行」オプションをチェック

## 作成される KPTA ボードの内容

自動作成される KPTA ボードには以下の要素が含まれます：

1. 6 つのステータス

   - Thanks
   - Keep
   - Problem
   - Try
   - 妨害リスト
   - Done

2. README ファイルの内容がプロジェクトの説明に設定されます

3. ボードビューが設定されます

## トラブルシューティング

### よくある問題と解決方法

1. **認証エラー**

   - GITHUB トークンが正しく設定されているか確認してください
   - トークンに必要なスコープがあるか確認してください

2. **すでにプロジェクトが存在する場合**

   - 同じ名前のプロジェクトが既に存在する場合、エラーになります
   - プロジェクト名を変更するか、既存のプロジェクトを削除してください

3. **GitHub API 制限**

   - API 制限に達した場合は、時間をおいて再試行してください

4. **ユーザーまたは組織が見つからない**
   - 指定したユーザー名または組織名が正しいか確認してください
   - テンプレートモード(`--template`)で実行してみてください

## API の権限について

GitHub Actions を使用する場合、デフォルトの GITHUB_TOKEN はリポジトリに制限されています。組織全体のプロジェクトを作成するには、個人のアクセストークン（PAT_TOKEN）を使用するか、組織の GitHub App を設定する必要があります。

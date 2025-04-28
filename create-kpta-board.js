#!/usr/bin/env node

/**
 * GitHub Projects V2を使用してKPTAボードを作成するスクリプト
 *
 * このスクリプトはGitHub GraphQL APIを使用しています。
 *
 * 使用方法:
 * 1. GITHUBトークンを環境変数に設定: export GITHUB_TOKEN=your_token
 * 2. スクリプトを実行: node create-kpta-board.js <組織名またはユーザー名> [--template]
 *    --template: APIを呼び出さずにテンプレートモードでテスト実行
 *
 * 例:
 *    node create-kpta-board.js --template
 *    node create-kpta-board.js 自分のGitHubユーザー名
 */

const { graphql } = require("@octokit/graphql")
const fs = require("fs")

// GitHub認証トークンを環境変数から取得
const token = process.env.GITHUB_TOKEN

// コマンドライン引数を解析
let owner = null
let isTemplate = false

for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--template") {
    isTemplate = true
  } else if (!owner) {
    owner = process.argv[i]
  }
}

// テンプレートモードなら所有者なしでも実行可能
if (!owner && !isTemplate) {
  console.error(
    "使用方法: node create-kpta-board.js <組織名またはユーザー名> [--template]"
  )
  console.error("  --template: APIを呼び出さずにテンプレートモードでテスト実行")
  console.error("")
  console.error("例:")
  console.error("  node create-kpta-board.js --template")
  console.error("  node create-kpta-board.js 自分のGitHubユーザー名")
  process.exit(1)
}

// テンプレートモードでなく、トークンがない場合はエラー
if (!token && !isTemplate) {
  console.error("環境変数GITHUB_TOKENが設定されていません。")
  console.error("export GITHUB_TOKEN=your_tokenを実行してください。")
  process.exit(1)
}

// GraphQLクライアントを初期化（エラーハンドリング改善）
const graphqlWithAuth = token
  ? graphql.defaults({
      headers: {
        authorization: `token ${token}`,
      },
      request: {
        timeout: 10000, // 10秒タイムアウト
      },
    })
  : null

// KPTAボードのステータス
const statuses = ["Thanks", "Keep", "Problem", "Try", "妨害リスト", "Done"]

/**
 * プロジェクトボードを作成する
 */
async function createKPTABoard() {
  try {
    // テンプレートモードの場合、または所有者が指定されていない場合
    if (isTemplate) {
      console.log("テンプレートモードで実行中...")
      const demoOwner = owner || "example-user"
      console.log(`${demoOwner}にKPTAボードを作成しています（デモ）...`)
      console.log("オーナーID: template-owner-id-12345")
      console.log("プロジェクト「KPTA ボード」を作成しました。")
      console.log(
        "プロジェクトURL: https://github.com/users/example-user/projects/1"
      )
      console.log("ステータスフィールドを作成しました。")

      for (const status of statuses) {
        console.log(`ステータス「${status}」を追加しました。`)
      }

      console.log("ボードビューを作成しました。")
      console.log("KPTAボードの作成が完了しました！")
      console.log("")
      console.log(
        "注意: これはテンプレートモードでの実行結果です。実際のGitHubプロジェクトは作成されていません。"
      )
      console.log(
        "実際に作成するには、--templateオプションを外して実行してください。"
      )
      return
    }

    console.log(`${owner}にKPTAボードを作成しています...`)

    // READMEの内容を読み込む
    let description =
      "チームのレトロスペクティブを効率的に実施するためのKPTAボード"
    try {
      const readmeContent = fs.readFileSync("README.md", "utf8")
      // 最初の200文字を説明として使用
      description = readmeContent.substring(0, 200) + "..."
    } catch (error) {
      console.warn(
        "READMEの読み込みに失敗しました。デフォルトの説明を使用します。",
        error.message
      )
    }

    // オーナーのIDを取得（awaitを使用して Promise を解決）
    const ownerId = await getOwnerId(owner)
    console.log(`オーナーID: ${ownerId}`)

    // 1. プロジェクトを作成
    const createProjectResult = await graphqlWithAuth(
      `
      mutation CreateProject($ownerId: ID!, $title: String!) {
        createProjectV2(input: {
          ownerId: $ownerId
          title: $title
        }) {
          projectV2 {
            id
            url
            title
          }
        }
      }
    `,
      {
        ownerId,
        title: "KPTA ボード",
      }
    )

    const projectId = createProjectResult.createProjectV2.projectV2.id
    const projectUrl = createProjectResult.createProjectV2.projectV2.url
    console.log(
      `プロジェクト「${createProjectResult.createProjectV2.projectV2.title}」を作成しました。`
    )
    console.log(`プロジェクトURL: ${projectUrl}`)

    // 2. プロジェクトの説明を設定（別途更新）
    try {
      await graphqlWithAuth(
        `
        mutation UpdateProjectV2($projectId: ID!, $description: String!) {
          updateProjectV2(input: {
            projectId: $projectId
            description: $description
          }) {
            projectV2 {
              id
            }
          }
        }
      `,
        {
          projectId,
          description,
        }
      )
      console.log("プロジェクトの説明を設定しました。")
    } catch (error) {
      console.warn(
        "プロジェクトの説明設定中にエラーが発生しました:",
        error.message
      )
      console.warn(
        "説明の設定に失敗しましたが、プロジェクトの作成は完了しています。"
      )
    }

    // 3. ステータスフィールドを作成
    const createFieldResult = await graphqlWithAuth(
      `
      mutation AddStatusField($projectId: ID!, $name: String!) {
        createProjectV2Field(input: {
          projectId: $projectId
          dataType: SINGLE_SELECT
          name: $name
        }) {
          projectV2Field {
            id
          }
        }
      }
    `,
      {
        projectId,
        name: "ステータス",
      }
    )

    const fieldId = createFieldResult.createProjectV2Field.projectV2Field.id
    console.log("ステータスフィールドを作成しました。")

    // 4. ステータスの選択肢を追加
    for (const status of statuses) {
      await graphqlWithAuth(
        `
        mutation AddStatusOption($projectId: ID!, $fieldId: ID!, $name: String!) {
          createProjectV2FieldOption(input: {
            projectId: $projectId
            fieldId: $fieldId
            name: $name
          }) {
            projectV2FieldOption {
              id
              name
            }
          }
        }
      `,
        {
          projectId,
          fieldId,
          name: status,
        }
      )
      console.log(`ステータス「${status}」を追加しました。`)
    }

    // 5. ボードビューを作成
    await graphqlWithAuth(
      `
      mutation CreateBoardView($projectId: ID!, $name: String!) {
        createProjectV2View(input: {
          projectId: $projectId
          name: $name
          layout: BOARD_LAYOUT
        }) {
          projectV2View {
            id
          }
        }
      }
    `,
      {
        projectId,
        name: "KPTA ボード",
      }
    )
    console.log("ボードビューを作成しました。")

    console.log("KPTAボードの作成が完了しました！")
  } catch (error) {
    console.error("エラーが発生しました:", error.message)
    if (error.request) {
      console.error("GraphQLリクエスト:", error.request)
    }
    process.exit(1)
  }
}

/**
 * オーナーのノードIDを取得
 */
async function getOwnerId(login) {
  try {
    // まずユーザーとして検索
    try {
      const userResult = await graphqlWithAuth(
        `
        query($login: String!) {
          user(login: $login) {
            id
          }
        }
      `,
        {
          login,
        }
      )

      if (userResult.user) {
        console.log(`${login}はユーザーとして見つかりました`)
        return userResult.user.id
      }
    } catch (error) {
      console.log(`ユーザー検索エラー: ${error.message}`)
    }

    // 次に組織として検索
    try {
      const orgResult = await graphqlWithAuth(
        `
        query($login: String!) {
          organization(login: $login) {
            id
          }
        }
      `,
        {
          login,
        }
      )

      if (orgResult.organization) {
        console.log(`${login}は組織として見つかりました`)
        return orgResult.organization.id
      }
    } catch (error) {
      console.log(`組織検索エラー: ${error.message}`)
    }

    throw new Error(`指定されたユーザー名または組織名は有効ではありません。`)
  } catch (error) {
    console.error("オーナーID取得中にエラーが発生しました:", error.message)
    throw error
  }
}

// スクリプト実行
createKPTABoard()

# 要件定義書

## 1. プロジェクト概要

- **目的:** 研究室におけるDNA結晶化プレート（条件、作成日、サンプル情報）を一元管理し、物理的なプレートとデジタル情報をQRコードで紐付ける。
- **コア価値:**
  1. 膨大なプレートの中から「あの条件のプレート」を即座に検索できる。
  2. 実験台でQRコードをかざすだけで、そのプレートの詳細情報にアクセスできる。

## 2. ターゲット・運用フロー

- **ユーザー:** 研究室メンバー（当面は自分専用でも可、将来的にマルチユーザー対応）。
- **管理対象:**
  1. **Hanging Drop (24-well)** - 手動作成
  2. **Sitting Drop (96-well)** - ロボット作成
  3. **Sitting Drop (Manual)** - 手動作成
- **運用フロー:**
  1. Webアプリでプレート情報を登録（条件はテンプレートから選択、または新規作成）。
  2. 発行されたQRコードをラベルプリンタ等で印刷し、プレートに貼付。
  3. 確認時はスマホでQRを読み取るか、PC/スマホからキーワード検索を行う。

## 3. 機能要件 (Functional Requirements)

### 3-1. プレート管理機能

| **機能名**           | **詳細**                           |
| -------------------- | ---------------------------------- |
| **新規プレート登録** | ・プレート名（自動採番 or 手入力） |

・サンプル名（例: "G-quadruplex 10mg/ml"）
・プレート種別選択（上記3種）
・条件設定（テンプレート選択 or 自由記述メモ）
・作成日時（デフォルトは現在時刻） |
| **プレート一覧表示** | ・作成日の新しい順に表示。
・主要情報（ID、サンプル名、種別、日付）のみを表示するカード型UI。 |
| **プレート詳細表示** | ・紐付いている条件（ウェルごとの組成など）の表示。
・**QRコード表示**（印刷用）。 |
| **プレート編集・削除** | ・登録ミスの修正用。 |

### 3-2. 条件テンプレート機能

| **機能名**           | **詳細**                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| **テンプレート利用** | プレート登録時に「Crystal Screen 1」「PEG最適化セットA」などの既存セットを選択し、紐付ける機能。     |
| **テンプレート作成** | よく使う条件セットを新規登録する機能（MVPではCSVインポート等は省略し、手動入力かDB直接投入で対応）。 |
| **カスタム対応**     | テンプレートに当てはまらない場合、任意のテキスト（Memo）で条件を記録できる機能。                     |

### 3-3. 検索・アクセス機能

| **機能名**         | **詳細**                           |
| ------------------ | ---------------------------------- |
| **キーワード検索** | 以下の項目を対象に横断検索を行う。 |

・サンプル名
・プレート種別
・条件（沈殿剤名、濃度など ※テンプレート内のテキストも対象）
・作成者名 |
| **QRコード生成** | プレートIDを含むURL（例: `/plates/123`）をQRコード画像として動的生成する。保存はせず、オンデマンド描画とする。 |

---

## 4. データモデル (Schema Design)

Prisma (PostgreSQL) を想定したスキーマ構成です。

コード スニペット

```jsx
// ユーザー
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  plates    Plate[]
}

// プレート種別の定義
enum PlateType {
  HANGING_DROP_24      // ハンギング 24穴
  SITTING_DROP_96_ROBOT // シッティング 96穴（ロボット）
  SITTING_DROP_MANUAL  // シッティング 手動
}

// プレート本体
model Plate {
  id          Int       @id @default(autoincrement())
  title       String    // 管理名（例: "DNA-A-001"）
  sampleName  String    // サンプル名（例: "Telomeric DNA"）
  type        PlateType
  createdAt   DateTime  @default(now())

  // テンプレートを使用する場合
  templateId  Int?
  template    ConditionTemplate? @relation(fields: [templateId], references: [id])

  // テンプレートを使わない、または特記事項用
  memo        String?   @db.Text // "A列: 20% PEG, B列: 30%..."

  userId      String
  user        User      @relation(fields: [userId], references: [id])
}

// 条件テンプレート（例: "Crystal Screen 1"）
model ConditionTemplate {
  id          Int       @id @default(autoincrement())
  name        String    // テンプレート名
  description String?   // 説明
  plates      Plate[]

  // 実際のウェル条件データ
  wells       TemplateWell[]
}

// テンプレート内の各ウェル条件
// 検索対象となる重要なデータ
model TemplateWell {
  id          Int      @id @default(autoincrement())
  templateId  Int
  template    ConditionTemplate @relation(fields: [templateId], references: [id])

  position    String   // "A1", "H12"
  composition String   // "0.2M MgCl2, 30% PEG 400, 0.1M Tris pH8.5"
}
```

---

## 5. 技術スタック (Recommended Stack)

研究室での運用・保守性を考慮し、モダンかつ「枯れている（安定している）」技術を選定。

- **Frontend / Framework:** Next.js (App Router)
  - 理由: Reactの知識を活かせ、Vercel等へのデプロイが容易。
- **Language:** TypeScript
  - 理由: 型安全性により、開発時のミスを減らす。
- **Database:** PostgreSQL
  - ホスティング: **Supabase** (無料枠が大きく、管理画面でデータを見やすい)
- **ORM:** Prisma
  - 理由: SQLを書かずに型安全にDB操作が可能。
- **UI Component:** Tailwind CSS + shadcn/ui
  - 理由: 研究室用ツールなので、デザインに時間をかけすぎず、整ったUIを爆速で作るため。
- **QR Code Library:** `react-qr-code`
  - 理由: 軽量で使いやすい。

---

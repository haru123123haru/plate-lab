export type Locale = "en" | "ja";

const translations = {
  en: {
    // Navigation
    home: "Home",
    dashboard: "Dashboard",
    samples: "Samples",
    settings: "Settings",
    myPage: "My Page",
    signOut: "Sign Out",

    // Common
    searchPlates: "Search plates...",
    noPlatesFound: "No plates found",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",
    saveChanges: "Save Changes",
    creating: "Creating...",

    // Dashboard
    recentPlates: "RECENT PLATES",
    viewAll: "View All",

    // Samples
    all: "All",
    active: "Active",
    archived: "Archived",

    // Plate Detail
    wellMap: "WELL MAP",
    plateDetails: "PLATE DETAILS",
    plateName: "PLATE NAME",
    status: "STATUS",
    sampleNameLabel: "SAMPLE NAME",
    type: "Type",
    sample: "Sample",
    reservoir: "Reservoir",
    screening: "Screening",
    created: "Created",
    updated: "Updated",
    notes: "NOTES",

    // New Plate
    addPlate: "Add Plate",
    plateType: "PLATE TYPE",
    condition: "CONDITION",
    wells: "wells",
    wellsSelected: "wells selected",
    createPlate: "Create Plate",
    sets: "Sets",
    newSet: "New Set",
    setName: "Set Name",
    registerSet: "Register Set",
    addTemplate: "Add Template",
    noConditionSets: 'No condition sets yet. Create one with "New Set".',
    selectAll: "Select All",
    clear: "Clear",
    add: "Add",
    editAfterCreation: "You can edit plate details anytime after creation.",

    // Settings
    general: "General",
    language: "Language",
    appearance: "Appearance",
    about: "About",
    version: "Version",
    selectLanguage: "Select your preferred language.",
    chooseTheme: "Choose your preferred theme.",
    light: "Light",
    dark: "Dark",
    system: "System",
    appVersion: "App Version",
    framework: "Framework",
    build: "Build",

    // Well Detail
    sampleName: "Sample Name",
    precipitant: "Precipitant",
    salt: "Salt",
    polyamine: "Polyamine",
    buffer: "Buffer",

    // Well Status
    filled: "Filled",
    empty: "Empty",
    crystal: "Crystal",
    precipitate: "Precipitate",
    clearStatus: "Clear",

    // My Page
    statistics: "STATISTICS",
    totalPlates: "Total Plates",
    activePlates: "Active Plates",
    archivedCount: "Archived",
    editProfile: "Edit Profile",

    // Edit Profile
    fullName: "FULL NAME",
    rolePosition: "ROLE / POSITION",
    email: "EMAIL",
    organization: "ORGANIZATION",
    bio: "BIO",

    // Login
    samplePlateManagement: "Sample Plate Management",
    signIn: "Sign In",
    password: "PASSWORD",
    continueWithGoogle: "Continue with Google",
    noAccount: "Don't have an account?",
    createAccount: "Create Account",
    alreadyHaveAccount: "Already have an account?",

    // Validation
    validationRequired: "This field is required",
    validationEmailInvalid: "Invalid email address",
    validationPasswordMin: "Password must be at least 6 characters",
    validationNameRequired: "Name is required",

    // QR Code
    qrCode: "QR CODE",
    downloadQr: "Download QR Code",
  },
  ja: {
    // Navigation
    home: "ホーム",
    dashboard: "ダッシュボード",
    samples: "サンプル",
    settings: "設定",
    myPage: "マイページ",
    signOut: "サインアウト",

    // Common
    searchPlates: "プレートを検索...",
    noPlatesFound: "プレートが見つかりません",
    cancel: "キャンセル",
    save: "保存",
    saving: "保存中...",
    saveChanges: "変更を保存",
    creating: "作成中...",

    // Dashboard
    recentPlates: "最近のプレート",
    viewAll: "すべて表示",

    // Samples
    all: "すべて",
    active: "アクティブ",
    archived: "アーカイブ",

    // Plate Detail
    wellMap: "ウェルマップ",
    plateDetails: "プレート詳細",
    plateName: "プレート名",
    status: "ステータス",
    sampleNameLabel: "サンプル名",
    type: "タイプ",
    sample: "サンプル",
    reservoir: "リザーバー",
    screening: "スクリーニング",
    created: "作成日",
    updated: "更新日",
    notes: "メモ",

    // New Plate
    addPlate: "プレート追加",
    plateType: "プレートタイプ",
    condition: "条件",
    wells: "ウェル",
    wellsSelected: "ウェル選択済み",
    createPlate: "プレートを作成",
    sets: "セット",
    newSet: "新規セット",
    setName: "セット名",
    registerSet: "セットを登録",
    addTemplate: "テンプレート追加",
    noConditionSets:
      "条件セットがありません。「新規セット」で作成してください。",
    selectAll: "すべて選択",
    clear: "クリア",
    add: "追加",
    editAfterCreation: "作成後いつでもプレートの詳細を編集できます。",

    // Settings
    general: "一般",
    language: "言語",
    appearance: "外観",
    about: "情報",
    version: "バージョン",
    selectLanguage: "言語を選択してください。",
    chooseTheme: "テーマを選択してください。",
    light: "ライト",
    dark: "ダーク",
    system: "システム",
    appVersion: "アプリバージョン",
    framework: "フレームワーク",
    build: "ビルド",

    // Well Detail
    sampleName: "サンプル名",
    precipitant: "沈殿剤",
    salt: "塩",
    polyamine: "ポリアミン",
    buffer: "バッファー",

    // Well Status
    filled: "充填済み",
    empty: "空",
    crystal: "結晶",
    precipitate: "沈殿",
    clearStatus: "クリア",

    // My Page
    statistics: "統計",
    totalPlates: "プレート合計",
    activePlates: "アクティブプレート",
    archivedCount: "アーカイブ",
    editProfile: "プロフィール編集",

    // Edit Profile
    fullName: "氏名",
    rolePosition: "役職",
    email: "メールアドレス",
    organization: "所属",
    bio: "自己紹介",

    // Login
    samplePlateManagement: "サンプルプレート管理",
    signIn: "サインイン",
    password: "パスワード",
    continueWithGoogle: "Googleでログイン",
    noAccount: "アカウントをお持ちでない方",
    createAccount: "アカウント作成",
    alreadyHaveAccount: "すでにアカウントをお持ちの方",

    // Validation
    validationRequired: "この項目は必須です",
    validationEmailInvalid: "メールアドレスの形式が正しくありません",
    validationPasswordMin: "パスワードは6文字以上で入力してください",
    validationNameRequired: "名前を入力してください",

    // QR Code
    qrCode: "QRコード",
    downloadQr: "QRコードをダウンロード",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}

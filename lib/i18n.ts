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

    // Plate Detail
    wellMap: "WELL MAP",
    plateDetails: "PLATE DETAILS",
    plateName: "PLATE NAME",
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

    empty: "Empty",

    // My Page
    statistics: "STATISTICS",
    totalPlates: "Plates",
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

    // Trash
    trash: "Trash",
    moveToTrash: "Move to Trash",
    moving: "Moving...",
    restore: "Restore",
    restoring: "Restoring...",
    deletePermanently: "Delete Permanently",
    deleting: "Deleting...",
    trashConfirmTitle: "Move this plate to the trash?",
    trashConfirmBody:
      "It will disappear from lists and search. You can restore it from the trash on My Page.",
    purgeConfirmTitle: "Delete this plate permanently?",
    purgeConfirmBody:
      "The plate and all of its wells will be deleted. This cannot be undone.",
    inTrashBanner: "This plate is in the trash.",
    trashEmpty: "The trash is empty",
    trashedOn: "Trashed",
    actionFailed: "Something went wrong. Please try again.",
    back: "Back",
    edit: "Edit",

    // Drops
    slot: "Position",
    concentration: "Concentration",
    addDrop: "Add Drop",
    deleteDrop: "Delete Drop",
    deleteDropConfirmTitle: "Delete this drop?",
    deleteDropConfirmBody:
      "Its observations will be deleted too. This cannot be undone.",
    emptySlot: "No drop in this position.",
    slotInUse: "This position already has a drop.",
    observations: "OBSERVATIONS",
    noObservations: "No observations yet.",
    addObservation: "Add Observation",
    observedOn: "DATE",
    adding: "Adding...",
    delete: "Delete",
    close: "Close",
    hasDrop: "has a drop",
    bulkAddDrops: "Add Drops in Bulk",
    drops: "drops",
    dropsAdded: "Added",
    dropsSkipped: "Skipped (already had a drop)",
    dropBatchIncomplete:
      "Choose a position and enter the sample name and a concentration for each position.",
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

    // Plate Detail
    wellMap: "ウェルマップ",
    plateDetails: "プレート詳細",
    plateName: "プレート名",
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

    empty: "空",

    // My Page
    statistics: "統計",
    totalPlates: "プレート数",
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

    // Trash
    trash: "ゴミ箱",
    moveToTrash: "ゴミ箱に移動",
    moving: "移動中...",
    restore: "復元",
    restoring: "復元中...",
    deletePermanently: "完全に削除",
    deleting: "削除中...",
    trashConfirmTitle: "このプレートをゴミ箱に移動しますか？",
    trashConfirmBody:
      "一覧と検索に表示されなくなります。マイページのゴミ箱から復元できます。",
    purgeConfirmTitle: "このプレートを完全に削除しますか？",
    purgeConfirmBody:
      "プレートとすべてのウェルが削除されます。この操作は元に戻せません。",
    inTrashBanner: "このプレートはゴミ箱にあります。",
    trashEmpty: "ゴミ箱は空です",
    trashedOn: "移動日",
    actionFailed: "処理に失敗しました。もう一度お試しください。",
    back: "戻る",
    edit: "編集",

    // ドロップ
    slot: "置き場所",
    concentration: "濃度",
    addDrop: "ドロップを追加",
    deleteDrop: "ドロップを削除",
    deleteDropConfirmTitle: "このドロップを削除しますか？",
    deleteDropConfirmBody: "観察の記録も一緒に削除されます。元に戻せません。",
    emptySlot: "この置き場所にはドロップがありません。",
    slotInUse: "この置き場所はすでに使われています。",
    observations: "観察",
    noObservations: "まだ観察の記録がありません。",
    addObservation: "観察を追加",
    observedOn: "観察日",
    adding: "追加中...",
    delete: "削除",
    close: "閉じる",
    hasDrop: "ドロップあり",
    bulkAddDrops: "まとめて追加",
    drops: "ドロップ",
    dropsAdded: "追加",
    dropsSkipped: "スキップ（使用中）",
    dropBatchIncomplete:
      "選んだウェルに入れる置き場所・サンプル名と、置き場所ごとの濃度を入れてください。",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}

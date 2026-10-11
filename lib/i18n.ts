export type Locale = "en" | "ja";

const translations = {
  en: {
    // Navigation
    home: "Home",
    dashboard: "Dashboard",
    samples: "Samples",
    settings: "Settings",
    myPage: "My Page",
    help: "Help",
    signOut: "Sign Out",

    // Common
    searchPlates: "Search plates...",
    noPlatesFound: "No plates found",
    sortPlates: "Sort plates",
    sortUpdated: "Updated",
    sortSetupNewest: "Newest set up",
    sortSetupOldest: "Oldest set up",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",
    saveChanges: "Save Changes",
    creating: "Creating...",

    // Dashboard
    recentPlates: "RECENT PLATES",
    plates: "PLATES",
    viewAll: "View All",

    // Help
    helpContents: "CONTENTS",

    // Plate Detail
    wellMap: "WELL MAP",
    plateDetails: "PLATE DETAILS",
    plateName: "PLATE NAME",
    sampleNameLabel: "SAMPLE NAME",
    type: "Type",
    sample: "Sample",
    reservoir: "Reservoir",
    screening: "Screening",
    setupDate: "Set up",
    updated: "Updated",
    notes: "NOTES",
    noNotes: "No notes yet.",

    // New Plate
    addPlate: "Add Plate",
    plateType: "PLATE TYPE",
    condition: "CONDITION",
    wells: "wells",
    wellsSelected: "wells selected",
    createPlate: "Create Plate",
    sets: "Sets",
    newSet: "New Set",
    pickIndividually: "Pick individually",
    setName: "Set Name",
    registerSet: "Register Set",
    noConditionSets:
      'No condition sets yet. Create one in "Manage conditions".',
    manageConditions: "Manage conditions",
    selectAll: "Select All",
    clear: "Clear",
    add: "Add",
    editAfterCreation: "You can edit plate details anytime after creation.",

    // Plate Types
    plateTypes: "Plate Types",
    data: "Data",
    managePlateTypes: "Manage plate types",
    sitting: "Sitting",
    hanging: "Hanging",
    drop: "drop",
    addPlateType: "Add Plate Type",
    typeName: "TYPE NAME",
    rowsColumns: "ROWS × COLUMNS",
    rows: "Rows",
    columns: "Columns",
    rowsColumnsHint: "Rows 1-8 (A-H), columns 1-12.",
    rowsColumnsInvalid: "Rows must be 1-8 and columns 1-12.",
    dropsPerWell: "DROPS PER WELL",
    description: "DESCRIPTION",
    describePlateType: "Describe this plate type...",
    addPlateTypeFailed: "Unable to add plate type.",
    plateTypeAvailableHint:
      "This type will be available when creating new plates.",
    deletePlateTypeConfirmTitle: "Delete this plate type?",
    deletePlateTypeConfirmBody: "This cannot be undone.",
    plateTypeInUse:
      "Used by {count} plate(s), including those in the trash. It can't be deleted.",
    plateTypeInUseNoCount: "Plates use this type, so it can't be deleted.",

    // Conditions
    conditions: "Conditions",
    templates: "Templates",
    templateName: "Template name",
    deleteTemplateConfirmTitle: "Delete this template?",
    deleteTemplateConfirmBody:
      "{count} set(s) using this template will be deleted too. Plates using it will lose this condition. This cannot be undone.",
    deleteSetConfirmTitle: "Delete this condition set?",
    deleteSetConfirmBody:
      "Plates created with it keep their conditions. This cannot be undone.",
    templateUsedBySet:
      "A shared or another user's set uses this template, so it can't be deleted.",
    templateUsedByPlate:
      "Another user's plate uses this template, so it can't be deleted.",

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
    mark: "MARK",
    markPOSSIBLE: "Possible",
    markCRYSTAL: "Crystal",
    markHARVESTED: "Harvested",
    adding: "Adding...",
    delete: "Delete",
    close: "Close",
    hasDrop: "has a drop",
    drops: "drops",
    dropBatchIncomplete:
      "Choose a position and enter the sample name and a concentration for each position.",

    // Samples
    noSamples: "No samples yet. Add drops to a plate to see them here.",
    editSample: "Edit Sample",
    sampleIconLabel: "ICON",
    sampleColorLabel: "COLOR",
    sampleStyleLabel: "LOOK",
    sampleStyleSharedNote:
      "Other plates with this sample will also change to this look.",
    sampleSaveFailed: "Couldn't save the sample.",
    mergeSampleConfirmTitle: "Merge into “{name}”?",
    mergeSampleConfirmBody:
      "“{name}” already exists. {count} drops will be renamed, and the icon and color of “{name}” will be kept. This cannot be undone.",
    merge: "Merge",
    merging: "Merging...",
    sampleDuplicates: "NAME VARIANTS",
    allSamples: "ALL SAMPLES",
    sampleDuplicatesHint:
      "These names differ only in case, full/half width, spaces or separators. Tap the name to keep to merge the others into it.",
    mergeDuplicatesConfirmBody:
      "{count} drops named {others} will be renamed to “{name}”, and the icon and color of “{name}” will be kept. Drops on plates in the trash are renamed too. This cannot be undone.",
    sampleMergeFailed: "Couldn't merge the samples.",
    iconFlask: "Flask",
    iconTestTube: "Test tube",
    iconDna: "DNA",
    iconAtom: "Atom",
    iconMicroscope: "Microscope",
    iconDroplet: "Droplet",
    iconGem: "Gem",
    iconLeaf: "Leaf",
    colorGray: "Gray",
    colorRed: "Red",
    colorOrange: "Orange",
    colorYellow: "Yellow",
    colorGreen: "Green",
    colorTeal: "Teal",
    colorBlue: "Blue",
    colorPurple: "Purple",
    // CSV の取り込み
    importCsv: "Import from CSV",
    importIntro:
      'Register plates, drops and observations at once from a CSV in a fixed format. Download the template, fill it in with Excel, and save it as "CSV UTF-8" or "CSV".',
    downloadTemplate: "Download template",
    chooseCsv: "Choose a CSV file",
    importErrors: "ROWS TO FIX",
    importPreview: "TO BE IMPORTED",
    importLine: "Row {line}:",
    importMoreErrors: "and {count} more",
    importCounts: "{drops} drops · {observations} observations",
    importPlates: "Import {count} plates",
    importing: "Importing...",
    importErrEmpty: "The file has no rows.",
    importErrMissingColumn: 'The "{column}" column is missing.',
    importErrTooManyRows: "You can import up to {rows} rows at a time.",
    importErrTooManyPlates: "You can import up to {plates} plates at a time.",
    importErrRequired: '"{column}" is empty.',
    importErrTooLong: '"{column}" is too long.',
    importErrConflict:
      '"{column}" differs from other rows of the same plate or drop: {value}',
    importErrUnknownPlateType: 'There is no plate type named "{value}".',
    importErrAmbiguousPlateType: 'More than one plate type is named "{value}".',
    importErrUnknownTemplate: 'There is no condition named "{value}".',
    importErrAmbiguousTemplate: 'More than one condition is named "{value}".',
    importErrInvalidDate:
      'Cannot read the date in "{column}": {value} (use 2026-08-01 or 2026/8/1)',
    importErrInvalidWell: 'Well "{value}" is not on this plate.',
    importErrInvalidSlot: 'Slot "{value}" is not on this plate.',
    importErrInvalidMark:
      'Unknown mark "{value}" (use POSSIBLE, CRYSTAL or HARVESTED).',
    importErrObservationNeedsContent: "An observation needs a mark or a note.",
    conditionCount: "{count} conditions",
    conditionEmpty: "No conditions yet",
    templateNotFound: "Template not found",
    templateShared: "Shared",
    templateWellsIntro:
      "Upload a CSV with one well per row (well, salt, precipitant, polyamine, buffer). The current conditions are replaced.",
    templateWellsSharedNote: "Shared templates can't be changed.",
    exportConditionsCsv: "Download as CSV",
    replaceConditions: "Replace with {count} conditions",
    replacingConditions: "Replacing...",
    replaceConditionsConfirmTitle: "Replace the conditions?",
    replaceConditionsConfirmBody:
      "The current {current} conditions will be replaced with {count} from the file.",
    conditionErrTooManyRows: "A template holds up to {rows} wells.",
    conditionErrInvalidWell: 'Write the well "{value}" as A1 to H12.',
    conditionErrDuplicateWell: 'Well "{value}" appears more than once.',
    conditionErrEmptyCondition: "All four conditions are empty.",
  },
  ja: {
    // Navigation
    home: "ホーム",
    dashboard: "ダッシュボード",
    samples: "サンプル",
    settings: "設定",
    myPage: "マイページ",
    help: "ヘルプ",
    signOut: "サインアウト",

    // Common
    searchPlates: "プレートを検索...",
    noPlatesFound: "プレートが見つかりません",
    sortPlates: "並べ方",
    sortUpdated: "更新が新しい",
    sortSetupNewest: "仕込みが新しい",
    sortSetupOldest: "仕込みが古い",
    cancel: "キャンセル",
    save: "保存",
    saving: "保存中...",
    saveChanges: "変更を保存",
    creating: "作成中...",

    // Dashboard
    recentPlates: "最近のプレート",
    plates: "プレート",
    viewAll: "すべて表示",

    // ヘルプ
    helpContents: "目次",

    // Plate Detail
    wellMap: "ウェルマップ",
    plateDetails: "プレート詳細",
    plateName: "プレート名",
    sampleNameLabel: "サンプル名",
    type: "タイプ",
    sample: "サンプル",
    reservoir: "リザーバー",
    screening: "スクリーニング",
    setupDate: "仕込み日",
    updated: "更新日",
    notes: "メモ",
    noNotes: "メモはまだありません",

    // New Plate
    addPlate: "プレート追加",
    plateType: "プレートタイプ",
    condition: "条件",
    wells: "ウェル",
    wellsSelected: "ウェル選択済み",
    createPlate: "プレートを作成",
    sets: "セット",
    newSet: "新規セット",
    pickIndividually: "個別に選ぶ",
    setName: "セット名",
    registerSet: "セットを登録",
    noConditionSets:
      "条件セットがありません。「条件を管理」から作成してください。",
    manageConditions: "条件を管理",
    selectAll: "すべて選択",
    clear: "クリア",
    add: "追加",
    editAfterCreation: "作成後いつでもプレートの詳細を編集できます。",

    // Plate Types
    plateTypes: "プレートタイプ",
    data: "データ",
    managePlateTypes: "プレートタイプを管理",
    sitting: "シッティング",
    hanging: "ハンギング",
    drop: "ドロップ",
    addPlateType: "プレートタイプを追加",
    typeName: "タイプ名",
    rowsColumns: "行 × 列",
    rows: "行",
    columns: "列",
    rowsColumnsHint: "行は 1〜8（A〜H）、列は 1〜12。",
    rowsColumnsInvalid: "行は 1〜8、列は 1〜12 で入れてください。",
    dropsPerWell: "1ウェルのドロップ数",
    description: "説明",
    describePlateType: "このプレートタイプの説明",
    addPlateTypeFailed: "プレートタイプを追加できませんでした。",
    plateTypeAvailableHint: "プレートを作るときに選べるようになります。",
    deletePlateTypeConfirmTitle: "このプレートタイプを削除しますか？",
    deletePlateTypeConfirmBody: "元に戻せません。",
    plateTypeInUse:
      "{count} 枚のプレートで使っています（ゴミ箱を含む）。削除できません。",
    plateTypeInUseNoCount: "プレートで使っているため、削除できません。",

    // Conditions
    conditions: "条件",
    templates: "テンプレート",
    templateName: "テンプレート名",
    deleteTemplateConfirmTitle: "このテンプレートを削除しますか？",
    deleteTemplateConfirmBody:
      "このテンプレートを使うセット {count} 件も消えます。使っているプレートの条件は空になります。元に戻せません。",
    deleteSetConfirmTitle: "この条件セットを削除しますか？",
    deleteSetConfirmBody:
      "このセットで作ったプレートの条件はそのまま残ります。元に戻せません。",
    templateUsedBySet:
      "共有セットか他の人のセットが使っているため、削除できません。",
    templateUsedByPlate: "他の人のプレートが使っているため、削除できません。",

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
    mark: "目印",
    markPOSSIBLE: "怪しい",
    markCRYSTAL: "結晶あり",
    markHARVESTED: "結晶取り済み",
    adding: "追加中...",
    delete: "削除",
    close: "閉じる",
    hasDrop: "ドロップあり",
    drops: "ドロップ",
    dropBatchIncomplete:
      "選んだウェルに入れる置き場所・サンプル名と、置き場所ごとの濃度を入れてください。",

    // サンプル
    noSamples:
      "まだサンプルがありません。プレートにドロップを入れると、ここに並びます。",
    editSample: "サンプルを編集",
    sampleIconLabel: "アイコン",
    sampleColorLabel: "色",
    sampleStyleLabel: "見た目",
    sampleStyleSharedNote:
      "このサンプルが入っている他のプレートも、この見た目に変わります。",
    sampleSaveFailed: "サンプルを保存できませんでした。",
    mergeSampleConfirmTitle: "「{name}」にまとめますか？",
    mergeSampleConfirmBody:
      "「{name}」はすでにあります。ドロップ{count}件の名前が変わり、アイコンと色は「{name}」のものが残ります。元に戻せません。",
    merge: "まとめる",
    merging: "まとめています...",
    sampleDuplicates: "名前の揺れ",
    allSamples: "すべてのサンプル",
    sampleDuplicatesHint:
      "大文字小文字・全角半角・空白や区切りだけが違う名前です。残す名前を押すと、ほかの名前をまとめられます。",
    mergeDuplicatesConfirmBody:
      "{others}のドロップ{count}件の名前が「{name}」に変わり、アイコンと色は「{name}」のものが残ります。ゴミ箱のプレートのドロップも変わります。元に戻せません。",
    sampleMergeFailed: "サンプルをまとめられませんでした。",
    iconFlask: "フラスコ",
    iconTestTube: "試験管",
    iconDna: "DNA",
    iconAtom: "原子",
    iconMicroscope: "顕微鏡",
    iconDroplet: "しずく",
    iconGem: "結晶",
    iconLeaf: "葉",
    colorGray: "グレー",
    colorRed: "赤",
    colorOrange: "オレンジ",
    colorYellow: "黄",
    colorGreen: "緑",
    colorTeal: "青緑",
    colorBlue: "青",
    colorPurple: "紫",
    // CSV の取り込み
    importCsv: "CSV から取り込む",
    importIntro:
      "決まった形の CSV から、プレートとドロップ、観察をまとめて登録します。テンプレートをダウンロードして Excel で埋め、「CSV UTF-8」か「CSV」で保存してください。",
    downloadTemplate: "テンプレートをダウンロード",
    chooseCsv: "CSV ファイルを選ぶ",
    importErrors: "直す必要がある行",
    importPreview: "取り込む内容",
    importLine: "{line} 行目:",
    importMoreErrors: "ほか {count} 件",
    importCounts: "ドロップ {drops} · 観察 {observations}",
    importPlates: "{count} 枚を取り込む",
    importing: "取り込み中...",
    importErrEmpty: "ファイルに行がありません。",
    importErrMissingColumn: "「{column}」の列がありません。",
    importErrTooManyRows: "1回に取り込めるのは {rows} 行までです。",
    importErrTooManyPlates: "1回に取り込めるのは {plates} 枚までです。",
    importErrRequired: "「{column}」が空です。",
    importErrTooLong: "「{column}」が長すぎます。",
    importErrConflict:
      "「{column}」が、同じプレートかドロップのほかの行と違います: {value}",
    importErrUnknownPlateType: "プレートタイプ「{value}」がありません。",
    importErrAmbiguousPlateType:
      "プレートタイプ「{value}」が複数あり、1つに決まりません。",
    importErrUnknownTemplate: "条件「{value}」がありません。",
    importErrAmbiguousTemplate:
      "条件「{value}」が複数あり、1つに決まりません。",
    importErrInvalidDate:
      "「{column}」の日付が読めません: {value}（2026-08-01 か 2026/8/1 の形で）",
    importErrInvalidWell: "ウェル「{value}」はこのプレートにありません。",
    importErrInvalidSlot: "置き場所「{value}」はこのプレートにありません。",
    importErrInvalidMark:
      "目印「{value}」は使えません（怪しい・結晶あり・結晶取り済み）。",
    importErrObservationNeedsContent: "観察には目印かメモが要ります。",
    conditionCount: "{count} 条件",
    conditionEmpty: "中身なし",
    templateNotFound: "テンプレートが見つかりません",
    templateShared: "共有",
    templateWellsIntro:
      "1行に1ウェルの CSV（ウェル・塩・沈殿剤・ポリアミン・バッファー）で中身を入れます。取り込むと、今の中身は置き換わります。",
    templateWellsSharedNote: "共有のテンプレートは変えられません。",
    exportConditionsCsv: "CSV を書き出す",
    replaceConditions: "{count} 件の条件で置き換える",
    replacingConditions: "置き換え中...",
    replaceConditionsConfirmTitle: "中身を置き換えますか？",
    replaceConditionsConfirmBody:
      "今の {current} 件の条件を、ファイルの {count} 件に置き換えます。",
    conditionErrTooManyRows:
      "1つのテンプレートに入れられるのは {rows} ウェルまでです。",
    conditionErrInvalidWell: "ウェル「{value}」は A1〜H12 で書いてください。",
    conditionErrDuplicateWell: "ウェル「{value}」が2回以上出てきます。",
    conditionErrEmptyCondition: "4つの条件がすべて空です。",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}

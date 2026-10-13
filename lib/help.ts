import type { Locale } from "@/lib/i18n";

// ヘルプページの中身。文章が長く、手順やリストの形を持つので、i18n.ts の
// 1行の文言とは分けてここに置く
export interface HelpTopic {
  id: string;
  title: string;
  // 手順の前に置く説明
  intro?: string;
  // 番号つきの手順。見出しつきで複数並べられる（iPhone と Android など）
  steps?: { heading?: string; items: string[] }[];
  // 補足と注意
  notes?: string[];
  // 手順の代わりに、写真つきの「ホーム画面に追加」の案内（components/home-screen-guide.tsx）を出す
  homeScreenGuide?: boolean;
}

const helpTopics: Record<Locale, HelpTopic[]> = {
  ja: [
    {
      id: "home-screen",
      title: "スマホのホーム画面に追加する",
      intro:
        "PLATE LAB はブラウザで使う Web アプリです。ホーム画面に追加すると、アイコンから開けて、アドレスバーの無い全画面で使えます。App Store や Google Play からのインストールは要りません。ブラウザで plate-manage-app.vercel.app を開いてログインし、次の手順で追加してください。",
      homeScreenGuide: true,
      notes: [
        "iPhone では、ホーム画面から開いた PLATE LAB とブラウザとで、ログインの状態が別になります。ホーム画面から初めて開いたときは、もう一度ログインしてください。",
        "カメラで QR コードを読むと、ホーム画面のアイコンではなくブラウザで開きます。ブラウザ側でもログインしておくと、すぐに詳細画面が見られます。",
        "データはサーバーに保存されるので、パソコンとスマホのどちらで入れても同じプレートが見えます。",
      ],
    },
    {
      id: "create-plate",
      title: "プレートを作る",
      steps: [
        {
          items: [
            "ホームの右下にある＋ボタンを押す",
            "プレート名と仕込み日を入れ、プレートタイプを選ぶ",
            "ウェルマップでドロップを入れたウェルを選び、置き場所・サンプル名・濃度を入れる（同じサンプルをまとめて入れられる）",
            "条件をセットから選ぶか、「個別に選ぶ」でリザーバーとスクリーニングを選ぶ",
            "必要ならメモを書き、「プレートを作成」を押す",
          ],
        },
      ],
      notes: [
        "ウェルとサンプルは作ったあとでも詳細画面から足せます。",
        "使いたいプレートタイプや条件が無いときは、設定から追加できます。",
      ],
    },
    {
      id: "qr-code",
      title: "QR コードをプレートに貼る",
      steps: [
        {
          items: [
            "プレートの詳細画面を下までスクロールし、「QRコードを保存」を押す。スマホでは共有の画面が開くので、「画像を保存」（印刷するなら「プリント」）を選ぶ",
            "保存した画像を印刷し、プレートに貼る",
            "スマホのカメラで QR コードを読むと、そのプレートの詳細画面が開く",
          ],
        },
      ],
      notes: [
        "ログインしていないときはログイン画面が出ます。ログインするとホームに戻るので、もう一度 QR コードを読んでください。",
      ],
    },
    {
      id: "drops",
      title: "ドロップと観察を記録する",
      steps: [
        {
          items: [
            "詳細画面のウェルマップで、ウェルを押す",
            "置き場所を選び、サンプル名・濃度・メモを入れて「ドロップを追加」を押す",
            "「観察を追加」で、観察日・目印・メモを記録する",
          ],
        },
      ],
      notes: [
        "目印は「怪しい」「結晶あり」「結晶取り済み」の3つです。付けた目印はウェルマップに輪で出るので、どのウェルが結晶化したかが一目で分かります。",
        "ドロップを削除すると、その観察の記録も一緒に消えます。",
      ],
    },
    {
      id: "edit-plate",
      title: "プレートを書き換える",
      steps: [
        {
          items: [
            "詳細画面の右上の鉛筆を押す",
            "プレート名・仕込み日・条件を変え、「変更を保存」を押す",
          ],
        },
      ],
      notes: [
        "メモは鉛筆を押さなくても、詳細画面のメモ欄でその場で書き換えられます。",
      ],
    },
    {
      id: "samples",
      title: "サンプルを探す・見た目を変える",
      intro:
        "メニューの「サンプル」に、ドロップに入れたサンプルが並びます。サンプル名で検索すると、そのサンプルを使っているプレートが見つかります。",
      notes: [
        "ホームとサンプルの一覧は、検索欄の下で並べ方を変えられます（更新が新しい・仕込みが新しい・仕込みが古い）。選んだ並べ方は、この端末で覚えておきます。",
        "ホームとサンプルの検索は、プレート名・サンプル名・メモを探します。3文字以上で検索すると、「lysozme」のような打ち間違いや表記の揺れがあっても、似ているプレートが、ぴったり当たったプレートのあとに続けて出ます。",
        "詳細画面のサンプル欄でサンプルを押すと、名前とアイコン・色を変えられます。設定の「サンプル」からも変えられます。",
        "サンプルの名前や見た目を変えると、そのサンプルが入っている他のプレートにも反映されます。",
        "「lysozyme」と「Lysozyme」のように、大文字小文字・全角半角・空白や区切りだけが違う名前は、設定の「サンプル」の「名前の揺れ」に出ます。残す名前を押すと、ほかの名前をまとめられます。",
      ],
    },
    {
      id: "trash",
      title: "プレートを消す・戻す",
      steps: [
        {
          items: [
            "詳細画面の右上の鉛筆を押し、「ゴミ箱に移動」を押す",
            "戻したいときは、マイページの「ゴミ箱」を開いて「復元」を押す",
          ],
        },
      ],
      notes: [
        "ゴミ箱で「完全に削除」したプレートは、ウェルや観察も含めて元に戻せません。",
      ],
    },
    {
      id: "import",
      title: "手元のプレートを CSV でまとめて登録する",
      intro:
        "アプリを使う前からあるプレートは、決まった形の CSV からまとめて登録できます。1行に1つのドロップを書き、同じプレート名の行が1枚のプレートになります。",
      steps: [
        {
          items: [
            "設定の「CSV から取り込む」を開き、「テンプレートをダウンロード」を押す",
            "テンプレートを Excel で開き、例の行を消して自分のプレートを書く",
            "「CSV UTF-8」か「CSV」で保存し、「CSV ファイルを選ぶ」で選ぶ",
            "取り込む内容を確かめ、「取り込む」を押す",
          ],
        },
      ],
      notes: [
        "同じプレートの2行目以降は、プレートタイプや仕込み日を空にしてかまいません。",
        "観察を入れるときは、同じウェル・置き場所の行を観察の数だけ並べ、観察日と目印かメモを書きます。観察の列は空でもかまいません。",
        "直す必要がある行があると、行番号と理由が出て、取り込めません。直して選び直してください。",
        "既にあるプレートと同じ名前でも、新しいプレートとして登録されます。",
      ],
    },
    {
      id: "condition-template",
      title: "自分の条件テンプレートに中身を入れる",
      intro:
        "自分で作った条件テンプレートには、ウェルごとの条件（塩・沈殿剤・ポリアミン・バッファー）を CSV で入れられます。入れた条件は、そのテンプレートを使うプレートのウェルを押すと出ます。",
      steps: [
        {
          items: [
            "設定の「条件」を開き、テンプレートを押す",
            "「CSV を書き出す」を押し、Excel で開いて1行に1ウェルずつ書く",
            "保存して「CSV ファイルを選ぶ」で選び、内容を確かめて置き換える",
          ],
        },
      ],
      notes: [
        "取り込むと、今の中身はファイルの中身にまるごと置き換わります。",
        "共有のテンプレート（PEG・MPD など）は、中身を見られますが変えられません。",
      ],
    },
    {
      id: "notifications",
      title: "通知を受け取る",
      intro:
        "プレートを観察する時期を、スマホやパソコンに通知で知らせます。毎朝9時台に、仕込みからプレートごとに決めた日数（既定は7日目）になったプレートを、1通にまとめて知らせます。その日以降にもう観察を付けていれば知らせません。30日観察していないプレートも、1回だけ知らせます。プレートのメモを書き換えた日も、観察した日とみなします。何かの都合で送れなかった日があっても、3日のうちなら翌朝以降に知らせます。通知は端末ごとにオンにします。",
      steps: [
        {
          items: [
            "メニューの「設定」を開く",
            "「通知」の「この端末で通知を受ける」をオンにする",
            "通知の許可を求められたら「許可」を押す",
            "「テスト通知を送る」を押し、通知が届くことを確かめる",
          ],
        },
      ],
      notes: [
        "iPhone では、ホーム画面に追加した PLATE LAB からしか通知を受け取れません（iOS 16.4 以降）。先にホーム画面に追加し、そこから開いてオンにしてください。",
        "許可を断ったときは、端末かブラウザの設定で PLATE LAB の通知を許可すると、オンにできるようになります。",
        "何日目に知らせるかは、プレートを作るときの「観察のリマインド」で決めます。あとからプレートの編集でも変えられ、プレートごとに「知らせない」にもできます。",
        "設定の「観察のリマインド」をオフにすると、すべてのプレートのリマインドが止まります。",
        "設定の「観察していないプレート」をオフにすると、30日観察していないプレートの知らせが止まります。",
      ],
    },
    {
      id: "settings",
      title: "設定を変える",
      intro:
        "メニューの「設定」で、言語（日本語・英語）と外観（ライト・ダーク・システム）を変えられます。プレートタイプ・条件・サンプルの追加や削除もここから行います。",
    },
  ],
  en: [
    {
      id: "home-screen",
      title: "Add to your phone's home screen",
      intro:
        "PLATE LAB is a web app that runs in your browser. Add it to your home screen to open it from an icon, full screen, without the address bar. No App Store or Google Play install is needed. Open plate-manage-app.vercel.app in your browser, sign in, and follow these steps.",
      homeScreenGuide: true,
      notes: [
        "On iPhone, PLATE LAB opened from the home screen does not share its sign-in with the browser. Sign in again the first time you open it from the home screen.",
        "Scanning a QR code with the camera opens it in the browser, not in the home screen app. Stay signed in to the browser too, so plate pages open right away.",
        "Your data is stored on the server, so the same plates show up on your computer and your phone.",
      ],
    },
    {
      id: "create-plate",
      title: "Create a plate",
      steps: [
        {
          items: [
            "Tap the + button at the bottom right of Home",
            "Enter the plate name and set-up date, and choose a plate type",
            "Select the wells with drops on the well map, then enter the slot, sample name and concentration (you can fill many wells with the same sample at once)",
            'Choose a condition set, or use "Pick individually" to choose the reservoir and screening',
            'Add notes if needed, then tap "Create Plate"',
          ],
        },
      ],
      notes: [
        "You can add wells and samples later from the plate page.",
        "If the plate type or condition you need is missing, add it in Settings.",
      ],
    },
    {
      id: "qr-code",
      title: "Put a QR code on a plate",
      steps: [
        {
          items: [
            'Scroll to the bottom of the plate page and tap "Save QR Code". On a phone, the share sheet opens; choose "Save Image" (or "Print")',
            "Print the saved image and stick it on the plate",
            "Scan the QR code with your phone's camera to open that plate's page",
          ],
        },
      ],
      notes: [
        "If you are signed out, the sign-in screen appears. After signing in you land on Home, so scan the QR code again.",
      ],
    },
    {
      id: "drops",
      title: "Record drops and observations",
      steps: [
        {
          items: [
            "Tap a well on the plate page's well map",
            'Choose a slot, enter the sample name, concentration and notes, and tap "Add Drop"',
            'Use "Add Observation" to record the date, a mark and notes',
          ],
        },
      ],
      notes: [
        'There are three marks: "Possible", "Crystal" and "Harvested". Marks show as rings on the well map, so you can see at a glance which wells crystallized.',
        "Deleting a drop also deletes its observations.",
      ],
    },
    {
      id: "edit-plate",
      title: "Edit a plate",
      steps: [
        {
          items: [
            "Tap the pencil at the top right of the plate page",
            'Change the name, set-up date or conditions, and tap "Save Changes"',
          ],
        },
      ],
      notes: [
        "You can edit notes in place on the plate page without tapping the pencil.",
      ],
    },
    {
      id: "samples",
      title: "Find samples and change their look",
      intro:
        '"Samples" in the menu lists the samples in your drops. Search by sample name to find the plates that use it.',
      notes: [
        "Below the search box on Home and Samples, you can change the order of plates (Updated, Newest set up, Oldest set up). This device remembers your choice.",
        'Search on Home and Samples looks at plate names, sample names and notes. With 3 or more characters, plates that are similar to your search follow the exact matches, even with a typo like "lysozme".',
        "Tap a sample in the plate page's Samples section to change its name, icon and color. You can also do this from Samples in Settings.",
        "Changing a sample's name or look applies to every plate that contains it.",
        'Names that differ only in case, full/half width, spaces or separators, such as "lysozyme" and "Lysozyme", appear under Name variants in Samples in Settings. Tap the name to keep to merge the others into it.',
      ],
    },
    {
      id: "trash",
      title: "Delete and restore plates",
      steps: [
        {
          items: [
            'Tap the pencil at the top right of the plate page, then "Move to Trash"',
            'To bring it back, open "Trash" on My Page and tap "Restore"',
          ],
        },
      ],
      notes: [
        'A plate removed with "Delete Permanently" cannot be restored, including its wells and observations.',
      ],
    },
    {
      id: "import",
      title: "Register many plates from a CSV",
      intro:
        "Plates you had before using the app can be registered at once from a CSV in a fixed format. Write one drop per row; rows with the same plate name become one plate.",
      steps: [
        {
          items: [
            'Open "Import from CSV" in Settings and tap "Download template"',
            "Open the template in Excel, delete the example rows and write your plates",
            'Save as "CSV UTF-8" or "CSV", then pick it with "Choose a CSV file"',
            'Check what will be imported and tap "Import"',
          ],
        },
      ],
      notes: [
        "After the first row of a plate, you can leave the plate type and set-up date empty.",
        "To add observations, repeat the row of the same well and slot once per observation, with the date and a mark or a note. The observation columns can be left empty.",
        "If some rows need fixing, their row numbers and reasons are shown and nothing is imported. Fix them and choose the file again.",
        "A plate with the same name as an existing one is registered as a new plate.",
      ],
    },
    {
      id: "condition-template",
      title: "Fill in your own condition template",
      intro:
        "Your own condition templates can hold a condition for each well (salt, precipitant, polyamine and buffer), uploaded as a CSV. The condition shows when you tap a well on a plate that uses the template.",
      steps: [
        {
          items: [
            'Open "Conditions" in Settings and tap a template',
            'Tap "Download as CSV", open it in Excel and write one well per row',
            'Save it, pick it with "Choose a CSV file", check the contents and replace',
          ],
        },
      ],
      notes: [
        "Importing replaces all current conditions with the file's contents.",
        "Shared templates (such as PEG and MPD) can be viewed but not changed.",
      ],
    },
    {
      id: "notifications",
      title: "Get notifications",
      intro:
        "PLATE LAB can notify your phone or computer when it's time to observe your plates. Every morning (9–10 a.m. Japan time), it sends one notification listing the plates that reached the day you set for them (day 7 by default). Plates you have observed since that day are left out. It also tells you once about plates that have gone 30 days without an observation. Editing a plate's notes counts as observing it. If a notification could not be sent, it follows on a later morning within 3 days. Turn notifications on for each device.",
      steps: [
        {
          items: [
            'Open "Settings" from the menu',
            'Under "Notifications", turn on "Notifications on this device"',
            'When asked for permission, choose "Allow"',
            'Tap "Send a test notification" and check that it arrives',
          ],
        },
      ],
      notes: [
        "On iPhone, only PLATE LAB added to your home screen can receive notifications (iOS 16.4 or later). Add it to your home screen first, open it from there, and then turn notifications on.",
        "If you declined permission, allow notifications for PLATE LAB in your device or browser settings to turn them on.",
        'Choose the day under "Observation reminder" when you create a plate. You can change it, or turn it off for that plate, when you edit the plate later.',
        'Turning off "Observation reminder" in Settings stops reminders for all plates.',
        'Turning off "Unobserved plates" in Settings stops notifications about plates left for 30 days.',
      ],
    },
    {
      id: "settings",
      title: "Change settings",
      intro:
        '"Settings" in the menu changes the language (English or Japanese) and appearance (Light, Dark or System). You also add and delete plate types, conditions and samples there.',
    },
  ],
};

export function getHelpTopics(locale: Locale): HelpTopic[] {
  return helpTopics[locale] ?? helpTopics.en;
}

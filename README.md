# One File Sheet

1つのHTMLファイルだけで動く自己保存型スプレッドシート。アプリとデータが同じファイルに入っているので、AIエージェントが直接読み書きでき、共有も1ファイルで済みます。

日本語 | [English](README.en.md)

![One File Sheet](screenshot.png)

**[▶ デモを開く](https://firemio.github.io/OneFileSheet/OneFileSheet.html)** / **[⬇ ダウンロード](https://github.com/firemio/OneFileSheet/releases/latest)** — `OneFileSheet.html` をブラウザで開くだけ。

## なぜ作ったか

xls やクラウドにある表は、AIエージェントに読ませるのも diff を取るのも面倒。だからアプリごと1ファイルのJSONにしました。

## 特徴

- **1ファイル完結・約24KB** — サーバー・インストール・`localStorage` 不使用。データはHTML内のJSON
- **自己保存** — Chrome / Edge はファイル自身に上書き保存(Ctrl+S)。他ブラウザは自動でHTMLダウンロードに切替
- **表計算の基本操作** — 複数シート、Excel / Googleスプレッドシートからの範囲貼り付け、行/列の挿入・削除、Undo / Redo、Alt+Enterでセル内改行
- **クイック統計** — ヘッダーのグラフアイコンで合計・平均・件数・最大・最小。セルには何も書き込まない
- **数千行でも軽快** — 仮想スクロール描画、行・列ヘッダー固定
- **テーマ43種 + 日英UI** — 選択はファイルに保存され、共有先でも同じ見た目
- **AIエージェント親和** — 整形済みJSON、編集規約(AGENT NOTES)を同梱、外部編集との競合は保存時に検知

## こんな用途に

| 用途 | ポイント |
|---|---|
| AIエージェントの作業台帳 | JSONを直接読み書き。`git diff` で変更が追える |
| リポジトリ同梱の管理表 | API台帳・テスト表・チェックリストをPRでレビュー |
| 配って・記入して・回収する調査票 | 相手はブラウザで開くだけ。Excel不要 |
| オフライン・制限環境の帳票 | ブラウザさえあれば動く。USBメモリで持ち運べる |
| 家計簿・経費メモ | クイック統計で合計・平均が即見える |

不向き: 機密情報(平文保存)、数式が本体の業務、数万行規模。

## 使い方

1. `OneFileSheet.html` をブラウザで開いて編集
2. Ctrl+S で保存。初回だけこのファイル自身を選択(以後ワンクリック)
3. 別のファイルを開くには、直接ブラウザで開くか、ページにドラッグ&ドロップ

## データ形式

実データは `<script id="sheet-data">` 内のJSONだけ。編集後のHTML自体がデータファイルです。

```html
<script id="sheet-data" type="application/json">
{ "title": "...", "theme": "auto", "lang": "auto", "activeSheet": 0,
  "sheets": [ { "name": "Sheet1", "data": [["見出し1", "見出し2"], ["値", "値"]] } ] }
</script>
```

AIエージェントにはファイルを渡すだけで通じます(AGENT NOTES同梱)。確実に伝えたい場合のコピペ指示:

```text
この OneFileSheet.html は1ファイル完結のスプレッドシートです。約24KBありますが、
大部分は圧縮されたアプリ本体なので無視してください。
実データは <script id="sheet-data" type="application/json"> ブロック内のJSONだけです。

形式: { "title", "theme", "lang", "activeSheet", "sheets": [ { "name", "data" } ] }
- 各シートの data は文字列の2次元配列で、data[0] が見出し行(全行同じ長さ)
- 編集してよいのはこのJSONのみ。開始タグは変更せず、JSON.stringify(doc, null, 2) の整形を維持
- セル値に "<" を含める場合は \u003c と書く
```

## 開発

可読ソースは [src/OneFileSheet.html](src/OneFileSheet.html)。`npm install`(初回のみ・ビルド専用)→ `node build.js` で minify + 圧縮した配布用ファイルを生成。アプリの実行時依存はゼロ。

[MIT License](LICENSE)

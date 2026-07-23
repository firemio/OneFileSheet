# One File Sheet

1つのHTMLファイルだけで動く自己保存型スプレッドシート。アプリとデータが同じファイルに入っているので、AIエージェントが直接読み書きでき、共有も1ファイルで済みます。xls やクラウド上の表はエージェントに読ませるのも diff を取るのも面倒 — だからアプリごと1ファイルのJSONにしました。

日本語 | [English](README.en.md)

![One File Sheet デモ: 入力・クイック統計・Amberテーマ](demo.gif)

**[▶ デモを開く](https://firemio.github.io/OneFileSheet/OneFileSheet.html)** / **[⬇ ダウンロード](https://github.com/firemio/OneFileSheet/releases/latest)** — `OneFileSheet.html` をブラウザで開くだけ。

## 特徴

- **1ファイル完結・約24KB** — サーバー・インストール・`localStorage` 不使用。データはHTML内のJSON
- **自己保存** — Chrome / Edge はファイル自身に上書き(Ctrl+S)。他ブラウザはHTMLダウンロードに自動で切替
- **表計算の基本操作** — 複数シート、Excel / Googleスプレッドシートからの範囲貼り付け、行/列の挿入・削除、Undo / Redo、Alt+Enterでセル内改行
- **クイック統計** — ヘッダーのグラフアイコンで合計・平均・件数・最大・最小。セルには何も書き込まない
- **数千行でも軽快** — 仮想スクロール描画、行・列ヘッダー固定
- **テーマ47種 + 日英UI** — 選択はファイルに保存され、共有先でも同じ見た目
- **AIエージェント親和** — 整形済みJSON、編集規約(AGENT NOTES)を同梱、外部編集との競合は保存時に検知

## こんな用途に

| 用途 | 具体例 |
|---|---|
| エージェントに書かせて、人が直す | 「競合30社の料金をこの表に追記して」。エージェントは `sheet-data` のJSONを、人はブラウザを触る。空の表を渡せば、そのままLLMの出力フォーマット指定になる |
| CIが追記し、gitが履歴を持つ | 毎晩のベンチ結果を1行append。PRのdiffで数値の劣化が読め、巻き戻しは `git revert` |
| 開けば最新のダッシュボードを配る | 夜間バッチが `sheet-data` を差し替えて共有フォルダやPagesへ置くだけ。見る側はブックマークを開くだけで、サーバーもログインもない |
| 女の子たちに表を渡す | .md を送ったら「なにこれ？」。マークダウンビューア？IDE？入ってるわけない。あるのはブラウザだけ。ダブルクリックで表になり、1マス直して返ってくる |
| 閉域・オフラインで記録する | 回線のない客先のノートPC、USBで持ち出す点検表、インストール審査が通らない端末。ブラウザさえあれば動く |

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

# One File Sheet

One File Sheet は、1つのHTMLファイルだけで動く簡易スプレッドシートです。

サーバーやインストールは不要です。表データは `OneFileSheet.html` 内の JSON として保存され、ブラウザの `localStorage` は使いません。

## なぜ作ったか

ちょっとした表データが xls や Google スプレッドシートに入っていると、AI エージェントに中身を探させたり、編集内容の diff を取ったりするのが面倒です。

One File Sheet は、現代の LLM がそのまま扱いやすい HTML に、表計算アプリとデータを1ファイルでまとめます。アプリ本体とデータが同じファイルにあるため、AI エージェントで読み書きしやすく、応用や共有もしやすくなります。

## 特徴

- 1ファイル完結のHTMLアプリ
- サーバー不要
- `localStorage` 不使用
- セルの直接編集
- 行追加・列追加
- 選択したHTMLファイルへの上書き保存
- Chrome / Edge 対応

## 使い方

1. `OneFileSheet.html` を Chrome または Edge で開きます。
2. 「このHTMLを開く」を押します。
3. `OneFileSheet.html` を選択します。
4. 表を編集します。
5. 必要に応じて「行追加」「列追加」を押します。
6. 「上書き保存」を押すと、同じHTMLファイル内のデータが更新されます。

## データの保存場所

表データは、HTML内の次の要素に JSON として保存されます。

```html
<script id="sheet-data" type="application/json">
...
</script>
```

そのため、編集後の `OneFileSheet.html` 自体がデータファイルでもあります。

## 注意

このツールは File System Access API を使って、ユーザーが選択したHTMLファイルへ書き込みます。

Firefox / Safari では File System Access API に対応していない場合があるため、Chrome または Edge での利用を推奨します。

ブラウザの仕様上、HTMLファイル自身を自動で勝手に書き換えることはできません。最初に「このHTMLを開く」から保存対象のファイルを選択し、保存許可を与える必要があります。

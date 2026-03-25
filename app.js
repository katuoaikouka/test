const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// --- 設定: 利用するInvidiousインスタンスのリスト ---
// 1つ目のサーバーがダメなら2つ目...というように自動で試行します
const INVIDIOUS_INSTANCES = [
    'https://yt.omada.cafe',
    'https://invidious.f5.si',
    'https://invidious.drgns.space',
    'https://vid.puffyan.us',
    'https://yewtu.be'
];

// 静的ファイルの提供（publicフォルダ内のindex.htmlなどを表示）
app.use(express.static('public'));

/**
 * 動画検索API
 * クライアントからの検索リクエストを受け取り、Invidious APIへ中継します。
 */
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: '検索キーワードが必要です' });

    console.log(`検索実行中: ${query}`);

    // インスタンスリストをループして、成功するまで順番にリクエストを送る
    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            console.log(`試行中のサーバー: ${instance}`);
            const response = await axios.get(`${instance}/api/v1/search`, {
                params: { 
                    q: query, 
                    type: 'video', 
                    region: 'JP', 
                    hl: 'ja' 
                },
                timeout: 6000 // 各サーバーの応答を6秒待つ
            });

            // 有効なデータ（配列）が返ってきたら、即座にクライアントに返して終了
            if (response.data && Array.isArray(response.data)) {
                console.log(`成功: ${instance}`);
                return res.json(response.data);
            }
        } catch (error) {
            console.warn(`失敗 (${instance}): ${error.message}`);
            // 失敗した場合は次のループ（次のサーバー）へ移る
            continue;
        }
    }

    // すべてのサーバーが全滅した場合
    res.status(500).json({ 
        error: 'Search failed', 
        message: '現在、利用可能なYouTubeサーバーが見つかりません。' 
    });
});

/**
 * 予測変換API (Google Suggest API)
 * 日本語の文字化けを防ぐために arraybuffer で取得し、TextDecoder で処理します。
 */
app.get('/api/suggestions', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);

        const response = await axios.get(`https://suggestqueries.google.com/complete/search`, {
            params: { client: 'youtube', ds: 'yt', q: query, hl: 'ja' },
            responseType: 'arraybuffer' // 生のバイナリデータとして受け取る
        });

        // 文字化け対策: UTF-8として明示的にデコード
        const decoder = new TextDecoder('utf-8');
        const decodedData = decoder.decode(response.data);

        // JSONP形式 window.google.ac.h(["..."]) から [...] の部分を抽出
        const jsonStrMatch = decodedData.match(/\((.*)\)/);
        if (!jsonStrMatch) return res.json([]);
        
        const data = JSON.parse(jsonStrMatch[1]);
        
        // 予測候補の文字列リストだけを抽出して返す
        const suggestions = data[1].map(item => item[0]);
        res.json(suggestions);
    } catch (error) {
        console.error("予測変換エラー:", error.message);
        res.json([]);
    }
});

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(` サーバーが起動しました！`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` 登録サーバー数: ${INVIDIOUS_INSTANCES.length}台`);
    console.log(`=========================================`);
});

const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// --- 設定: 利用するInvidiousインスタンスのリスト ---
const INVIDIOUS_INSTANCES = [
    'https://yt.omada.cafe',
    'https://invidious.f5.si',
    'https://invidious.drgns.space',
    'https://vid.puffyan.us',
    'https://yewtu.be'
];

app.use(express.static('public'));

/**
 * 画像プロキシAPI
 * YouTubeのサムネイルやチャンネルアイコンがブロックされている場合、サーバー経由で取得します。
 */
app.get('/api/proxy/image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send('No URL provided');

    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: { 'Referer': 'https://www.youtube.com/' },
            timeout: 5000
        });
        res.set('Content-Type', response.headers['content-type']);
        res.send(response.data);
    } catch (error) {
        res.status(500).send('Image proxy failed');
    }
});

/**
 * トレンド取得API
 */
app.get('/api/trending', async (req, res) => {
    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            const response = await axios.get(`${instance}/api/v1/trending`, {
                params: { region: 'JP', type: 'video' },
                timeout: 5000
            });
            if (response.data && Array.isArray(response.data)) {
                return res.json(response.data);
            }
        } catch (error) {
            continue;
        }
    }
    res.status(500).json({ error: 'Trending failed' });
});

/**
 * 動画検索API
 */
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: '検索キーワードが必要です' });

    console.log(`検索実行中: ${query}`);

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
                timeout: 6000
            });

            if (response.data && Array.isArray(response.data)) {
                console.log(`成功: ${instance}`);
                return res.json(response.data);
            }
        } catch (error) {
            console.warn(`失敗 (${instance}): ${error.message}`);
            continue;
        }
    }

    res.status(500).json({ 
        error: 'Search failed', 
        message: '現在、利用可能なYouTubeサーバーが見つかりません。' 
    });
});

/**
 * 予測変換API (Google Suggest API)
 */
app.get('/api/suggestions', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);

        const response = await axios.get(`https://suggestqueries.google.com/complete/search`, {
            params: { client: 'youtube', ds: 'yt', q: query, hl: 'ja' },
            responseType: 'arraybuffer'
        });

        const decoder = new TextDecoder('utf-8');
        const decodedData = decoder.decode(response.data);

        const jsonStrMatch = decodedData.match(/\((.*)\)/);
        if (!jsonStrMatch) return res.json([]);
        
        const data = JSON.parse(jsonStrMatch[1]);
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

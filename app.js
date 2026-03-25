const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// 利用するInvidiousインスタンスのリスト（上から順に試行します）
const INVIDIOUS_INSTANCES = [
    'https://yt.omada.cafe',
    'https://invidious.f5.si',
    'https://invidious.drgns.space',
    'https://vid.puffyan.us',
    'https://yewtu.be'
];

app.use(express.static('public'));

// 動画検索API（フォールバック機能付き）
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    console.log(`Searching for: ${query}`);

    let lastError = null;

    // インスタンスリストをループして成功するまで試行
    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            console.log(`Trying instance: ${instance}`);
            const response = await axios.get(`${instance}/api/v1/search`, {
                params: { 
                    q: query, 
                    type: 'video', 
                    region: 'JP', 
                    hl: 'ja' 
                },
                timeout: 5000 // 各インスタンス5秒でタイムアウト
            });

            // 有効な配列データが返ってきた場合のみ成功とする
            if (response.data && Array.isArray(response.data)) {
                console.log(`Success with: ${instance}`);
                return res.json(response.data);
            }
        } catch (error) {
            console.warn(`Instance ${instance} failed: ${error.message}`);
            lastError = error;
            // 失敗した場合は次のループ（次のインスタンス）へ
            continue;
        }
    }

    // すべてのインスタンスが失敗した場合
    console.error("All instances failed.");
    res.status(500).json({ 
        error: 'Search failed', 
        message: 'すべてのサーバーが応答しませんでした。しばらくしてから再度お試しください。',
        details: lastError ? lastError.message : 'Unknown error'
    });
});

// 予測変換API
app.get('/api/suggestions', async (req, res) => {
    try {
        const query = req.query.q;
        const response = await axios.get(`https://suggestqueries.google.com/complete/search`, {
            params: { client: 'youtube', ds: 'yt', q: query, hl: 'ja' }
        });
        
        // JSONP形式をパース
        const jsonStr = response.data.match(/\((.*)\)/)[1];
        const data = JSON.parse(jsonStr);
        res.json(data[1].map(item => item[0]));
    } catch (error) {
        res.json([]);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Loaded ${INVIDIOUS_INSTANCES.length} instances for fallback.`);
});

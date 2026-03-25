const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

const INVIDIOUS_INSTANCE = 'https://inv.nadeko.net'; 
app.use(express.static('public'));

// 動画検索API
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        const response = await axios.get(`${INVIDIOUS_INSTANCE}/api/v1/search`, {
            params: { q: query, type: 'video', region: 'JP' }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

// 予測変換API (YouTube公式が内部で使っているエンドポイントを利用)
app.get('/api/suggestions', async (req, res) => {
    try {
        const query = req.query.q;
        const response = await axios.get(`https://suggestqueries.google.com/complete/search`, {
            params: { client: 'youtube', ds: 'yt', q: query, hl: 'ja' }
        });
        // レスポンスをパース
        const jsonStr = response.data.match(/\((.*)\)/)[1];
        const data = JSON.parse(jsonStr);
        res.json(data[1].map(item => item[0]));
    } catch (error) {
        res.json([]);
    }
});

app.listen(3000, () => console.log('Server started on http://localhost:3000'));

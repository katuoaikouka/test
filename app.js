
const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

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
 * ytimg.com 等がブロックされている場合、サーバー経由で取得
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

    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            const response = await axios.get(`${instance}/api/v1/search`, {
                params: { q: query, type: 'video', region: 'JP', hl: 'ja' },
                timeout: 6000
            });
            if (response.data && Array.isArray(response.data)) {
                return res.json(response.data);
            }
        } catch (error) {
            continue;
        }
    }
    res.status(500).json({ error: 'Search failed' });
});

/**
 * 予測変換API (文字化け修正版)
 * client=firefoxを指定することでJSON形式で取得し、エンコーディングの問題を回避します
 */
app.get('/api/suggestions', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);

        const response = await axios.get(`https://suggestqueries.google.com/complete/search`, {
            params: { 
                client: 'firefox', // JSON配列を直接返すモード
                ds: 'yt', 
                q: query, 
                hl: 'ja' 
            },
            timeout: 3000
        });

        // client=firefoxの場合 [query, [suggestions]] という構造
        if (response.data && Array.isArray(response.data)) {
            res.json(response.data[1]);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error("予測変換エラー:", error.message);
        res.json([]);
    }
});

/**
 * 動画詳細・ストリーム情報取得API
 */
app.get('/api/videos/:id', async (req, res) => {
    const videoId = req.params.id;
    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            const response = await axios.get(`${instance}/api/v1/videos/${videoId}`, {
                params: { region: 'JP', hl: 'ja' },
                timeout: 5000
            });
            return res.json(response.data);
        } catch (error) {
            continue;
        }
    }
    res.status(500).json({ error: 'Video info failed' });
});

/**
 * コメント取得API
 */
app.get('/api/comments/:id', async (req, res) => {
    const videoId = req.params.id;
    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            const response = await axios.get(`${instance}/api/v1/comments/${videoId}`, {
                params: { hl: 'ja' },
                timeout: 5000
            });
            return res.json(response.data);
        } catch (error) {
            continue;
        }
    }
    res.status(500).json({ error: 'Comments failed' });
});

/**
 * チャンネル情報取得API
 */
app.get('/api/channels/:id', async (req, res) => {
    const channelId = req.params.id;
    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            const response = await axios.get(`${instance}/api/v1/channels/${channelId}`, {
                params: { hl: 'ja' },
                timeout: 5000
            });
            return res.json(response.data);
        } catch (error) {
            continue;
        }
    }
    res.status(500).json({ error: 'Channel info failed' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(` サーバーが起動しました！`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(`=========================================`);
});

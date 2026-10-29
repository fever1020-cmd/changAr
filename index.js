const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const { searchARLevel } = require('./scraper');

const app = express();
const port = process.env.PORT || 3001;

// Set up Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

app.get('/api/search', async (req, res) => {
    try {
        const { title } = req.query;
        if (!title) {
            return res.status(400).json({ error: 'Title parameter is required' });
        }

        console.log(`Searching for AR level for title: ${title}`);
        const results = await searchARLevel(title);
        
        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to search AR level.',
            stack: error.stack
        });
    }
});

// Endpoint for image upload and OCR processing
app.post('/api/upload-and-search', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '이미지가 업로드되지 않았습니다.' });
        }

        console.log(`Received image (${Math.round(req.file.size / 1024)} KB), starting OCR...`);

        // Run OCR on the uploaded image buffer
        const { data: { text, lines } } = await Tesseract.recognize(req.file.buffer, 'eng');
        
        // Find the best line likely to be the title (ignore tiny words, publisher names like Scholastic)
        let candidates = lines
            ? lines.map(l => l.text.trim()).filter(l => l.length >= 3)
            : text.split('\n').map(l => l.trim()).filter(l => l.length >= 3);

        // Filter out common noise in book covers
        const noiseWords = /scholastic|bestseller|new york times|author of|award|winner|illustrated by|written by|edition/i;
        const filteredCandidates = candidates.filter(l => !noiseWords.test(l));

        // Use the cleanest line or top lines
        let cleanedTitle = (filteredCandidates[0] || candidates[0] || text)
            .replace(/[^a-zA-Z0-9\s'’-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        console.log(`Extracted candidates:`, candidates);
        console.log(`Cleaned title for search: "${cleanedTitle}"`);

        if (!cleanedTitle) {
            return res.status(400).json({ error: '사진에서 글자를 찾을 수 없습니다. 좀 더 밝고 선명하게 찍어주세요.' });
        }

        console.log('Searching for AR level...');
        const results = await searchARLevel(cleanedTitle);
        
        res.json({ 
            success: true, 
            data: results, 
            extractedText: cleanedTitle,
            rawText: text.substring(0, 200)
        });
    } catch (error) {
        console.error('OCR/Search error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || '사진 분석 중 오류가 발생했습니다.',
            stack: error.stack 
        });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening at http://0.0.0.0:${port}`);
});

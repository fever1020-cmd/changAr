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

// New endpoint for image upload and OCR processing
app.post('/api/upload-and-search', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        console.log('Received image, starting OCR...');
        // Run OCR on the uploaded image buffer
        const { data: { text } } = await Tesseract.recognize(req.file.buffer, 'eng');
        const cleanedText = text.replace(/\n/g, ' ').trim();
        
        console.log(`Extracted text: ${cleanedText}`);

        if (!cleanedText) {
            return res.status(400).json({ error: 'Failed to extract text from the image.' });
        }

        console.log('Searching for AR level...');
        const results = await searchARLevel(cleanedText);
        
        res.json({ success: true, data: results, extractedText: cleanedText });
    } catch (error) {
        console.error('OCR/Search error:', error);
        res.status(500).json({ success: false, error: 'Failed to process image and search.' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening at http://0.0.0.0:${port}`);
});

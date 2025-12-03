const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pdfProcessor = require('../services/pdfProcessor');
const llmService = require('../services/llmService');

let patents = [];

async function loadPatents() {
  patents = await pdfProcessor.loadProcessedPatents();
  console.log(`📚 Loaded ${patents.length} patents into memory`);
}

loadPatents();

// GET all patents (summary)
router.get('/patents', (req, res) => {
  try {
    if (patents.length === 0) {
      return res.status(404).json({ 
        error: 'No patents found. Please run: npm run process',
        patents: []
      });
    }

    const summary = patents.map(p => ({
      id: p.patentNumber,
      patentNumber: p.patentNumber,
      title: p.title,
      abstract: p.abstract.substring(0, 250) + '...',
      keywords: p.keywords,
      sectionsCount: p.sections.length,
      tablesCount: p.tables?.length || 0,
      compositionsCount: p.compositions?.length || 0,
      numPages: p.numPages,
      fileSize: p.fileSize,
      pdfAvailable: p.pdfAvailable || false,
      processedAt: p.processedAt
    }));
    
    res.json(summary);
  } catch (error) {
    console.error('Error in GET /patents:', error);
    res.status(500).json({ error: 'Failed to fetch patents' });
  }
});

// GET specific patent by ID
router.get('/patents/:id', (req, res) => {
  try {
    const patent = patents.find(p => 
      p.patentNumber === req.params.id || 
      p.patentNumber.replace(/\s/g, '') === req.params.id.replace(/\s/g, '')
    );
    
    if (!patent) {
      return res.status(404).json({ 
        error: `Patent ${req.params.id} not found` 
      });
    }
    
    const { fullText, ...patentData } = patent;
    
    res.json({
      ...patentData,
      fullTextLength: fullText ? fullText.length : 0
    });
  } catch (error) {
    console.error('Error in GET /patents/:id:', error);
    res.status(500).json({ error: 'Failed to fetch patent details' });
  }
});

// DOWNLOAD PDF file from /uploads
router.get('/patents/:id/download', async (req, res) => {
  try {
    const patent = patents.find(p => 
      p.patentNumber === req.params.id || 
      p.patentNumber.replace(/\s/g, '') === req.params.id.replace(/\s/g, '')
    );
    
    if (!patent) {
      return res.status(404).json({ error: 'Patent not found' });
    }

    if (!patent.pdfAvailable || !patent.originalFileName) {
      return res.status(404).json({ error: 'PDF file not available' });
    }

    // Serve from uploads directory
    const pdfPath = path.join(__dirname, '../uploads', patent.originalFileName);
    
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'PDF file not found on server' });
    }

    console.log(`📥 Downloading PDF: ${patent.patentNumber} (${patent.originalFileName})`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${patent.patentNumber}.pdf"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error downloading PDF' });
      }
    });

  } catch (error) {
    console.error('Error in GET /patents/:id/download:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download PDF' });
    }
  }
});

// POST chat
router.post('/chat', async (req, res) => {
  try {
    const { patentId, question } = req.body;

    if (!patentId || !question) {
      return res.status(400).json({ 
        error: 'Both patentId and question are required'
      });
    }

    if (question.trim().length < 3) {
      return res.status(400).json({ 
        error: 'Question must be at least 3 characters long' 
      });
    }

    const patent = patents.find(p => 
      p.patentNumber === patentId || 
      p.id === patentId ||
      p.patentNumber.replace(/\s/g, '') === patentId.replace(/\s/g, '')
    );

    if (!patent) {
      return res.status(404).json({ error: `Patent ${patentId} not found` });
    }

    console.log(`\n📝 Chat: ${patent.patentNumber} - "${question}"`);

    const result = await llmService.answerQuestion(patent, question);

    console.log(`✅ Response: ${result.answer.substring(0, 100)}...\n`);

    res.json({
      answer: result.answer,
      citations: result.citations,
      patentNumber: patent.patentNumber,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Chat Error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to process question'
    });
  }
});

// GET system status
router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    patents: patents.length,
    hasGroqKey: !!process.env.GROQ_API_KEY,
    mode: 'file-based',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
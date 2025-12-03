const express = require('express');
const router = express.Router();
const pdfProcessor = require('../services/pdfProcessor');
const llmService = require('../services/llmService');

let patents = [];
let isLoading = false;

async function loadPatents() {
  if (isLoading) return;
  isLoading = true;
  
  try {
    patents = await pdfProcessor.loadProcessedPatents();
    console.log(`📚 Loaded ${patents.length} patents into memory`);
  } catch (error) {
    console.error('❌ Error loading patents:', error);
  } finally {
    isLoading = false;
  }
}

// Load patents on startup
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
    
    // Return without fullText to save bandwidth
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
// POST chat - Answer question about a patent
router.post('/chat', async (req, res) => {
  try {
    const { patentId, question } = req.body;

    console.log('📥 Chat request received:', { patentId, question });

    // Validation
    if (!patentId || !question) {
      console.error('❌ Missing required fields:', { 
        hasPatentId: !!patentId, 
        hasQuestion: !!question,
        body: req.body 
      });
      return res.status(400).json({ 
        error: 'Both patentId and question are required',
        received: { 
          patentId: patentId || null, 
          question: question || null 
        }
      });
    }

    if (question.trim().length < 3) {
      return res.status(400).json({ 
        error: 'Question must be at least 3 characters long' 
      });
    }

    if (question.length > 500) {
      return res.status(400).json({ 
        error: 'Question must be less than 500 characters' 
      });
    }

    // Find patent
    const patent = patents.find(p => 
      p.patentNumber === patentId || 
      p.id === patentId ||
      p.patentNumber.replace(/\s/g, '') === patentId.replace(/\s/g, '')
    );

    if (!patent) {
      console.error('❌ Patent not found:', patentId);
      console.log('Available patents:', patents.map(p => p.patentNumber));
      return res.status(404).json({ 
        error: `Patent ${patentId} not found`,
        availablePatents: patents.map(p => p.patentNumber)
      });
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 Chat Request`);
    console.log(`Patent: ${patent.patentNumber}`);
    console.log(`Question: ${question}`);
    console.log(`${'='.repeat(60)}`);

    // Get LLM answer with citations
    const result = await llmService.answerQuestion(patent, question);

    console.log(`✅ Response generated`);
    console.log(`Answer length: ${result.answer.length} chars`);
    console.log(`Citations: ${result.citations.length}`);
    console.log(`${'='.repeat(60)}\n`);

    res.json({
      answer: result.answer,
      citations: result.citations,
      patentNumber: patent.patentNumber,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('\n❌ Chat Error:', error.message);
    console.error(error.stack);
    
    res.status(500).json({ 
      error: error.message || 'Failed to process question',
      type: error.name
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
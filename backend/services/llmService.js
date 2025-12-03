const Groq = require('groq-sdk');

class LLMService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || 'dummy-key'
    });
    this.currentModel = 'llama-3.3-70b-versatile';
    console.log(`🤖 LLM model: ${this.currentModel}`);
  }

  async answerQuestion(patent, question) {
    try {
      console.log(`\n💬 Q: "${question}"`);
      console.log(`📄 Patent: ${patent.patentNumber}`);

      // Find relevant paragraphs first
      const relevantParagraphs = this.findRelevantParagraphs(patent, question);
      console.log(`📋 Found ${relevantParagraphs.length} relevant paragraphs`);

      const prompt = this.buildPrompt(patent, question, relevantParagraphs);

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a patent analysis expert. You MUST follow these rules:

MANDATORY RULES:
1. You MUST reference specific paragraph numbers like [0001], [0025], [0045] in EVERY answer
2. Start your answer with: "According to paragraph [XXXX]..."
3. Include exact technical values (percentages, temperatures, dimensions)
4. If information spans multiple paragraphs, reference all of them: "[0001] states... while [0045] describes..."
5. NEVER give generic answers - always cite specific paragraphs

EXAMPLE FORMAT:
"According to [0001], the steel contains 2.5-10% Si and 1.5-20% Cr by mass. Paragraph [0012] explains that this composition provides high electrical resistivity of 60μΩcm or more. The manufacturing process in [0045] specifies hot rolling at 1050-1250°C."

If you don't cite paragraph markers, your answer is WRONG.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: this.currentModel,
        temperature: 0.05, // Very low for consistency
        max_tokens: 800,
        top_p: 0.9
      });

      const answer = completion.choices[0]?.message?.content || 'No answer generated';
      console.log(`🤖 A: ${answer.substring(0, 200)}...`);

      // Extract citations from answer
      const citations = this.extractCitations(patent, answer, relevantParagraphs);
      console.log(`📚 Citations: ${citations.length}`);
      citations.forEach(c => console.log(`   - ${c.section}`));
      console.log('');

      return { answer: answer.trim(), citations };

    } catch (error) {
      console.error('❌ LLM Error:', error.message);
      
      if (error.message.includes('decommissioned')) {
        return await this.answerWithFallbackModel(patent, question);
      }
      
      return this.getFallbackAnswer(patent, question);
    }
  }

  findRelevantParagraphs(patent, question) {
    if (!patent.numberedParagraphs || patent.numberedParagraphs.length === 0) {
      return [];
    }

    const questionLower = question.toLowerCase();
    const keywords = questionLower
      .split(/\s+/)
      .filter(w => w.length > 3 && !['what', 'how', 'why', 'when', 'where', 'which', 'does', 'this', 'that', 'about'].includes(w));

    // Score each paragraph
    const scored = patent.numberedParagraphs.map(para => {
      const contentLower = para.content.toLowerCase();
      
      // Count keyword matches
      let score = 0;
      keywords.forEach(kw => {
        const count = (contentLower.match(new RegExp(kw, 'g')) || []).length;
        score += count * 2;
      });

      // Bonus for composition questions
      if (questionLower.match(/composition|contain|component|element|material/)) {
        if (contentLower.match(/mass%|wt%|contains|composition|balance/)) {
          score += 5;
        }
      }

      // Bonus for process questions
      if (questionLower.match(/process|method|manufactur|produc|how/)) {
        if (contentLower.match(/rolling|heating|cooling|annealing|temperature|process|method/)) {
          score += 5;
        }
      }

      // Bonus for property questions
      if (questionLower.match(/property|properties|characteristic|advantage|effect|benefit/)) {
        if (contentLower.match(/property|properties|advantage|effect|excellent|improved|characteristic/)) {
          score += 5;
        }
      }

      return { para, score };
    });

    // Get top 10 most relevant paragraphs
    const relevant = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(s => s.para);

    // Sort by paragraph number
    relevant.sort((a, b) => a.number - b.number);

    return relevant;
  }

  buildPrompt(patent, question, relevantParagraphs) {
    let prompt = `PATENT DOCUMENT: ${patent.patentNumber}
Title: ${patent.title}

ABSTRACT:
${patent.abstract}

`;

    // Add the most relevant paragraphs with their markers
    if (relevantParagraphs.length > 0) {
      prompt += `RELEVANT PARAGRAPHS (you MUST reference these markers in your answer):\n\n`;
      
      relevantParagraphs.forEach(para => {
        prompt += `${para.marker} ${para.content}\n\n`;
      });
    } else if (patent.numberedParagraphs && patent.numberedParagraphs.length > 0) {
      // Fallback: use first 15 paragraphs
      prompt += `DETAILED DESCRIPTION (you MUST reference these markers):\n\n`;
      patent.numberedParagraphs.slice(0, 15).forEach(para => {
        prompt += `${para.marker} ${para.content}\n\n`;
      });
    }

    // Add composition data if available
    if (patent.compositions && patent.compositions.length > 0) {
      prompt += `COMPOSITION DATA:\n`;
      patent.compositions.slice(0, 10).forEach(c => {
        if (c.min && c.max) {
          prompt += `- ${c.element}: ${c.min}-${c.max}${c.unit}\n`;
        } else if (c.value) {
          prompt += `- ${c.element}: ${c.value}${c.unit}\n`;
        }
      });
      prompt += '\n';
    }

    // Add technical details
    if (patent.technicalDetails && patent.technicalDetails.temperatures && patent.technicalDetails.temperatures.length > 0) {
      prompt += `TEMPERATURE DATA:\n`;
      patent.technicalDetails.temperatures.slice(0, 5).forEach(t => {
        if (t.min && t.max) {
          prompt += `- ${t.min}-${t.max}${t.unit}\n`;
        } else if (t.value) {
          prompt += `- ${t.value}${t.unit}\n`;
        }
      });
      prompt += '\n';
    }

    prompt += `QUESTION: ${question}

INSTRUCTIONS:
1. You MUST start your answer with "According to paragraph [XXXX]..."
2. Reference specific paragraph markers throughout your answer
3. Include exact technical values from the paragraphs
4. Cite multiple paragraphs if relevant
5. Keep answer concise but technically complete (max 600 characters)

YOUR ANSWER (must include paragraph markers):`;

    return prompt;
  }

  extractCitations(patent, answer, relevantParagraphs) {
    const citations = [];
    const citationMap = new Map();

    // Extract all paragraph markers mentioned in the answer
    const paraMatches = [...answer.matchAll(/\[0*(\d+)\]/g)];
    
    console.log(`   Extracting from answer: found ${paraMatches.length} paragraph references`);

    paraMatches.forEach(match => {
      const paraNum = parseInt(match[1]);
      const key = `para-${paraNum}`;
      
      if (!citationMap.has(key) && patent.numberedParagraphs) {
        const para = patent.numberedParagraphs.find(p => p.number === paraNum);
        if (para) {
          citationMap.set(key, {
            patentId: patent.patentNumber,
            page: Math.max(1, Math.ceil(paraNum / 5)),
            section: `Paragraph ${para.marker}`,
            paragraphNumber: paraNum,
            type: 'paragraph'
          });
        }
      }
    });

    // If no paragraphs cited in answer but we have relevant paragraphs, use those
    if (citationMap.size === 0 && relevantParagraphs && relevantParagraphs.length > 0) {
      console.log(`   No paragraphs in answer, using ${relevantParagraphs.length} relevant paragraphs`);
      
      relevantParagraphs.slice(0, 3).forEach(para => {
        const key = `para-${para.number}`;
        citationMap.set(key, {
          patentId: patent.patentNumber,
          page: Math.max(1, Math.ceil(para.number / 5)),
          section: `Paragraph ${para.marker}`,
          paragraphNumber: para.number,
          type: 'paragraph'
        });
      });
    }

    // If still nothing, use abstract
    if (citationMap.size === 0) {
      citationMap.set('abstract', {
        patentId: patent.patentNumber,
        page: 1,
        section: 'Abstract',
        type: 'abstract'
      });
    }

    citations.push(...citationMap.values());

    // Sort by paragraph number
    citations.sort((a, b) => {
      if (a.paragraphNumber && b.paragraphNumber) {
        return a.paragraphNumber - b.paragraphNumber;
      }
      return 0;
    });

    return citations.slice(0, 5);
  }

  async answerWithFallbackModel(patent, question) {
    const models = ['llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
    
    for (const model of models) {
      try {
        console.log(`   Trying ${model}...`);
        
        const relevantParagraphs = this.findRelevantParagraphs(patent, question);
        const prompt = this.buildPrompt(patent, question, relevantParagraphs);
        
        const completion = await this.groq.chat.completions.create({
          messages: [
            { 
              role: 'system', 
              content: 'You MUST cite specific paragraph markers [0001], [0025] etc. in your answer. Start with "According to paragraph [XXXX]..."' 
            },
            { role: 'user', content: prompt }
          ],
          model: model,
          temperature: 0.05,
          max_tokens: 800
        });

        const answer = completion.choices[0]?.message?.content || 'No answer';
        this.currentModel = model;
        console.log(`   ✅ Success with ${model}`);
        
        return { 
          answer: answer.trim(), 
          citations: this.extractCitations(patent, answer, relevantParagraphs) 
        };
        
      } catch (err) {
        console.log(`   ❌ ${model} failed: ${err.message}`);
      }
    }
    
    return this.getFallbackAnswer(patent, question);
  }

  getFallbackAnswer(patent, question) {
    console.log('   Using fallback answer with paragraph search');
    
    const relevantParagraphs = this.findRelevantParagraphs(patent, question);
    
    if (relevantParagraphs.length > 0) {
      const para = relevantParagraphs[0];
      let answer = `According to ${para.marker}, ${para.content.substring(0, 400)}`;
      
      // Add second paragraph if available
      if (relevantParagraphs.length > 1) {
        const para2 = relevantParagraphs[1];
        answer += ` Additionally, ${para2.marker} states: ${para2.content.substring(0, 200)}`;
      }
      
      return {
        answer: answer.substring(0, 600) + '...',
        citations: relevantParagraphs.slice(0, 3).map(p => ({
          patentId: patent.patentNumber,
          page: Math.max(1, Math.ceil(p.number / 5)),
          section: `Paragraph ${p.marker}`,
          paragraphNumber: p.number,
          type: 'paragraph'
        }))
      };
    }
    
    // Final fallback
    return {
      answer: patent.abstract.substring(0, 500),
      citations: [{ 
        patentId: patent.patentNumber, 
        page: 1, 
        section: 'Abstract',
        type: 'abstract'
      }]
    };
  }
}

module.exports = new LLMService();
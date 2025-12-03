const Groq = require('groq-sdk');

class LLMService {
  constructor() {
    if (!process.env.GROQ_API_KEY) {
      console.warn('⚠️  GROQ_API_KEY not set - LLM features will not work');
    }
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || 'dummy-key'
    });
    
    // Available models as of 2024
    this.availableModels = [
      'llama-3.3-70b-versatile',      // Latest, best quality
      'llama-3.1-8b-instant',          // Fast, good for demos
      'mixtral-8x7b-32768',            // Good alternative
      'gemma2-9b-it'                   // Another option
    ];
    
    this.currentModel = 'llama-3.3-70b-versatile'; // Use latest
    console.log(`🤖 Using LLM model: ${this.currentModel}`);
  }

  async answerQuestion(patent, question) {
    try {
      console.log(`\n💬 Question: "${question}"`);
      console.log(`📄 Patent: ${patent.patentNumber}`);

      const prompt = this.buildPrompt(patent, question);

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a patent analysis assistant. Answer questions based ONLY on the provided patent information.

CRITICAL RULES:
1. Answer MUST be based on the patent content provided
2. Keep answer concise (2-3 sentences, max 400 characters)
3. Always mention specific technical details (compositions, temperatures, processes)
4. Reference the section name naturally in your answer
5. Be precise and technical

Example good answer:
"The steel sheet contains 2.5-4.0% Si and 0.5-2.0% Al (Technical Field, Page 1). Hot rolling is performed at 1050-1150°C followed by cold rolling (Description of Embodiments, Page 5)."

DO NOT:
- Make up information not in the patent
- Give generic answers
- Use vague language`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: this.currentModel,
        temperature: 0.2,
        max_tokens: 400,
        top_p: 0.9
      });

      const answer = completion.choices[0]?.message?.content || 'No answer generated';
      console.log(`🤖 Answer: ${answer.substring(0, 100)}...`);

      const citations = this.extractCitations(patent, question, answer);
      console.log(`📚 Citations: ${citations.length} found`);

      return { 
        answer: answer.trim(), 
        citations 
      };

    } catch (error) {
      console.error('❌ LLM Error:', error.message);
      
      // If model is deprecated, try fallback models
      if (error.message.includes('decommissioned') || error.message.includes('deprecated')) {
        console.log('⚠️  Current model deprecated, trying fallback...');
        return await this.answerWithFallbackModel(patent, question);
      }
      
      if (error.message.includes('API key') || error.message.includes('401')) {
        throw new Error('LLM API key not configured. Please set GROQ_API_KEY in .env file');
      }
      
      // Use pattern-based fallback
      console.log('⚠️  Using pattern-based fallback');
      return this.getFallbackAnswer(patent, question);
    }
  }

  async answerWithFallbackModel(patent, question) {
    // Try each model until one works
    for (const model of this.availableModels) {
      if (model === this.currentModel) continue; // Skip the one that failed
      
      try {
        console.log(`   Trying model: ${model}`);
        
        const prompt = this.buildPrompt(patent, question);
        
        const completion = await this.groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a patent analysis assistant. Answer based ONLY on the provided patent. Be concise and technical.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          model: model,
          temperature: 0.2,
          max_tokens: 400
        });

        const answer = completion.choices[0]?.message?.content || 'No answer generated';
        const citations = this.extractCitations(patent, question, answer);
        
        console.log(`   ✅ Success with ${model}`);
        this.currentModel = model; // Update to working model
        
        return { answer: answer.trim(), citations };
        
      } catch (err) {
        console.log(`   ❌ ${model} failed: ${err.message}`);
        continue;
      }
    }
    
    // All models failed, use pattern-based
    console.log('⚠️  All LLM models failed, using pattern-based fallback');
    return this.getFallbackAnswer(patent, question);
  }

  buildPrompt(patent, question) {
    // Build comprehensive prompt with all extracted data
    let prompt = `Patent Document: ${patent.patentNumber}
Title: ${patent.title}

Abstract (Page 1):
${patent.abstract}

`;

    // Add sections
    if (patent.sections && patent.sections.length > 0) {
      prompt += 'Detailed Sections:\n';
      patent.sections.slice(0, 5).forEach(s => {
        prompt += `[${s.name} - Page ${s.page}]\n${s.content.substring(0, 800)}\n\n`;
      });
    }

    // Add compositions if available
    if (patent.compositions && patent.compositions.length > 0) {
      prompt += '\nComposition Details:\n';
      patent.compositions.slice(0, 10).forEach(c => {
        if (c.min && c.max) {
          prompt += `${c.element}: ${c.min}-${c.max}${c.unit}\n`;
        } else if (c.value) {
          prompt += `${c.element}: ${c.value}${c.unit}\n`;
        }
      });
      prompt += '\n';
    }

    // Add tables if available
    if (patent.tables && patent.tables.length > 0) {
      prompt += '\nTables:\n';
      patent.tables.slice(0, 2).forEach(t => {
        prompt += `Table ${t.tableNumber}: ${t.content.substring(0, 300)}\n`;
      });
      prompt += '\n';
    }

    // Add technical details
    if (patent.technicalDetails) {
      if (patent.technicalDetails.temperatures.length > 0) {
        prompt += '\nTemperatures:\n';
        patent.technicalDetails.temperatures.slice(0, 5).forEach(t => {
          prompt += `${t.raw}\n`;
        });
        prompt += '\n';
      }
      
      if (patent.technicalDetails.processes.length > 0) {
        prompt += '\nProcesses:\n';
        patent.technicalDetails.processes.slice(0, 5).forEach(p => {
          prompt += `${p.type}: ${p.description.substring(0, 150)}\n`;
        });
        prompt += '\n';
      }
    }

    prompt += `Keywords: ${patent.keywords.join(', ')}\n\n`;
    prompt += `Question: ${question}\n\n`;
    prompt += `Provide a precise, technical answer based on the patent content above. Include specific values, compositions, or process parameters when available.`;

    return prompt;
  }

  extractCitations(patent, question, answer) {
    const citations = [];
    const answerLower = answer.toLowerCase();
    const questionLower = question.toLowerCase();

    // Strategy 1: Sections mentioned in answer
    if (patent.sections) {
      patent.sections.forEach(section => {
        const sectionNameLower = section.name.toLowerCase();
        const keywords = sectionNameLower.split(' ');
        
        if (keywords.some(word => word.length > 4 && answerLower.includes(word))) {
          citations.push({
            patentId: patent.patentNumber,
            page: section.page,
            section: section.name
          });
        }
      });
    }

    // Strategy 2: Question keywords to sections
    const questionKeywords = this.extractQuestionKeywords(questionLower);
    if (patent.sections) {
      patent.sections.forEach(section => {
        const contentLower = section.content.toLowerCase();
        const matchCount = questionKeywords.filter(kw => contentLower.includes(kw)).length;
        
        if (matchCount >= 2) {
          const existing = citations.find(c => c.page === section.page);
          if (!existing) {
            citations.push({
              patentId: patent.patentNumber,
              page: section.page,
              section: section.name
            });
          }
        }
      });
    }

    // Strategy 3: Overview questions - cite abstract
    if (questionLower.match(/what is|about|describe|overview|summary/)) {
      const hasAbstract = citations.some(c => c.page === 1);
      if (!hasAbstract) {
        citations.unshift({
          patentId: patent.patentNumber,
          page: 1,
          section: 'Abstract'
        });
      }
    }

    // Strategy 4: Technical questions
    if (questionLower.match(/composition|component|contain|material|element|table/)) {
      if (patent.sections) {
        const technicalSection = patent.sections.find(s => 
          s.name.toLowerCase().includes('technical') || 
          s.name.toLowerCase().includes('embodiment') ||
          s.name.toLowerCase().includes('example')
        );
        if (technicalSection) {
          const existing = citations.find(c => c.section === technicalSection.name);
          if (!existing) {
            citations.push({
              patentId: patent.patentNumber,
              page: technicalSection.page,
              section: technicalSection.name
            });
          }
        }
      }
    }

    // Remove duplicates and limit to 3
    const unique = citations.filter((citation, index, self) =>
      index === self.findIndex(c => 
        c.page === citation.page && c.section === citation.section
      )
    );

    return unique.slice(0, 3);
  }

  extractQuestionKeywords(question) {
    const stopWords = ['what', 'how', 'why', 'when', 'where', 'is', 'are', 'the', 'a', 'an', 'of', 'in', 'to', 'for', 'and', 'or', 'this', 'that'];
    const words = question.toLowerCase().split(/\s+/);
    return words.filter(w => w.length > 3 && !stopWords.includes(w));
  }

  getFallbackAnswer(patent, question) {
    const lowerQ = question.toLowerCase();
    let answer = '';
    const citations = [];

    if (lowerQ.match(/what is|about|describe|overview/)) {
      answer = patent.abstract;
      citations.push({
        patentId: patent.patentNumber,
        page: 1,
        section: 'Abstract'
      });
    } else if (lowerQ.match(/composition|component|contain|material|element/)) {
      if (patent.compositions && patent.compositions.length > 0) {
        answer = `The patent describes compositions including: `;
        patent.compositions.slice(0, 5).forEach(c => {
          if (c.min && c.max) {
            answer += `${c.element}: ${c.min}-${c.max}${c.unit}, `;
          } else if (c.value) {
            answer += `${c.element}: ${c.value}${c.unit}, `;
          }
        });
      } else if (patent.sections) {
        const techSection = patent.sections.find(s => 
          s.content.match(/mass%|wt%|percent|composition/i)
        );
        if (techSection) {
          answer = techSection.content.substring(0, 400);
          citations.push({
            patentId: patent.patentNumber,
            page: techSection.page,
            section: techSection.name
          });
        }
      }
    } else if (lowerQ.match(/process|method|manufactur|produc|temperature/)) {
      if (patent.technicalDetails && patent.technicalDetails.processes.length > 0) {
        answer = patent.technicalDetails.processes[0].description;
        citations.push({
          patentId: patent.patentNumber,
          page: 3,
          section: 'Process Description'
        });
      } else if (patent.sections) {
        const processSection = patent.sections.find(s => 
          s.name.toLowerCase().includes('embodiment') ||
          s.name.toLowerCase().includes('example')
        );
        if (processSection) {
          answer = processSection.content.substring(0, 400);
          citations.push({
            patentId: patent.patentNumber,
            page: processSection.page,
            section: processSection.name
          });
        }
      }
    } else if (lowerQ.match(/table/)) {
      if (patent.tables && patent.tables.length > 0) {
        answer = `The patent contains ${patent.tables.length} tables. ` + patent.tables[0].content.substring(0, 300);
        citations.push({
          patentId: patent.patentNumber,
          page: 2,
          section: 'Tables'
        });
      }
    }

    if (!answer) {
      answer = patent.abstract;
      citations.push({
        patentId: patent.patentNumber,
        page: 1,
        section: 'Abstract'
      });
    }

    return {
      answer: answer.substring(0, 400) + '...',
      citations
    };
  }
}

module.exports = new LLMService();
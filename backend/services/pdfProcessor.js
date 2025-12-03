const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');

class PDFProcessor {
  constructor() {
    this.pdfDir = path.join(__dirname, '../uploads');
    this.processedDir = path.join(__dirname, '../data/processed');
    console.log('📂 PDF Directory:', this.pdfDir);
    console.log('📂 Processed Directory:', this.processedDir);
  }

  async initialize() {
    try {
      await fs.mkdir(this.processedDir, { recursive: true });
      console.log('✅ Processed directory created/verified');
    } catch (error) {
      console.error('❌ Error creating processed directory:', error);
      throw error;
    }
  }

  async processPDF(filePath) {
    try {
      console.log(`\n📄 Processing: ${path.basename(filePath)}`);
      
      await fs.access(filePath);
      console.log('  ✓ File exists');
      
      const dataBuffer = await fs.readFile(filePath);
      console.log(`  ✓ File read (${dataBuffer.length} bytes)`);
      
      const pdfData = await pdfParse(dataBuffer, {
        max: 0,
        version: 'default'
      });
      
      console.log(`  ✓ PDF parsed (${pdfData.numpages} pages, ${pdfData.text.length} chars)`);
      
      const fullText = pdfData.text;
      const originalFileName = path.basename(filePath);
      const fileNameWithoutExt = path.basename(filePath, '.pdf');
      
      const patentInfo = this.extractPatentInfo(fullText, fileNameWithoutExt, pdfData.numpages);
      
      console.log(`  ✓ Patent Number: ${patentInfo.patentNumber}`);
      console.log(`  ✓ Title: ${patentInfo.title.substring(0, 50)}...`);
      console.log(`  ✓ Abstract length: ${patentInfo.abstract.length} chars`);
      console.log(`  ✓ Header info: ${Object.keys(patentInfo.headerInfo).length} fields`);
      console.log(`  ✓ Numbered paragraphs: ${patentInfo.numberedParagraphs.length}`);
      
      if (patentInfo.numberedParagraphs.length > 0) {
        const lastPara = patentInfo.numberedParagraphs[patentInfo.numberedParagraphs.length - 1];
        console.log(`  ✓ Paragraph range: [${String(patentInfo.numberedParagraphs[0].number).padStart(4, '0')}] - [${String(lastPara.number).padStart(4, '0')}]`);
      }
      
      console.log(`  ✓ Sections: ${patentInfo.sections.length}`);
      console.log(`  ✓ Tables: ${patentInfo.tables.length}`);
      console.log(`  ✓ Compositions: ${patentInfo.compositions.length}`);
      console.log(`  ✓ Claims: ${patentInfo.claims.length}`);
      
      return { 
        ...patentInfo, 
        fullText,
        originalFileName: originalFileName,
        numPages: pdfData.numpages,
        textLength: fullText.length,
        fileSize: dataBuffer.length,
        pdfAvailable: true
      };
    } catch (error) {
      console.error(`❌ Error processing ${path.basename(filePath)}:`, error.message);
      throw error;
    }
  }

  extractPatentInfo(text, fileName, numPages) {
    console.log('  → Extracting patent info...');
    
    const patentNumberMatch = text.match(/EP\s*[\d\s]+A\d/i) || 
                              text.match(/\(11\)\s*EP\s*[\d\s]+A\d/i) ||
                              text.match(/EP[\d]+A\d/i);
    
    const patentNumber = patentNumberMatch 
      ? patentNumberMatch[0].replace(/\(11\)\s*/i, '').replace(/\s/g, '').toUpperCase() 
      : fileName.toUpperCase().replace(/_/g, '');
    
    const headerInfo = this.extractHeaderInfo(text);
    const title = this.extractTitle(text);
    const abstract = this.extractAbstract(text);
    const numberedParagraphs = this.extractNumberedParagraphs(text);
    const sections = this.extractSections(text, numPages);
    const tables = this.extractTables(text);
    const compositions = this.extractCompositions(text);
    const technicalDetails = this.extractTechnicalDetails(text);
    const keywords = this.extractKeywords(text);
    const claims = this.extractClaims(text);
    
    // Create searchable content combining everything
    const searchableContent = this.createSearchableContent({
      title,
      abstract,
      numberedParagraphs,
      sections,
      tables,
      compositions,
      claims
    });

    return {
      patentNumber,
      title,
      abstract,
      headerInfo,
      numberedParagraphs,
      sections,
      tables,
      compositions,
      technicalDetails,
      keywords,
      claims,
      searchableContent, // For better LLM context
      processedAt: new Date().toISOString()
    };
  }

  extractNumberedParagraphs(text) {
    const paragraphs = [];
    
    // Multiple patterns to catch different formatting styles
    const patterns = [
      /\[(\d{4})\]\s*([^\[]+?)(?=\s*\[\d{4}\]|\s*$)/gs,  // [0001] with content
      /\[0*(\d+)\]\s*([^\[]+?)(?=\s*\[0*\d+\]|\s*$)/gs,  // [01] or [001] formats
      /【(\d{4})】\s*([^【]+?)(?=\s*【\d{4}】|\s*$)/gs      // Japanese brackets
    ];
    
    let allMatches = [];
    
    for (let pattern of patterns) {
      let match;
      const regex = new RegExp(pattern);
      
      while ((match = regex.exec(text)) !== null) {
        const number = parseInt(match[1]);
        let content = match[2].trim();
        
        // Clean up content
        content = content
          .replace(/\s+/g, ' ')           // Normalize whitespace
          .replace(/\n\s*\n/g, '\n')      // Remove empty lines
          .trim();
        
        // Only include if substantial content
        if (content.length > 15 && number > 0 && number < 10000) {
          allMatches.push({
            number: number,
            content: content,
            marker: `[${String(number).padStart(4, '0')}]`,
            length: content.length
          });
        }
      }
    }
    
    // Remove duplicates based on number
    const uniqueParagraphs = [];
    const seenNumbers = new Set();
    
    // Sort by number
    allMatches.sort((a, b) => a.number - b.number);
    
    for (let para of allMatches) {
      if (!seenNumbers.has(para.number)) {
        seenNumbers.add(para.number);
        uniqueParagraphs.push(para);
      } else {
        // If duplicate, keep the longer one
        const existingIndex = uniqueParagraphs.findIndex(p => p.number === para.number);
        if (existingIndex >= 0 && para.content.length > uniqueParagraphs[existingIndex].content.length) {
          uniqueParagraphs[existingIndex] = para;
        }
      }
    }
    
    console.log(`    Found ${uniqueParagraphs.length} numbered paragraphs`);
    
    // Check continuity
    if (uniqueParagraphs.length > 0) {
      const gaps = [];
      for (let i = 1; i < uniqueParagraphs.length; i++) {
        const gap = uniqueParagraphs[i].number - uniqueParagraphs[i-1].number;
        if (gap > 1) {
          gaps.push(`${uniqueParagraphs[i-1].number}→${uniqueParagraphs[i].number}`);
        }
      }
      if (gaps.length > 0 && gaps.length < 10) {
        console.log(`    ⚠ Gaps detected: ${gaps.join(', ')}`);
      }
    }
    
    return uniqueParagraphs;
  }

  createSearchableContent(data) {
    // Combine all content for better LLM searching
    let content = '';
    
    // Add title and abstract
    content += `TITLE: ${data.title}\n\n`;
    content += `ABSTRACT: ${data.abstract}\n\n`;
    
    // Add all numbered paragraphs with markers
    if (data.numberedParagraphs && data.numberedParagraphs.length > 0) {
      content += `DETAILED DESCRIPTION:\n`;
      data.numberedParagraphs.forEach(para => {
        content += `${para.marker} ${para.content}\n`;
      });
      content += '\n';
    }
    
    // Add sections
    if (data.sections && data.sections.length > 0) {
      data.sections.forEach(section => {
        content += `${section.name.toUpperCase()}:\n${section.content}\n\n`;
      });
    }
    
    // Add tables
    if (data.tables && data.tables.length > 0) {
      data.tables.forEach(table => {
        content += `TABLE ${table.tableNumber}: ${table.content}\n\n`;
      });
    }
    
    // Add claims
    if (data.claims && data.claims.length > 0) {
      content += `CLAIMS:\n`;
      data.claims.forEach(claim => {
        content += `Claim ${claim.number}: ${claim.text}\n`;
      });
    }
    
    return content;
  }

  extractHeaderInfo(text) {
    const info = {};
    
    const appNumMatch = text.match(/\(21\)\s*Application number:\s*([\d.]+)/i);
    if (appNumMatch) info.applicationNumber = appNumMatch[1];
    
    const filingDateMatch = text.match(/\(22\)\s*Date of filing:\s*([\d.]+)/i);
    if (filingDateMatch) info.filingDate = filingDateMatch[1];
    
    const pubDateMatch = text.match(/\(43\)\s*Date of publication:\s*([\d.]+)/i);
    if (pubDateMatch) info.publicationDate = pubDateMatch[1];
    
    const priorityMatch = text.match(/\(30\)\s*Priority:\s*([^\n]+)/i);
    if (priorityMatch) info.priority = priorityMatch[1].trim();
    
    const applicantMatch = text.match(/\(71\)\s*Applicant[s]?:\s*([^\n]+)/i);
    if (applicantMatch) info.applicant = applicantMatch[1].trim();
    
    const inventorMatches = [...text.matchAll(/\(72\)\s*Inventor[s]?:\s*([^\n]+)/gi)];
    if (inventorMatches.length > 0) {
      info.inventors = inventorMatches.map(m => m[1].trim());
    }
    
    const classMatch = text.match(/\(51\)\s*Int\s*Cl[.\d]*:\s*([^\n]+)/i);
    if (classMatch) info.classification = classMatch[1].trim();
    
    return info;
  }

  extractTitle(text) {
    const patterns = [
      /\(54\)\s*([A-Z][A-Z\s\-\/]+(?:STEEL|SHEET|METHOD|PROCESS|MAGNETIC|ALLOY|MATERIAL|PRODUCTION|CONTAINING)[A-Z\s\-\/]*)/i,
      /Title[:\s]+([A-Z][^\n]{20,300})/i,
    ];
    
    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const title = match[1].trim().replace(/\s+/g, ' ');
        return title.substring(0, 300);
      }
    }
    
    return 'Patent Document';
  }

  extractAbstract(text) {
    const patterns = [
      /\(57\)\s*([A-Z][^]*?)(?=\n\s*EP\s*\d|Europäisches|European Patent|DETAILED DESCRIPTION|DESCRIPTION OF|TECHNICAL FIELD|\[0*1\]|【0*1】|Claims|$)/i,
      /Abstract[:\s]*\n([^]*?)(?=\n\s*\[0*1\]|【0*1】|TECHNICAL FIELD|Claims|$)/i,
    ];
    
    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let abstract = match[1]
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/\[0*\d+\]/g, '')
          .replace(/【0*\d+】/g, '')
          .replace(/^\s*Abstract[:\s]*/i, '');
        
        if (abstract.length > 100) {
          return abstract.substring(0, 4000);
        }
      }
    }
    
    return 'Abstract not available for this patent document.';
  }

  extractSections(text, numPages) {
    const sections = [];
    
    const sectionHeaders = [
      'TECHNICAL FIELD',
      'BACKGROUND ART',
      'SUMMARY OF INVENTION',
      'TECHNICAL PROBLEM',
      'SOLUTION TO PROBLEM',
      'ADVANTAGEOUS EFFECTS',
      'DESCRIPTION OF EMBODIMENTS',
      'BEST MODE',
      'EXAMPLES',
      'INDUSTRIAL APPLICABILITY'
    ];

    sectionHeaders.forEach(header => {
      const regex = new RegExp(
        `${header.replace(/\s/g, '\\s+')}\\s*([\\s\\S]{100,10000}?)(?=\\n\\s*[A-Z][A-Z\\s]{10,}|$)`, 
        'i'
      );
      const match = text.match(regex);
      
      if (match && match[1]) {
        const content = match[1]
          .trim()
          .replace(/\s+/g, ' ')
          .substring(0, 10000);

        const pageMatch = match[0].match(/\[0*(\d+)\]/);
        const pageNumber = pageMatch ? Math.ceil(parseInt(pageMatch[1]) / 5) : 1;

        sections.push({
          name: this.formatSectionName(header),
          content: content,
          page: pageNumber
        });
      }
    });

    return sections;
  }

  formatSectionName(name) {
    return name.split(/\s+/).map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
  }

  extractTables(text) {
    const tables = [];
    const tablePattern = /Table\s+(\d+)[^\n]*\n([\s\S]{50,2000}?)(?=\n\n|Table|\[0\d+\])/gi;
    let match;
    
    while ((match = tablePattern.exec(text)) !== null) {
      tables.push({
        tableNumber: parseInt(match[1]),
        content: match[2].trim().replace(/\s+/g, ' '),
        type: 'explicit'
      });
    }
    
    return tables.slice(0, 30);
  }

  extractCompositions(text) {
    const compositions = [];
    const rangePattern = /([A-Z][a-z]?)\s*[:=]?\s*([0-9.]+)\s*(?:%?\s*to\s*|[-~])\s*([0-9.]+)\s*(?:%|mass%|wt%)/gi;
    let match;
    
    while ((match = rangePattern.exec(text)) !== null) {
      compositions.push({
        element: match[1],
        min: parseFloat(match[2]),
        max: parseFloat(match[3]),
        unit: 'mass%'
      });
    }
    
    return compositions.slice(0, 50);
  }

  extractTechnicalDetails(text) {
    const details = { temperatures: [], processes: [] };
    const tempPattern = /(\d+)\s*(?:to\s+|-\s*)?(\d+)?\s*(?:°C|℃)/gi;
    let match;
    
    while ((match = tempPattern.exec(text)) !== null) {
      if (match[2]) {
        details.temperatures.push({
          min: parseInt(match[1]),
          max: parseInt(match[2]),
          unit: '°C'
        });
      } else {
        details.temperatures.push({
          value: parseInt(match[1]),
          unit: '°C'
        });
      }
    }
    
    return details;
  }

  extractKeywords(text) {
    const keywords = ['steel', 'magnetic', 'silicon', 'chromium', 'aluminum', 'annealing', 'rolling', 'composition'];
    return keywords.filter(k => text.toLowerCase().includes(k));
  }

  extractClaims(text) {
    const claims = [];
    const claimsMatch = text.match(/Claims\s*\n([^]*?)(?=Description|Drawings|Figures|$)/i);
    
    if (claimsMatch) {
      const claimsText = claimsMatch[1];
      const claimPattern = /(\d+)\.\s*([^]*?)(?=\n\s*\d+\.|$)/g;
      let match;
      
      while ((match = claimPattern.exec(claimsText)) !== null) {
        claims.push({
          number: parseInt(match[1]),
          text: match[2].trim().replace(/\s+/g, ' ').substring(0, 2000)
        });
      }
    }
    
    return claims;
  }

  async processAllPDFs() {
    console.log('\n🚀 Starting comprehensive PDF processing...\n');
    await this.initialize();
    
    try {
      await fs.access(this.pdfDir);
      const files = await fs.readdir(this.pdfDir);
      const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
      
      if (pdfFiles.length === 0) {
        console.log(`⚠️  No PDF files found\n`);
        return;
      }

      console.log(`📚 Found ${pdfFiles.length} PDF file(s)\n`);

      const allPatents = [];
      for (const file of pdfFiles) {
        try {
          const filePath = path.join(this.pdfDir, file);
          const patentData = await this.processPDF(filePath);
          allPatents.push(patentData);
          console.log(`✅ ${patentData.patentNumber}\n`);
        } catch (error) {
          console.error(`❌ Failed: ${file}\n`);
        }
      }

      const outputPath = path.join(this.processedDir, 'patents.json');
      await fs.writeFile(outputPath, JSON.stringify(allPatents, null, 2), 'utf8');
      
      console.log(`\n${'='.repeat(70)}`);
      console.log(`💾 SUCCESS: Saved ${allPatents.length} patents`);
      console.log(`${'='.repeat(70)}\n`);
      
    } catch (error) {
      console.error('\n❌ Fatal Error:', error.message);
    }
  }

  async loadProcessedPatents() {
    try {
      const filePath = path.join(this.processedDir, 'patents.json');
      await fs.access(filePath);
      const data = await fs.readFile(filePath, 'utf8');
      const patents = JSON.parse(data);
      console.log(`📚 Loaded ${patents.length} patents`);
      return patents;
    } catch (error) {
      return [];
    }
  }
}

if (require.main === module) {
  const processor = new PDFProcessor();
  processor.processAllPDFs()
    .then(() => {
      console.log('✅ Complete!\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = new PDFProcessor();
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
        max: 0, // Parse all pages
        version: 'default'
      });
      
      console.log(`  ✓ PDF parsed (${pdfData.numpages} pages, ${pdfData.text.length} chars)`);
      
      const fullText = pdfData.text;
      const fileName = path.basename(filePath, '.pdf');
      
      // Extract everything
      const patentInfo = this.extractPatentInfo(fullText, fileName, pdfData.numpages);
      console.log(`  ✓ Patent Number: ${patentInfo.patentNumber}`);
      console.log(`  ✓ Title: ${patentInfo.title.substring(0, 50)}...`);
      console.log(`  ✓ Abstract length: ${patentInfo.abstract.length} chars`);
      console.log(`  ✓ Sections found: ${patentInfo.sections.length}`);
      console.log(`  ✓ Tables found: ${patentInfo.tables.length}`);
      console.log(`  ✓ Compositions found: ${patentInfo.compositions.length}`);
      console.log(`  ✓ Keywords: ${patentInfo.keywords.join(', ')}`);
      
      return { 
        ...patentInfo, 
        fullText, 
        fileName: path.basename(filePath),
        numPages: pdfData.numpages,
        textLength: fullText.length
      };
    } catch (error) {
      console.error(`❌ Error processing ${path.basename(filePath)}:`, error.message);
      throw error;
    }
  }

  extractPatentInfo(text, fileName, numPages) {
    console.log('  → Extracting patent info...');
    
    const patentNumberMatch = text.match(/EP\s*[\d\s]+A\d/i) || 
                              text.match(/EP[\d]+A\d/i) ||
                              text.match(/EP\d{7}A\d/i);
    
    const patentNumber = patentNumberMatch 
      ? patentNumberMatch[0].replace(/\s/g, '').toUpperCase() 
      : fileName.toUpperCase().replace(/_/g, '');
    
    const title = this.extractTitle(text);
    const abstract = this.extractAbstract(text);
    const sections = this.extractSections(text, numPages);
    const tables = this.extractTables(text);
    const compositions = this.extractCompositions(text);
    const technicalDetails = this.extractTechnicalDetails(text);
    const keywords = this.extractKeywords(text);

    return {
      patentNumber,
      title,
      abstract,
      sections,
      tables,
      compositions,
      technicalDetails,
      keywords,
      processedAt: new Date().toISOString()
    };
  }

  extractTitle(text) {
    const patterns = [
      /\(54\)\s*([A-Z][A-Z\s\-]+(?:STEEL|SHEET|METHOD|PROCESS|MAGNETIC|ALLOY|MATERIAL)[A-Z\s\-]*)/i,
      /Title[:\s]+([A-Z][^\n]{20,200})/i,
      /Invention[:\s]+([A-Z][^\n]{20,200})/i,
    ];
    
    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const title = match[1].trim().replace(/\s+/g, ' ');
        console.log(`    Found title: ${title.substring(0, 50)}...`);
        return title.substring(0, 250);
      }
    }
    
    console.log('    ⚠ Title not found, using default');
    return 'Patent Document';
  }

  extractAbstract(text) {
    const patterns = [
      /\(57\)[\s\S]*?((?:An?|The)\s+[^.]+\.[\s\S]{100,2500}?)(?=\n\n\n|FIG\.|BRIEF|DESCRIPTION|CLAIMS|\[0001\])/i,
      /Abstract[\s:]*\n([\s\S]{100,2500}?)(?=\n\n\n|DESCRIPTION|FIELD|BACKGROUND|TECHNICAL)/i,
      /\(57\)([\s\S]{100,2500}?)(?=FIG\.|Figure|BRIEF|\[0001\])/i,
    ];
    
    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const abstract = match[1]
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/\[[0-9]+\]/g, '');
        
        if (abstract.length > 100) {
          console.log(`    Found abstract: ${abstract.substring(0, 80)}...`);
          return abstract.substring(0, 2000);
        }
      }
    }
    
    const paragraphs = text.split(/\n\n+/);
    for (let para of paragraphs) {
      const cleaned = para.trim().replace(/\s+/g, ' ');
      if (cleaned.length > 200 && cleaned.length < 3000 && /^[A-Z]/.test(cleaned)) {
        console.log('    Using fallback abstract');
        return cleaned.substring(0, 2000);
      }
    }
    
    console.log('    ⚠ Abstract not found');
    return 'Abstract not available for this patent document.';
  }

  extractSections(text, numPages) {
    const sections = [];
    
    // Extract page markers [0001], [0002], etc.
    const pageMarkers = [...text.matchAll(/\[(\d{4})\]/g)];
    
    const sectionHeaders = [
      'TECHNICAL FIELD',
      'FIELD OF THE INVENTION',
      'FIELD OF INVENTION',
      'BACKGROUND ART',
      'BACKGROUND OF THE INVENTION',
      'BACKGROUND',
      'PRIOR ART',
      'SUMMARY OF INVENTION',
      'SUMMARY OF THE INVENTION',
      'SUMMARY',
      'DISCLOSURE OF INVENTION',
      'TECHNICAL PROBLEM',
      'PROBLEM TO BE SOLVED',
      'SOLUTION TO PROBLEM',
      'MEANS FOR SOLVING THE PROBLEM',
      'SOLUTION',
      'ADVANTAGEOUS EFFECTS',
      'ADVANTAGEOUS EFFECTS OF INVENTION',
      'EFFECTS OF THE INVENTION',
      'DESCRIPTION OF EMBODIMENTS',
      'DETAILED DESCRIPTION',
      'DESCRIPTION OF THE EMBODIMENTS',
      'EMBODIMENTS',
      'BEST MODE',
      'EXAMPLES',
      'EXAMPLE',
      'WORKING EXAMPLES',
      'COMPARATIVE EXAMPLES',
      'INDUSTRIAL APPLICABILITY',
      'MODE FOR CARRYING OUT THE INVENTION',
      'MODE FOR THE INVENTION'
    ];

    sectionHeaders.forEach(header => {
      // More flexible regex to catch variations
      const regex = new RegExp(
        `${header.replace(/\s/g, '\\s*')}[\\s\\S]{0,150}?([\\s\\S]{100,5000}?)(?=\\n\\s*[A-Z][A-Z\\s]{10,}|$)`, 
        'i'
      );
      const match = text.match(regex);
      
      if (match && match[1]) {
        const sectionStartIndex = text.indexOf(match[0]);
        let pageNumber = 1;
        
        // Calculate page number
        for (let marker of pageMarkers) {
          if (marker.index < sectionStartIndex) {
            const markerNum = parseInt(marker[1]);
            pageNumber = Math.max(1, Math.floor(markerNum / 5) + 1);
          }
        }

        // If no markers, estimate from position in text
        if (pageMarkers.length === 0 && numPages > 1) {
          const relativePosition = sectionStartIndex / text.length;
          pageNumber = Math.max(1, Math.ceil(relativePosition * numPages));
        }

        const content = match[1]
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/\[[0-9]+\]/g, '');

        sections.push({
          name: this.formatSectionName(header),
          content: content.substring(0, 5000),
          page: pageNumber,
          startIndex: sectionStartIndex
        });
      }
    });

    // Sort sections by appearance in document
    sections.sort((a, b) => a.startIndex - b.startIndex);
    sections.forEach(s => delete s.startIndex);

    console.log(`    Found ${sections.length} sections`);
    return sections;
  }

  formatSectionName(name) {
    return name
      .split(/\s+/)
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  extractTables(text) {
    const tables = [];
    
    // Pattern 1: Table headers with data
    const tablePattern = /Table\s+(\d+)[^\n]*\n([\s\S]{50,1500}?)(?=\n\n|Table|\[|\d+\.\s+[A-Z])/gi;
    let match;
    
    while ((match = tablePattern.exec(text)) !== null) {
      const tableNumber = match[1];
      const tableContent = match[2].trim();
      
      tables.push({
        tableNumber: parseInt(tableNumber),
        content: tableContent.replace(/\s+/g, ' '),
        type: 'explicit'
      });
    }
    
    // Pattern 2: Composition tables (mass%, wt%)
    const compositionPattern = /(?:Component|Element|C|Si|Mn|Al|Cr|Cu|Ti|Ni|Fe)[\s\S]{10,50}?(?:mass%|wt%|%)[^\n]{10,200}\n(?:[^\n]{10,200}(?:mass%|wt%|%)[^\n]{10,200}\n){2,}/gi;
    
    while ((match = compositionPattern.exec(text)) !== null) {
      const content = match[0].trim();
      
      // Check if not already captured
      const isDuplicate = tables.some(t => t.content.includes(content.substring(0, 50)));
      if (!isDuplicate && content.length > 50) {
        tables.push({
          tableNumber: tables.length + 1,
          content: content.replace(/\s+/g, ' '),
          type: 'composition'
        });
      }
    }
    
    // Pattern 3: Data tables with multiple rows/columns
    const dataTablePattern = /(?:[A-Za-z\s]+\s+[0-9.]+\s+[0-9.]+[^\n]{0,100}\n){3,}/g;
    
    while ((match = dataTablePattern.exec(text)) !== null) {
      const content = match[0].trim();
      
      const isDuplicate = tables.some(t => 
        t.content.substring(0, 100) === content.substring(0, 100)
      );
      
      if (!isDuplicate && content.length > 100) {
        tables.push({
          tableNumber: tables.length + 1,
          content: content.replace(/\s+/g, ' '),
          type: 'data'
        });
      }
    }
    
    console.log(`    Found ${tables.length} tables`);
    return tables.slice(0, 20); // Limit to 20 tables
  }

  extractCompositions(text) {
    const compositions = [];
    
    // Pattern for composition ranges: "2.5-4.0% Si"
    const rangePattern = /([A-Z][a-z]?)\s*[:=]?\s*([0-9.]+)\s*(?:-|to|~)\s*([0-9.]+)\s*(?:mass%|wt%|%)/gi;
    let match;
    
    while ((match = rangePattern.exec(text)) !== null) {
      compositions.push({
        element: match[1],
        min: parseFloat(match[2]),
        max: parseFloat(match[3]),
        unit: 'mass%',
        raw: match[0]
      });
    }
    
    // Pattern for single values: "Si: 3.0%"
    const singlePattern = /([A-Z][a-z]?)\s*[:=]\s*([0-9.]+)\s*(?:mass%|wt%|%)/gi;
    
    while ((match = singlePattern.exec(text)) !== null) {
      const element = match[1];
      const value = parseFloat(match[2]);
      
      // Don't duplicate range entries
      const isDuplicate = compositions.some(c => 
        c.element === element && value >= c.min && value <= c.max
      );
      
      if (!isDuplicate) {
        compositions.push({
          element: element,
          value: value,
          unit: 'mass%',
          raw: match[0]
        });
      }
    }
    
    console.log(`    Found ${compositions.length} compositions`);
    return compositions.slice(0, 30);
  }

  extractTechnicalDetails(text) {
    const details = {
      temperatures: [],
      pressures: [],
      thicknesses: [],
      processes: []
    };
    
    // Temperatures: "1050°C", "1050-1150°C"
    const tempPattern = /([0-9]+)\s*(?:-|to)\s*([0-9]+)?\s*°C/gi;
    let match;
    
    while ((match = tempPattern.exec(text)) !== null) {
      if (match[2]) {
        details.temperatures.push({
          min: parseInt(match[1]),
          max: parseInt(match[2]),
          unit: '°C',
          raw: match[0]
        });
      } else {
        details.temperatures.push({
          value: parseInt(match[1]),
          unit: '°C',
          raw: match[0]
        });
      }
    }
    
    // Processes
    const processKeywords = [
      'hot rolling', 'cold rolling', 'annealing', 'quenching',
      'tempering', 'heating', 'cooling', 'casting', 'forging'
    ];
    
    processKeywords.forEach(keyword => {
      const regex = new RegExp(`${keyword}[^.]{0,200}[.]`, 'gi');
      const matches = [...text.matchAll(regex)];
      
      matches.forEach(m => {
        details.processes.push({
          type: keyword,
          description: m[0].trim().substring(0, 200)
        });
      });
    });
    
    console.log(`    Technical details: ${details.temperatures.length} temps, ${details.processes.length} processes`);
    return details;
  }

  extractKeywords(text) {
    const lowerText = text.toLowerCase();
    const keywords = [
      'steel', 'magnetic', 'electrical', 'electromagnetic',
      'silicon', 'chromium', 'aluminum', 'aluminium',
      'manganese', 'copper', 'titanium', 'nickel', 'carbon',
      'annealing', 'rolling', 'hot rolling', 'cold rolling',
      'composition', 'temperature', 'manufacturing', 'process',
      'sheet', 'grain', 'texture', 'core loss', 'magnetic flux',
      'permeability', 'coercivity', 'saturation', 'hysteresis',
      'non-oriented', 'grain-oriented', 'crystallographic',
      'mechanical properties', 'tensile strength', 'hardness'
    ];

    const found = keywords.filter(k => lowerText.includes(k));
    console.log(`    Keywords: ${found.length} found`);
    return found;
  }

  async processAllPDFs() {
    console.log('\n🚀 Starting comprehensive PDF processing...\n');
    
    await this.initialize();
    
    try {
      try {
        await fs.access(this.pdfDir);
        console.log('✅ Uploads directory exists\n');
      } catch (error) {
        console.error(`❌ Uploads directory not found: ${this.pdfDir}`);
        return;
      }

      const files = await fs.readdir(this.pdfDir);
      const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
      
      if (pdfFiles.length === 0) {
        console.log(`⚠️  No PDF files found in: ${this.pdfDir}\n`);
        return;
      }

      console.log(`📚 Found ${pdfFiles.length} PDF file(s):`);
      pdfFiles.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
      console.log('');

      const allPatents = [];
      let successCount = 0;
      let failCount = 0;

      for (const file of pdfFiles) {
        try {
          const filePath = path.join(this.pdfDir, file);
          const patentData = await this.processPDF(filePath);
          allPatents.push(patentData);
          successCount++;
          console.log(`✅ Successfully processed: ${patentData.patentNumber}`);
        } catch (error) {
          failCount++;
          console.error(`❌ Failed to process: ${file}`);
          console.error(`   Error: ${error.message}`);
        }
      }

      if (allPatents.length === 0) {
        console.log('\n❌ No patents were successfully processed\n');
        return;
      }

      const outputPath = path.join(this.processedDir, 'patents.json');
      await fs.writeFile(outputPath, JSON.stringify(allPatents, null, 2), 'utf8');

      console.log(`\n${'='.repeat(70)}`);
      console.log('📊 PROCESSING SUMMARY');
      console.log(`${'='.repeat(70)}`);
      console.log(`✅ Success: ${successCount} patents`);
      console.log(`❌ Failed:  ${failCount} patents`);
      console.log(`💾 Saved to: ${outputPath}`);
      console.log(`${'='.repeat(70)}\n`);

      console.log('📋 Processed Patents:\n');
      allPatents.forEach((p, i) => {
        console.log(`${i + 1}. ${p.patentNumber}`);
        console.log(`   Title:        ${p.title}`);
        console.log(`   Pages:        ${p.numPages}`);
        console.log(`   Text length:  ${p.textLength.toLocaleString()} chars`);
        console.log(`   Sections:     ${p.sections.length}`);
        console.log(`   Tables:       ${p.tables.length}`);
        console.log(`   Compositions: ${p.compositions.length}`);
        console.log(`   Temperatures: ${p.technicalDetails.temperatures.length}`);
        console.log(`   Keywords:     ${p.keywords.length}`);
        console.log('');
      });

    } catch (error) {
      console.error('\n❌ Fatal Error:', error.message);
      console.error(error.stack);
    }
  }

  async loadProcessedPatents() {
    try {
      const filePath = path.join(this.processedDir, 'patents.json');
      await fs.access(filePath);
      const data = await fs.readFile(filePath, 'utf8');
      const patents = JSON.parse(data);
      console.log(`📚 Loaded ${patents.length} patent(s) from cache`);
      return patents;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('⚠️  No processed patents found. Run: npm run process');
      } else {
        console.error('❌ Error loading patents:', error.message);
      }
      return [];
    }
  }
}

if (require.main === module) {
  const processor = new PDFProcessor();
  processor.processAllPDFs()
    .then(() => {
      console.log('✅ Processing complete!\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Processing failed:', error);
      process.exit(1);
    });
}

module.exports = new PDFProcessor();
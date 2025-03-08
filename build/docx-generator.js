// Simple markdown to DOCX converter
class DocxGenerator {
  static async generateDocx(markdown) {
    const docx = new window.docx.Document({
      sections: [{
        properties: {},
        children: this.parseMarkdown(markdown)
      }]
    });

    const blob = await window.docx.Packer.toBlob(docx);
    return blob;
  }

  static parseMarkdown(markdown) {
    const paragraphs = [];
    const lines = markdown.split('\n');
    let inCodeBlock = false;
    let codeContent = '';

    for (let line of lines) {
      // Handle code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          paragraphs.push(new window.docx.Paragraph({
            children: [
              new window.docx.TextRun({
                text: codeContent,
                font: 'Courier New',
                size: 20
              })
            ],
            shading: {
              type: 'solid',
              color: 'F5F5F5'
            }
          }));
          codeContent = '';
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent += line + '\n';
        continue;
      }

      // Handle headings
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)[0].length;
        const text = line.replace(/^#+\s/, '');
        paragraphs.push(new window.docx.Paragraph({
          text: text,
          heading: `Heading${level}`,
          spacing: { before: 240, after: 120 }
        }));
        continue;
      }

      // Handle tables
      if (line.includes('|')) {
        const cells = line.split('|')
          .filter(cell => cell.trim())
          .map(cell => cell.trim());
        
        if (cells.length > 0) {
          const row = new window.docx.TableRow({
            children: cells.map(cell => 
              new window.docx.TableCell({
                children: [new window.docx.Paragraph(cell)]
              })
            )
          });
          
          // If this is the first row of the table
          if (!paragraphs.length || !(paragraphs[paragraphs.length - 1] instanceof window.docx.Table)) {
            paragraphs.push(new window.docx.Table({
              rows: [row]
            }));
          } else {
            paragraphs[paragraphs.length - 1].rows.push(row);
          }
          continue;
        }
      }

      // Handle regular paragraphs
      if (line.trim()) {
        paragraphs.push(new window.docx.Paragraph({
          text: line,
          spacing: { before: 120, after: 120 }
        }));
      }
    }

    return paragraphs;
  }
} 
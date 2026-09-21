import pdfParse from 'pdf-parse';

export interface ExtractedPdfResult {
  text: string;
  pageCount: number;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<ExtractedPdfResult> {
  try {
    const parse = typeof pdfParse === 'function' ? pdfParse : (pdfParse as any)?.default || pdfParse;
    if (typeof parse !== 'function') {
      throw new Error('PDF parsing engine could not be initialized.');
    }

    const data = await parse(buffer);
    const cleanedText = (data?.text || '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    return {
      text: cleanedText,
      pageCount: data?.numpages || 1,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error parsing PDF';
    throw new Error(`Failed to parse PDF document: ${message}`);
  }
}

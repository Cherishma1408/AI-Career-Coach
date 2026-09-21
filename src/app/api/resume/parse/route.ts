import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPdf } from '@/lib/pdf/extract';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please select a PDF resume.' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Invalid file format. Only PDF files are supported.' },
        { status: 400 }
      );
    }

    // 5MB limit
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit. Please upload a smaller file.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { text, pageCount } = await extractTextFromPdf(buffer);

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        {
          error:
            'The uploaded PDF appears to be empty, scanned as an unreadable image, or contains insufficient text to analyze. Please upload a text-selectable PDF.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      pageCount,
      text,
    });
  } catch (error: unknown) {
    console.error('Error parsing resume PDF:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse resume PDF' },
      { status: 500 }
    );
  }
}

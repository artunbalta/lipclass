import { NextRequest, NextResponse } from 'next/server';
import { generateSummary } from '@/lib/api/summarization';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, summaryType = 'comprehensive', language = 'tr' } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'text is required and must be a string' },
        { status: 400 }
      );
    }

    if (text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Text is too short to summarize (minimum 50 characters)' },
        { status: 400 }
      );
    }

    const result = await generateSummary({
      text,
      summaryType,
      language,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Summarize] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Summarization failed' },
      { status: 500 }
    );
  }
}

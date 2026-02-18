import { NextRequest, NextResponse } from 'next/server';
import { generateMCQs } from '@/lib/api/mcq-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      documentSummary,
      numQuestions = 15,
      difficulty = 'medium',
      questionType = 'mixed',
      topic,
      language = 'tr',
    } = body;

    if (!documentSummary || typeof documentSummary !== 'string') {
      return NextResponse.json(
        { error: 'documentSummary is required' },
        { status: 400 }
      );
    }

    if (numQuestions < 1 || numQuestions > 50) {
      return NextResponse.json(
        { error: 'numQuestions must be between 1 and 50' },
        { status: 400 }
      );
    }

    const result = await generateMCQs({
      documentSummary,
      numQuestions,
      difficulty,
      questionType,
      topic,
      language,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Generate MCQ] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'MCQ generation failed' },
      { status: 500 }
    );
  }
}

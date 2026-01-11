// ============================================
// src/app/api/agent/route.ts
// Version: 20260111-205500
// Added: auth check, MAX_ITERATIONS limit
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/gemini';
import { functionMap } from '@/lib/agent-queries';
import { logAgentQuery } from '@/lib/activity';
import { auth } from '@/lib/auth';

const MAX_ITERATIONS = 10;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let questionText = '';
  let answerText = '';
  let success = true;

  try {
    const { message, history = [] } = await request.json();
    questionText = message;

    if (!message) {
      return NextResponse.json({ error: 'חסרה הודעה' }, { status: 400 });
    }

    const model = getGeminiModel();
    
    const chatHistory = history.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: chatHistory,
    });

    let result = await chat.sendMessage(message);
    let response = result.response;
    let functionCalls = response.functionCalls();
    
    const calledFunctions: string[] = [];
    let iterations = 0;

    while (functionCalls && functionCalls.length > 0 && iterations < MAX_ITERATIONS) {
      iterations++;
      const functionCall = functionCalls[0];
      const functionName = functionCall.name;
      const functionArgs = functionCall.args || {};

      calledFunctions.push(functionName);
      console.log(`Calling function: ${functionName}`, functionArgs);

      const func = functionMap[functionName];
      if (!func) {
        throw new Error(`פונקציה לא נמצאה: ${functionName}`);
      }

      let functionResult;
      try {
        functionResult = await func(functionArgs);
      } catch (err) {
        console.error(`Error in function ${functionName}:`, err);
        functionResult = { error: 'שגיאה בשליפת נתונים' };
      }

      result = await chat.sendMessage([
        {
          functionResponse: {
            name: functionName,
            response: { result: functionResult },
          },
        },
      ]);

      response = result.response;
      functionCalls = response.functionCalls();
    }

    const textResponse = response.text() || 'לא הצלחתי לעבד את הבקשה';
    answerText = textResponse;

    // תיעוד השאילתה
    const duration = Date.now() - startTime;
    await logAgentQuery(questionText, answerText, duration, true);

    return NextResponse.json({
      response: textResponse,
    });
  } catch (error) {
    console.error('Agent error:', error);
    success = false;
    answerText = String(error);

    // תיעוד שגיאה
    const duration = Date.now() - startTime;
    await logAgentQuery(questionText, `ERROR: ${answerText}`, duration, false);

    return NextResponse.json(
      { error: 'שגיאה בעיבוד הבקשה', details: String(error) },
      { status: 500 }
    );
  }
}

// ============================================
// src/app/api/agent/route.ts
// Version: 20260124-STAGE63
// Stage 6.3 Remediation: Maybach Grade Security
// R1: Permission vs Data Distinction
// R2: Guarded Analysis with Explicit Hedging
// R3: Anti-Manipulation Detection
// R4: Activity Log Integration
// R5: Explicit Uncertainty & Refusal Framework
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/gemini';
import { functionMap } from '@/lib/agent-queries';
import { logAgentQuery, logActivity } from '@/lib/activity';
import { auth } from '@/lib/auth';
import {
  hasModuleAccess,
  createNoPermissionResponse,
  createQueryFailedResponse,
  createManipulationResponse,
  type AgentResponseMetadata,
} from '@/lib/agent-response';
import {
  detectManipulation,
  logManipulationAttempt,
  checkRateLimit,
  recordQuery,
  recordManipulationAttempt,
  sanitizeInput,
  createSecurityContext,
} from '@/lib/agent-security';

const MAX_ITERATIONS = 10;

// Map function names to their required modules for permission checking
const FUNCTION_MODULE_MAP: Record<string, string> = {
  // HR module
  getEmployees: 'hr',
  getEmployeeById: 'hr',
  countEmployees: 'hr',
  getEmployeesStats: 'hr',
  getUpcomingBirthdays: 'hr',
  getChildrenBirthdays: 'hr',
  getEmployeesWithEducation: 'hr',
  // Projects module
  getProjects: 'projects',
  getProjectById: 'projects',
  countProjects: 'projects',
  getProjectsStats: 'projects',
  getProjectEvents: 'projects',
  getProjectContacts: 'projects',
  getProjectLeads: 'projects',
  // Contacts module
  getContacts: 'contacts',
  getContactById: 'contacts',
  getContactsByDiscipline: 'contacts',
  countContacts: 'contacts',
  // Organizations module
  getOrganizations: 'organizations',
  getOrganizationById: 'organizations',
  // Vehicles module
  getVehicles: 'vehicles',
  getVehicleById: 'vehicles',
  getVehicleByDriver: 'vehicles',
  getVehicleFuelLogs: 'vehicles',
  getVehicleServices: 'vehicles',
  getVehicleAccidents: 'vehicles',
  getVehicleTickets: 'vehicles',
  countVehicles: 'vehicles',
  getVehiclesStats: 'vehicles',
  getVehiclesNeedingService: 'vehicles',
  getVehicleDocuments: 'vehicles',
  getVehiclesWithExpiringDocuments: 'vehicles',
  getVehicleTollRoads: 'vehicles',
  getTollRoadStats: 'vehicles',
  getVehicleParkings: 'vehicles',
  getParkingStats: 'vehicles',
  getVehicleAssignments: 'vehicles',
  // Equipment module
  getEquipment: 'equipment',
  getEquipmentById: 'equipment',
  countEquipment: 'equipment',
  getEquipmentStats: 'equipment',
  // Events module
  searchEvents: 'events',
  getRecentEvents: 'events',
  searchFileContents: 'events',
  getFileSummary: 'events',
  // Reviews module
  getVendorRatings: 'reviews',
  getTopRatedVendors: 'reviews',
  getVendorRatingStats: 'reviews',
  // Users module (ADMIN only)
  getUsers: 'users',
  getUserById: 'users',
  countUsers: 'users',
  // Activity Log (ADMIN and MANAGER)
  getActivityLogs: 'activityLog',
  getActivityStats: 'activityLog',
  getEntityHistory: 'activityLog',
  getUserActivity: 'activityLog',
  getSecurityAudit: 'activityLog',
  // Data Dictionary (all roles)
  getSchemaCatalog: 'contacts', // Public schema info
  getFieldInfo: 'contacts',
  findFieldBySynonym: 'contacts',
  searchAll: 'contacts', // General search
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any)?.id || 'unknown';
  const userEmail = session.user?.email || 'unknown';
  const userRole = (session.user as any)?.role?.name || 'USER';

  const startTime = Date.now();
  let questionText = '';
  let answerText = '';
  let responseMetadata: Partial<AgentResponseMetadata> = {
    userId,
    userRole,
    timestamp: new Date().toISOString(),
  };

  try {
    // R3: Rate limiting check
    const rateLimitResult = checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      await logActivity({
        action: 'AGENT_RATE_LIMITED',
        category: 'SECURITY',
        module: 'agent',
        userId,
        userEmail,
        userRole,
        details: { reason: rateLimitResult.reason },
      });

      return NextResponse.json(
        {
          error: rateLimitResult.reason === 'MANIPULATION_BLOCKED'
            ? 'הגישה נחסמה זמנית מסיבות אבטחה'
            : 'חרגת ממספר השאילתות המותר. נסה שוב בעוד דקה.',
          meta: { state: 'REFUSE_QUERY_FAILED', ...responseMetadata },
        },
        { status: 429 }
      );
    }

    const { message, history = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'חסרה הודעה' }, { status: 400 });
    }

    // R3: Sanitize input
    const sanitizedMessage = sanitizeInput(message);
    questionText = sanitizedMessage;

    // R3: Manipulation detection
    const manipulationResult = detectManipulation(sanitizedMessage);
    if (manipulationResult.detected) {
      // Log the attempt
      await logManipulationAttempt(
        userId,
        userEmail,
        userRole,
        sanitizedMessage,
        manipulationResult
      );

      recordManipulationAttempt(userId);

      // Critical severity = immediate block
      if (manipulationResult.highestSeverity === 'CRITICAL') {
        return NextResponse.json(
          {
            error: 'הבקשה נדחתה מסיבות אבטחה.',
            meta: {
              state: 'REFUSE_MANIPULATION',
              ...responseMetadata,
              manipulationDetected: true,
            },
          },
          { status: 403 }
        );
      }

      // HIGH severity = warn but continue with extra scrutiny
      // MEDIUM severity = log only
    }

    // Record this query
    recordQuery(userId, sanitizedMessage);

    const model = getGeminiModel();

    const chatHistory = history.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: chatHistory,
    });

    let result = await chat.sendMessage(sanitizedMessage);
    let response = result.response;
    let functionCalls = response.functionCalls();

    const calledFunctions: string[] = [];
    const permissionDeniedModules: string[] = [];
    let iterations = 0;

    while (functionCalls && functionCalls.length > 0 && iterations < MAX_ITERATIONS) {
      iterations++;
      const functionCall = functionCalls[0];
      const functionName = functionCall.name;
      const functionArgs = functionCall.args || {};

      calledFunctions.push(functionName);
      console.log(`[Agent] Calling function: ${functionName}`, functionArgs);

      // R1: Permission check before function execution
      const requiredModule = FUNCTION_MODULE_MAP[functionName];
      if (requiredModule && !hasModuleAccess(userRole, requiredModule, 'read')) {
        // Log permission denial
        await logActivity({
          action: 'AGENT_PERMISSION_DENIED',
          category: 'SECURITY',
          module: 'agent',
          userId,
          userEmail,
          userRole,
          details: {
            function: functionName,
            requiredModule,
            userRole,
          },
          targetType: 'PERMISSION_CHECK',
          targetId: functionName,
          targetName: `Permission denied: ${requiredModule}`,
        });

        permissionDeniedModules.push(requiredModule);

        // Send permission denied response to LLM
        const permissionResponse = createNoPermissionResponse({
          userId,
          userRole,
          module: requiredModule,
        });

        result = await chat.sendMessage([
          {
            functionResponse: {
              name: functionName,
              response: {
                result: null,
                error: 'PERMISSION_DENIED',
                message: permissionResponse.message,
                meta: permissionResponse.meta,
              },
            },
          },
        ]);

        response = result.response;
        functionCalls = response.functionCalls();
        continue;
      }

      const func = functionMap[functionName];
      if (!func) {
        throw new Error(`פונקציה לא נמצאה: ${functionName}`);
      }

      let functionResult;
      try {
        functionResult = await func(functionArgs);

        // R1: Distinguish no data from query failure
        if (functionResult === null || functionResult === undefined) {
          functionResult = {
            _meta: {
              state: 'REFUSE_NO_DATA',
              message: 'לא נמצאו תוצאות עבור השאילתה',
              querySucceeded: true,
              recordCount: 0,
            },
            data: null,
          };
        } else if (Array.isArray(functionResult) && functionResult.length === 0) {
          functionResult = {
            _meta: {
              state: 'REFUSE_NO_DATA',
              message: 'לא נמצאו רשומות התואמות לחיפוש',
              querySucceeded: true,
              recordCount: 0,
            },
            data: [],
          };
        }
      } catch (err) {
        console.error(`[Agent] Error in function ${functionName}:`, err);

        const errorCode = `ERR-${Date.now().toString(36)}`;
        const failedResponse = createQueryFailedResponse({
          userId,
          userRole,
          module: requiredModule,
          function: functionName,
          errorCode,
          errorType: 'DATABASE_ERROR',
        });

        functionResult = {
          _meta: failedResponse.meta,
          error: failedResponse.message,
          data: null,
        };
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

    // Log the successful query
    const duration = Date.now() - startTime;
    await logAgentQuery(questionText, answerText, duration, true);

    // Build response with metadata
    const finalResponse: any = {
      response: textResponse,
      meta: {
        state: 'ANSWER_WITH_DATA',
        ...responseMetadata,
        functions: calledFunctions,
        duration,
      },
    };

    // R1: Include permission info if any were denied
    if (permissionDeniedModules.length > 0) {
      finalResponse.meta.permissionDenied = permissionDeniedModules;
      finalResponse.meta.note = 'חלק מהנתונים אינם זמינים עקב הרשאות';
    }

    return NextResponse.json(finalResponse);
  } catch (error) {
    console.error('[Agent] Error:', error);
    answerText = String(error);

    // Log error
    const duration = Date.now() - startTime;
    await logAgentQuery(questionText, `ERROR: ${answerText}`, duration, false);

    const errorCode = `ERR-${Date.now().toString(36)}`;

    return NextResponse.json(
      {
        error: 'שגיאה בעיבוד הבקשה',
        meta: {
          state: 'REFUSE_QUERY_FAILED',
          ...responseMetadata,
          errorCode,
        },
      },
      { status: 500 }
    );
  }
}

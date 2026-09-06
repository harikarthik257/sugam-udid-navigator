import { GoogleGenAI, ApiError, type Content } from "@google/genai";
import { NextResponse } from "next/server";
import udidData from "@/data/schemes/udid.json";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// gemini-2.5-flash was deprecated for new users (confirmed live by the API,
// which pointed to gemini-3.6-flash) — but that model's free tier turned out
// to be capped at just 20 requests/day (confirmed live via a 429
// RESOURCE_EXHAUSTED error), unworkable even for testing. Free-tier quotas
// are scoped per-model, and "-lite" variants are consistently reported with
// much more generous free limits, so this uses gemini-3.5-flash-lite.
const MODEL = "gemini-3.5-flash-lite";

type ChatMessage = { role: "user" | "assistant"; content: string };

type ExtractResult = {
  category_id: string | null;
  category_confidence: "high" | "medium" | "low" | "none";
  needs_clarification: boolean;
  clarifying_question: string | null;
  opening_message: string | null;
  language: "en" | "hi";
};

const CATEGORY_IDS = udidData.disability_categories.map((c) => c.id);

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    category_id: {
      type: ["string", "null"],
      enum: [...CATEGORY_IDS, null],
      description:
        "The best-matching disability category id from the fixed list, or null if not yet clear.",
    },
    category_confidence: {
      type: "string",
      enum: ["high", "medium", "low", "none"],
      description: "How confident the match is based on what the user has said.",
    },
    needs_clarification: {
      type: "boolean",
      description:
        "True if you should ask a follow-up question before giving guidance (e.g. category is ambiguous or confidence is not high).",
    },
    clarifying_question: {
      type: ["string", "null"],
      description:
        "A short, warm, plain-language follow-up question, in the user's detected language, if needs_clarification is true. Otherwise null.",
    },
    opening_message: {
      type: ["string", "null"],
      description:
        "If needs_clarification is false: a short (2-3 sentence) warm, plain-text opening acknowledging their situation and confirming the matched category by name. Plain text only — no markdown, no headers, no bullet points, no asterisks, since the actual steps/documents are rendered separately from a fixed dataset, not from this text. Otherwise null.",
    },
    language: {
      type: "string",
      enum: ["en", "hi"],
      description: "The language the user is writing/speaking in.",
    },
  },
  required: [
    "category_id",
    "category_confidence",
    "needs_clarification",
    "clarifying_question",
    "opening_message",
    "language",
  ],
};

function toGeminiContents(history: ChatMessage[], latest: string): Content[] {
  return [
    ...history.map(
      (m): Content => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })
    ),
    { role: "user", parts: [{ text: latest }] },
  ];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini's free tier intermittently returns 503 "high demand, try again" —
// described by Google as usually-temporary spikes, confirmed by observing
// two such failures in manual testing that succeeded moments later. Retry
// a couple of times with backoff before surfacing an error to the user.
async function generateContentWithRetry(
  params: Parameters<typeof ai.models.generateContent>[0]
) {
  const delaysMs = [1500, 3500];
  for (let attempt = 0; ; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      const isTransient = err instanceof ApiError && err.status === 503;
      if (!isTransient || attempt >= delaysMs.length) throw err;
      await sleep(delaysMs[attempt]);
    }
  }
}

function buildChecklist(categoryId: string) {
  const category = udidData.disability_categories.find((c) => c.id === categoryId);
  if (!category) return null;
  return {
    category,
    process: udidData.process,
    disclaimer: udidData._meta.disclaimer,
    sources: udidData._meta.sources,
  };
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing GEMINI_API_KEY. See web/.env.local.example." },
      { status: 500 }
    );
  }

  let message: string;
  let history: ChatMessage[];
  try {
    ({ message, history } = (await request.json()) as {
      message: string;
      history: ChatMessage[];
    });
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Missing 'message'." }, { status: 400 });
  }

  try {
    const extraction = await generateContentWithRetry({
      model: MODEL,
      contents: toGeminiContents(history, message),
      config: {
        systemInstruction:
          "You help match a person's plain-language description of their (or a family member's) disability to one of a fixed set of 21 legally recognized disability categories in India, so they can be pointed to the correct UDID (disability certificate) application guidance. You are not a diagnostic tool and must never assess severity yourself — only identify which named category best fits what the user described, or ask a clarifying question if it's unclear. When you have a confident match, also write a short warm opening_message acknowledging their situation in the same language they used — do not invent any requirement, office name, percentage, or document, since the real checklist is rendered separately from a fixed dataset. Detect whether the user is writing in English or Hindi. Respond ONLY with the JSON object described by the schema.",
        responseMimeType: "application/json",
        responseJsonSchema: EXTRACT_SCHEMA,
      },
    });

    const raw = extraction.text;
    if (!raw) {
      return NextResponse.json(
        { error: "Could not process the message. Please try again." },
        { status: 502 }
      );
    }
    const result = JSON.parse(raw) as ExtractResult;

    if (
      result.needs_clarification ||
      !result.category_id ||
      result.category_confidence === "none" ||
      result.category_confidence === "low"
    ) {
      return NextResponse.json({
        type: "clarification",
        message:
          result.clarifying_question ??
          (result.language === "hi"
            ? "क्या आप थोड़ा और बता सकते हैं कि यह किस तरह की स्थिति है?"
            : "Could you tell me a bit more about the condition or difficulty involved?"),
        language: result.language,
      });
    }

    const checklist = buildChecklist(result.category_id);
    if (!checklist) {
      return NextResponse.json({ error: "Internal error matching category." }, { status: 500 });
    }

    // The step-by-step / document list is rendered separately, deterministically,
    // straight from `checklist` (see page.tsx) — never from LLM output. The
    // opening line comes from the same extraction call above (opening_message)
    // rather than a second API call, to stay well within the free tier's
    // per-day request quota.
    return NextResponse.json({
      type: "checklist",
      message: result.opening_message ?? "",
      language: result.language,
      checklist,
    });
  } catch (err) {
    const isAuthError =
      err instanceof ApiError &&
      (err.status === 401 ||
        err.status === 403 ||
        (err.status === 400 && err.message.includes("API_KEY_INVALID")));
    console.error("Chat API error:", err);
    return NextResponse.json(
      {
        error: isAuthError
          ? "The AI service isn't configured correctly (invalid API key)."
          : "The AI service is temporarily unavailable. Please try again in a moment.",
      },
      { status: 502 }
    );
  }
}

import { GoogleGenAI, ApiError, type Content } from "@google/genai";
import { NextResponse } from "next/server";
import udidData from "@/data/schemes/udid.json";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Stable (non-preview) model, confirmed free-tier eligible — avoids relying
// on a preview model that could change or require a paid tier mid-hackathon.
const MODEL = "gemini-2.5-flash";

type ChatMessage = { role: "user" | "assistant"; content: string };

type ExtractResult = {
  category_id: string | null;
  category_confidence: "high" | "medium" | "low" | "none";
  needs_clarification: boolean;
  clarifying_question: string | null;
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
    const extraction = await ai.models.generateContent({
      model: MODEL,
      contents: toGeminiContents(history, message),
      config: {
        systemInstruction:
          "You help match a person's plain-language description of their (or a family member's) disability to one of a fixed set of 21 legally recognized disability categories in India, so they can be pointed to the correct UDID (disability certificate) application guidance. You are not a diagnostic tool and must never assess severity yourself — only identify which named category best fits what the user described, or ask a clarifying question if it's unclear. Detect whether the user is writing in English or Hindi. Respond ONLY with the JSON object described by the schema.",
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

    const explanation = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Write the guidance now: a short warm opening acknowledging their situation, then the application steps as a numbered list, then the documents needed (general + category-specific) as a bullet list, then the disclaimer.",
            },
          ],
        },
      ],
      config: {
        systemInstruction: `You explain UDID (disability certificate) application guidance warmly and clearly in plain ${
          result.language === "hi" ? "Hindi" : "English"
        }, suitable for someone who may not be familiar with government processes. You must ONLY use the facts given to you in the JSON below — do not add, guess, or invent any requirement, office name, percentage, or document not present in it. End with the disclaimer text provided, translated naturally if needed.\n\nFACTS (source of truth, do not deviate):\n${JSON.stringify(
          checklist
        )}`,
      },
    });

    const explanationText = explanation.text ?? "";

    return NextResponse.json({
      type: "checklist",
      message: explanationText,
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

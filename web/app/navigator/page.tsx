"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Minimal Web Speech API surface — not part of TypeScript's lib.dom.d.ts.
interface SpeechRecognitionResultEvent extends Event {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type CategoryFact = {
  id: string;
  name: string;
  group: string;
  typical_additional_docs: string[];
};

type ChecklistData = {
  category: CategoryFact;
  process: {
    portal: string;
    cost: string;
    steps: string[];
    typical_documents: string[];
    note_on_percentage: string;
  };
  disclaimer: string;
  sources: string[];
};

type ChatEntry = {
  role: "user" | "assistant";
  content: string;
  checklist?: ChecklistData;
};

const WELCOME_EN =
  "Tell me, in your own words, about the disability or health condition — yours or a family member's — that you'd like help getting a UDID (disability certificate) for. You can type or use the microphone, in English or Hindi.";

export default function Home() {
  const [messages, setMessages] = useState<ChatEntry[]>([
    { role: "assistant", content: WELCOME_EN },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [voiceOut, setVoiceOut] = useState(false);
  const [listening, setListening] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!voiceOut) return;
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && typeof window !== "undefined" && "speechSynthesis" in window) {
      const utter = new SpeechSynthesisUtterance(last.content);
      utter.lang = language === "hi" ? "hi-IN" : "en-IN";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  function toggleListening() {
    if (typeof window === "undefined") return;
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setError(
        "Voice input isn't supported in this browser. Try Chrome, or type your message instead."
      );
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = language === "hi" ? "hi-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    const history = messages.map(({ role, content }) => ({ role, content }));
    const nextMessages: ChatEntry[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      if (data.language) setLanguage(data.language);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message, checklist: data.checklist },
      ]);
    } catch {
      setError("Couldn't reach the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#0c0e12] text-white ${
        largeText ? "text-lg" : "text-base"
      }`}
    >
      <header className="border-b border-white/10 px-4 py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/"
            className="text-xs uppercase tracking-wide text-amber-300/80 hover:text-amber-300 transition-colors"
          >
            ← Sugam
          </Link>
          <h1 className="font-semibold text-xl mt-0.5">Your UDID, Simplified</h1>
          <p className="text-sm text-white/60">
            A guide to applying for your (or your family member&apos;s) disability
            certificate — not a diagnosis, just a map through the process.
          </p>
        </div>
        <div className="flex gap-3 items-center text-sm text-white/80">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={voiceOut}
              onChange={(e) => setVoiceOut(e.target.checked)}
              className="accent-amber-400"
            />
            Read replies aloud
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={largeText}
              onChange={(e) => setLargeText(e.target.checked)}
              className="accent-amber-400"
            />
            Large text
          </label>
        </div>
      </header>

      <p className="text-xs text-white/50 px-4 py-2 border-b border-white/10 max-w-2xl w-full mx-auto text-center">
        This runs on a free AI tier, which means what you type here may be used by the
        provider to improve their models. Avoid including names or other identifying
        details you&apos;d rather not share.
      </p>

      <div
        role="log"
        aria-live="polite"
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 max-w-2xl w-full mx-auto"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-xl px-4 py-3 whitespace-pre-wrap ${
              m.role === "user"
                ? "self-end bg-amber-400 text-black"
                : "self-start bg-white/5 border border-white/10"
            }`}
          >
            {m.content}
            {m.checklist && (
              <div className="mt-3 border-t border-white/10 pt-3 text-sm">
                <p className="font-semibold">
                  Category matched: {m.checklist.category.name}
                </p>

                <div className="mt-3 rounded-lg border-2 border-amber-400/40 bg-amber-400/10 px-3 py-2">
                  <p className="font-semibold text-amber-300">
                    Specific to {m.checklist.category.name}
                  </p>
                  <ul className="list-disc list-inside">
                    {m.checklist.category.typical_additional_docs.map((d, idx) => (
                      <li key={idx}>{d}</li>
                    ))}
                  </ul>
                </div>

                <p className="mt-3 font-semibold">
                  Steps — the same for every category, since it&apos;s one government process
                </p>
                <ol className="list-decimal list-inside">
                  {m.checklist.process.steps.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ol>
                <p className="mt-2 font-semibold">General documents — needed for any category</p>
                <ul className="list-disc list-inside">
                  {m.checklist.process.typical_documents.map((d, idx) => (
                    <li key={idx}>{d}</li>
                  ))}
                </ul>
                <p className="mt-2 italic text-white/60">{m.checklist.disclaimer}</p>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="self-start rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white/60">
            Thinking…
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="self-start rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-300"
          >
            {error}
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <form
        className="border-t border-white/10 p-4 flex gap-2 max-w-2xl w-full mx-auto"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <button
          type="button"
          onClick={toggleListening}
          aria-pressed={listening}
          aria-label={listening ? "Stop voice input" : "Start voice input"}
          className={`rounded-full w-11 h-11 flex items-center justify-center border ${
            listening ? "bg-red-600 text-white border-red-600" : "border-white/20 text-white/80"
          }`}
        >
          🎤
        </button>
        <label htmlFor="chat-input" className="sr-only">
          Describe the condition or disability
        </label>
        <input
          id="chat-input"
          className="flex-1 rounded-full border border-white/20 bg-white/5 text-white placeholder-white/40 px-4 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            language === "hi"
              ? "यहाँ टाइप करें या माइक्रोफ़ोन का उपयोग करें…"
              : "Type here, or use the microphone…"
          }
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-full px-5 py-2 bg-amber-400 text-black font-semibold disabled:opacity-40 hover:bg-amber-300 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Standard middlewares
app.use(express.json());

// Helper function to validate the structure of the Google Gemini API key
function validateGeminiApiKey(apiKey: string | undefined): void {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "GEMINI_API_KEY is missing or undefined in your workspace environment variables. " +
      "A valid Google Gemini API key is required to power the server-side NEXA prompt optimization engine. " +
      "Please open the Settings/Secrets panel in the AI Studio sidebar, add an entry with key 'GEMINI_API_KEY', " +
      "and provide a valid API key retrieved from Google AI Studio (https://aistudio.google.com/)."
    );
  }

  const trimmedKey = apiKey.trim();

  // Check for common sample placeholding phrases
  const placeholders = ["your_gemini_api_key", "your_api_key", "placeholder", "todo", "insert_here", "abc"];
  if (placeholders.some(p => trimmedKey.toLowerCase() === p || trimmedKey.toLowerCase().includes(p))) {
    throw new Error(
      `GEMINI_API_KEY appears to contain an invalid placeholder value ("${trimmedKey}"). ` +
      "You must supply a genuine, active API key from Google AI Studio (https://aistudio.google.com/) " +
      "for NEXA to run generative prompt compilations."
    );
  }

  // Google AI Studio API keys typically start with the 'AIzaSy' prefix indicating a Google developer key
  if (!trimmedKey.startsWith("AIzaSy")) {
    throw new Error(
      `GEMINI_API_KEY ("${trimmedKey.substring(0, Math.min(6, trimmedKey.length))}...") is structurally invalid. ` +
      "Standard credentials issued by Google AI Studio must begin with the standard prefix 'AIzaSy'. " +
      "Please copy the full key sequence from your Google AI Studio dashboard and paste it into project Secrets."
    );
  }

  // Standard keys have a specific character count range (normally 39 characters)
  if (trimmedKey.length < 35 || trimmedKey.length > 50) {
    throw new Error(
      `GEMINI_API_KEY is structurally invalid (measured length: ${trimmedKey.length}). ` +
      "Standard Google API keys are expected to be approximately 39 characters long. " +
      "Please re-examine the key in Secrets to confirm that no extra words, trailing spaces, or headers were included."
    );
  }
}

// Lazy initialized Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    validateGeminiApiKey(apiKey);
    aiClient = new GoogleGenAI({
      apiKey: apiKey!.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// ----------------------------------------------------
// ANONYMOUS USER FEEDBACK LOGS (In-Memory Repository)
// ----------------------------------------------------
interface FeedbackEntry {
  id: string;
  rating: "up" | "down";
  comment: string;
  domain: string;
  targetAI: string;
  timestamp: string;
}
const feedbackDatabase: FeedbackEntry[] = [];

// Record feedback anonymously (Strictly no prompts or PIIs recorded)
app.post("/api/feedback", (req: any, res: any) => {
  const { rating, comment, domain, targetAI } = req.body;
  if (!rating || (rating !== "up" && rating !== "down")) {
    return res.status(400).json({ error: "invalid_rating", message: "Rating must be 'up' or 'down'." });
  }

  const newFeedback: FeedbackEntry = {
    id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    rating,
    comment: comment?.trim().substring(0, 500) || "", // Trim and cap text
    domain: domain || "General",
    targetAI: targetAI || "Unknown",
    timestamp: new Date().toISOString()
  };

  // Capped FIFO array structure
  feedbackDatabase.unshift(newFeedback);
  if (feedbackDatabase.length > 50) {
    feedbackDatabase.pop();
  }

  console.info(`[NEXA Feedback Collected Anonymously] Rating: ${rating} | Domain: ${domain} | Target: ${targetAI}`);
  res.json({ success: true, count: feedbackDatabase.length });
});

// Public feedback directory for diagnostic viewer
app.get("/api/feedback", (req: any, res: any) => {
  res.json({ feedbacks: feedbackDatabase });
});


// ----------------------------------------------------
// PROMPT OPTIMIZER LOGIC (PROTECTED)
// ----------------------------------------------------

const SYSTEM_INSTRUCTION = `You are NEXA, the world's most senior AI Prompt Engineer Agent.
Your primary directive is to transform crude, ambiguous, chaotic, or plain user requests into highly-structured, production-ready system instructions.

You strictly apply the 4-D Prompt Engineering Methodology with an ADVANCED DIAGNOSTICS scope:
1. DECONSTRUCT: Unpack objectives, target parameters, vocabulary limitations, and output contexts.
2. DIAGNOSE (Advanced Scope): Deeply audit the rough instruction to expose, neutralize, and resolve key vulnerabilities:
   - Security Edge-Cases (Vulnerability Risks):
     * For Code Generation Prompts: Actively audit for missing input validation patterns, potential injection vulnerabilities (e.g., SQL injection, Command injection, Cross-Site Scripting [XSS], unauthenticated endpoints, arbitrary script run environments), or unhandled/swallowed error states and lack of defensive fallback guards.
     * For Data-Related & API Prompts: Deeply check for potential Data Leakage Risks, including credential exposures, credentials-in-transit, lack of authorization rules, unmasked Personally Identifiable Information (PII) data leakages, missing access controls, or insecure session cache exposures.
   - Implicit Constraints (Implicit Needs): Reveal hidden dependencies. For technical tasks, notice omissions in retry/backoff constraints, connection pools, or query limit boundaries. For marketing/creative prompts, note missing details about customer demographics, targeted distribution channels, length limits, or anti-spam rules.
   - Semantic Ambiguities (Vague Directives): Detect passive voice expressions (e.g., "results are written," "it should be fast," "make it catchy") and rewrite into clear, active-voice, imperative directives (e.g., "Enforce strict runtime parsing checks," "Engage with conversion psych metrics immediately," "Verify incoming buffer length boundaries").
3. DEVELOP: Employ domain-specific strategic templates and prompt methodologies to structure the outcome.
4. DELIVER: Output a complete, modular, copy-ready prompt block, diagnostic key improvements, techniques list, and actionable pro-tips.

--------------------------------------------------------------------------------
OUTPUT REQUIREMENTS FOR ADVANCED DIAGNOSIS DIAGRAMMING:
To display the deep value of the NEXA prompt engine, you MUST construct the following fields:
- "improvements": Must list 3-5 distinct, targeted improvements identifying precisely what was diagnosed.
  - For coding prompts: You MUST include at least one diagnostic starting with "DIAGNOSTIC (Security/Edge-case)" focusing directly on input validation, injection vulnerability guards, or unhandled/swallowed error states, and one starting with "DIAGNOSTIC (Implicit Constraint)" focusing on resilient/robust patterns or connection pooling limits.
  - For data-related/API prompts: You MUST include at least one diagnostic starting with "DIAGNOSTIC (Data-Leakage-Risk)" focusing on credential masking, PII protection, or unauthorized transport/access controls.
  - For copy/marketing: You MUST include at least one starting with "DIAGNOSTIC (Semantic Ambiguity)" focusing on rewriting passive descriptions or non-committal voice into persuasive action hooks, and one starting with "DIAGNOSTIC (Implicit Constraint)" targeting target demographic and conversion guidelines.
- "techniquesApplied": Detail the exact prompt-engineering names of the mitigations deployed (e.g., "Defensive Input Validation Guard", "Anti-SQL-Injection Parameterization Spec", "PII-Masking & Tokenization Directives", "Anti-Data-Leakage Isolation Boundaries", "Linguistic Active-Voice Imperatives", "XML-Tagged Environment Contextualization", "AIDA Conversion Framework Routing", "Role-Based Persona Synthesizer").
--------------------------------------------------------------------------------
DOMAIN-SPECIFIC OPTIMIZATION STRATEGIES & TEMPLATES:
Depending on the user's selected domain, you must leverage these custom templates and system philosophies:

- "Marketing" (Digital Marketing & Sales Copy):
  - Focus: Conversion psychological formulas like AIDA (Attention, Interest, Desire, Action) or PAS (Problem, Agitation, Solution).
  - Strategy: Enforce explicit tone metrics (e.g., 'persuasive yet authentic'), customer demographic definitions, strict word counts, visual pacing, call-to-action anchors, and multi-headed subject testing blocks.
  - Case Example: If marketing a 'marketing email', do not just write headers. Format it with [AIDA Sections], clear Subject Line blocks with 3 hooks, detailed sender tone, and strict anti-spam vocabulary rules (e.g. no 'guarantee', no exclamation overload).

- "Software Development" (formerly Technical; Software Engineering & DB Workflows):
  - Focus: Resilient logic, separation of concerns, DRY and SOLID principles, and clean syntax structures.
  - Strategy: Specify type bindings, error tolerance retry bounds, asynchronous state management models, data layout schemas, logical constraints, and strict input/output formats. Ensure all code blocks are wrapped in appropriate context boundaries.

- "Creative Writing" (formerly Creative; Storytelling & Copy):
  - Focus: Atmospheric resonance, character arcs, visual sensory pacing, and linguistic style standards.
  - Strategy: Detail emotional trajectory rules, dialogue voice parameters (avoiding overly descriptive speech tags), pacing markers, and sensory palettes while prohibiting predictable plot resolutions.

- "Educational" (Teacher Curriculum & Analogy Design):
  - Focus: Cognitive hierarchy, scaffolding, Socratic reinforcement, and multi-tier analogies.
  - Strategy: Formulate clear educational milestones, interactive self-check points, level-appropriate simplified analogies, and active recall checks.

- "Business" (Business Insights & Executive Presentations):
  - Focus: Operational alignment, professional jargon constraints, KPI metric models, and table layouts.
  - Strategy: Enforce executive summaries, tabular data presentation matrices, risk evaluation factors, logical constraints, and actionable strategic takeaways.
--------------------------------------------------------------------------------

Your output must ALWAYS be parsed as a strictly valid JSON object conforming exactly to this schema. Do not write any markdown codeblock backticks, explanations, or text outside of the raw JSON object structure.

JSON Response Schema:
{
  "modeUsed": "BASIC" | "DETAIL",
  "optimizedPrompt": string | null, // The copy-ready optimized markdown prompt using DOMAIN TEMPLATES. Null ONLY when returning clarifyingQuestions.
  "improvements": string[] | null,  // 3-5 key improvements identifying implicit constraints, ambiguities, and technical diagnostic updates. Null ONLY when returning clarifyingQuestions.
  "techniquesApplied": string[] | null, // Detailed engineering terms used (e.g., "PAS Copy Framework", "Type safety bounds", "AIDA Conversion Matrix"). Null ONLY when returning clarifyingQuestions.
  "proTip": string | null, // An expert diagnostic tip targeting edge case behavior. Null ONLY when returning clarifyingQuestions.
  "clarifyingQuestions": [ // Custom questions for chosen domain. Null ONLY if optimizedPrompt is returned!
    { "id": "q1", "question": "Question text?", "defaultAnswer": "Default suggested answer" }
  ] | null
}`;

// AI Optimize Entrypoint (Evaluates mode and decides whether to produce Questions or generate Prompt)
app.post("/api/optimize", async (req: any, res: any) => {
  const { targetAI, modePreference, domain, roughRequest } = req.body;

  if (!roughRequest || !roughRequest.trim()) {
    return res.status(400).json({ error: "missing_content", message: "Rough request textarea cannot be empty." });
  }

  // Auto-detect complexity
  let selectedMode = modePreference;
  if (!modePreference || modePreference === "Auto") {
    const isComplex = 
      roughRequest.length > 120 || 
      /\b(architecture|system|react|production|marketing|pipeline|database|api|strategy|analytics|deploy|scientific|financial|academic)\b/i.test(roughRequest) ||
      /[\d\-\*]\s/.test(roughRequest); // has lists or bullets
    selectedMode = isComplex ? "DETAIL" : "BASIC";
  }

  try {
    const client = getGeminiClient();
    
    // Build context payload
    const userPromptText = `Optimize this prompt based on NEXA instructions:
Target AI: ${targetAI || "ChatGPT"}
Domain Subject: ${domain || "General"}
Requested Mode: ${selectedMode}
Rough Request Content: "${roughRequest}"

If Mode is DETAIL, evaluate if we can ask 2-3 custom clarifying questions with smart defaults. Ensure questions are highly custom-themed (e.g. if request is about a python API, questions should ask about libraries, endpoints, database types rather than generic templates).`;

    const result = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPromptText,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.2,
      }
    });

    const textOutput = result.text;
    if (!textOutput || !textOutput.trim()) {
      console.error("[NEXA DEBUG - API EMPTY] The model content output returned blank or was safety blocked.");
      throw new Error("EMPTY_GEMINI_OUTPUT: The generative model completed successfully but returned blank content. This may indicate a temporary backend glitch or safety-driven truncation.");
    }

    // Scrub out potential Markdown code fence packaging
    let cleanedOutput = textOutput.trim();
    if (cleanedOutput.startsWith("```")) {
      cleanedOutput = cleanedOutput.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
    cleanedOutput = cleanedOutput.trim();

    try {
      const parsedData = JSON.parse(cleanedOutput);
      res.json(parsedData);
    } catch (parseError: any) {
      console.error("[NEXA DEBUG - JSON PARSE FAIL] Failed to convert Gemini payload to valid JSON.");
      console.error("[NEXA DEBUG - Raw Text output captured]:", textOutput);
      console.error("[NEXA DEBUG - Error message]:", parseError?.message);

      res.status(500).json({ 
        error: "parse_failed", 
        message: `Structured output synthesis failed to parse. Cleaned payload length: ${cleanedOutput.length} characters. Reason: ${parseError?.message || "Invalid JSON schema structure"}. Please submit a slightly revised prompt.`,
        rawText: textOutput,
        parseError: parseError?.message
      });
    }

  } catch (err: any) {
    console.error("[NEXA DEBUG - EXCEPTION ACCUMULATOR] Prompt optimization route failed executing.");
    console.error("[NEXA DEBUG - Context Params]:", { targetAI, modePreference, domain, roughRequestLength: roughRequest?.length });
    console.error("[NEXA DEBUG - Stack/Exception Details]:", err);

    let errorType = "api_failed";
    let friendlyMessage = "Failed to run NEXA prompt optimization. Please test again.";

    const errMsg = err.message || "";
    if (errMsg.includes("GEMINI_API_KEY")) {
      errorType = "missing_api_key";
      friendlyMessage = "Configuration gap identified: The GEMINI_API_KEY environment variable is blank or not injected. Please supply a valid key inside Secrets/Settings.";
    } else if (errMsg.includes("API_KEY_INVALID") || errMsg.includes("not valid") || errMsg.includes("invalid-api-key") || errMsg.includes("403")) {
      errorType = "invalid_api_key";
      friendlyMessage = "Authentication failure: The provided GEMINI_API_KEY was rejected as invalid by Google AI Studio. Please verify the active credentials.";
    } else if (errMsg.includes("quota") || errMsg.includes("429") || errMsg.includes("LimitExceeded") || errMsg.includes("exhausted") || errMsg.includes("overloaded")) {
      errorType = "rate_limited";
      friendlyMessage = "High service traffic: Gemini API is overloaded or rate limit quota has been temporarily exceeded (HTTP 429). Please wait 10 seconds and submit again.";
    } else if (errMsg.includes("safety") || errMsg.includes("blocked") || errMsg.includes("candidate was blocked")) {
      errorType = "content_blocked";
      friendlyMessage = "Security / Safety guard filter: The target query or prompt layout triggered safety classifiers and was blocked. Please adjust the phrasing (such as avoiding sensitive/offensive mock words) and try again.";
    } else if (errMsg.includes("EMPTY_GEMINI_OUTPUT")) {
      errorType = "empty_output";
      friendlyMessage = "Response synthesis anomaly: Gemini returned successfully but the text content block was empty. Please check the model status and retry.";
    } else {
      friendlyMessage = `NEXA Engine API error: ${err.message || "An unexpected error occurred during generative execution."}`;
    }

    res.status(500).json({ error: errorType, message: friendlyMessage });
  }
});

// AI Optimize Answers (Used to evaluate responses to clarifying questions and generate final Detail prompt)
app.post("/api/optimize/answers", async (req: any, res: any) => {
  const { targetAI, domain, roughRequest, answers } = req.body;

  if (!roughRequest || !roughRequest.trim()) {
    return res.status(400).json({ error: "missing_content", message: "Rough request cannot be empty." });
  }

  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: "missing_answers", message: "Answers array is missing or invalid." });
  }

  try {
    const client = getGeminiClient();

    // Compile clarification context string
    const answersString = answers.map((item: any) => `Question: ${item.question}\nAnswer: ${item.answer}`).join("\n\n");

    const userPromptText = `We are returning the clarifying question responses for a DETAIL-mode NEXA prompt optimization.

Original Request:
"${roughRequest}"

Target AI Platform: ${targetAI || "ChatGPT"}
Domain Focus: ${domain || "General"}

Clarified Answers Provided:
${answersString}

Please synthesize the absolute ultimate tailored optimized prompt incorporating all these details perfectly. Since answers are supplied, you MUST return the final optimized prompt! Return clarifyingQuestions as null. Provide rich improvements list, techniquesApplied, and an expert proTip.`;

    const result = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPromptText,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    const textOutput = result.text;
    if (!textOutput || !textOutput.trim()) {
      console.error("[NEXA DEBUG - API EMPTY] Answers compilation generated blank response or was blocked.");
      throw new Error("EMPTY_GEMINI_OUTPUT: Answers synthesize generated blank response. This may indicate safety blocks or connection resets.");
    }

    // Scrub out potential Markdown code fence packaging
    let cleanedOutput = textOutput.trim();
    if (cleanedOutput.startsWith("```")) {
      cleanedOutput = cleanedOutput.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
    cleanedOutput = cleanedOutput.trim();

    try {
      const parsedData = JSON.parse(cleanedOutput);
      res.json(parsedData);
    } catch (parseError: any) {
      console.error("[NEXA DEBUG - JSON PARSE FAIL] Answers merge parse error raw text:", textOutput);
      console.error("[NEXA DEBUG - Parse error details]:", parseError?.message);

      res.status(500).json({ 
        error: "parse_failed", 
        message: `Structured output merge synthesis failed to parse. Cleaned payload length: ${cleanedOutput.length} characters. Reason: ${parseError?.message || "Invalid JSON schema"}. Please retry submitting your answers.`,
        rawText: textOutput,
        parseError: parseError?.message
      });
    }

  } catch (err: any) {
    console.error("[NEXA DEBUG - EXCEPTION ACCUMULATOR] Answers synthesis error details captured.");
    console.error("[NEXA DEBUG - Context Params]:", { targetAI, domain, roughRequestLength: roughRequest?.length });
    console.error("[NEXA DEBUG - Stack/Exception Details]:", err);

    let errorType = "api_failed";
    let friendlyMessage = "Failed to synthesize answered prompt.";

    const errMsg = err.message || "";
    if (errMsg.includes("GEMINI_API_KEY")) {
      errorType = "missing_api_key";
      friendlyMessage = "Configuration gap identified: The GEMINI_API_KEY environment variable is blank. Please configure a valid key inside Secrets/Settings.";
    } else if (errMsg.includes("API_KEY_INVALID") || errMsg.includes("invalid") || errMsg.includes("invalid-api-key") || errMsg.includes("403")) {
      errorType = "invalid_api_key";
      friendlyMessage = "Authentication failure: The GEMINI_API_KEY was rejected by Google AI Studio. Please verify key credentials in Settings.";
    } else if (errMsg.includes("quota") || errMsg.includes("429") || errMsg.includes("exhausted")) {
      errorType = "rate_limited";
      friendlyMessage = "Traffic Limit Exceeded: The Google AI Studio service reported quota exhaustions (HTTP 429). Please wait a few moments and resubmit.";
    } else if (errMsg.includes("safety") || errMsg.includes("blocked")) {
      errorType = "content_blocked";
      friendlyMessage = "Security flag alert: One of the written answers was flagged by Gemini content security filters. Please audit your terms and resubmit.";
    } else if (errMsg.includes("EMPTY_GEMINI_OUTPUT")) {
      errorType = "empty_output";
      friendlyMessage = "Synthesis returned empty response: The AI completed successfully but yielded blank output text. Please retry.";
    } else {
      friendlyMessage = `Synthesis execute error: ${err.message || "An unexpected error occurred during answers synthesis."}`;
    }

    res.status(500).json({ error: errorType, message: friendlyMessage });
  }
});


// ----------------------------------------------------
// VITE CLIENT INTEGRATION
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.info("Vite development middleware mounted successfully.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: any, res: any) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.info("Production static server enabled.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NEXA Prompt Agent is listening on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Critical server boot error: ", error);
});

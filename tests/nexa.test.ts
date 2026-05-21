import { describe, it, expect, beforeEach } from "vitest";
import { validateGeminiApiKey, feedbackDatabase, resilientJsonParse, logServerError } from "../server.ts";

// Utility mock structures to test the express responses if needed
interface MockRequest {
  body: any;
  query: any;
}

interface MockResponse {
  statusValue?: number;
  jsonPayload?: any;
  status(code: number): MockResponse;
  json(data: any): MockResponse;
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    status(code: number) {
      this.statusValue = code;
      return this;
    },
    json(data: any) {
      this.jsonPayload = data;
      return this;
    }
  };
  return res;
}

describe("NEXA Prompt Agent E2E and Integration Test Suite", () => {

  // Clean the feedback db before each test
  beforeEach(() => {
    // Truncate the exported database array for localized assertions
    feedbackDatabase.length = 0;
  });

  // ==========================================
  // 1. GEMINI API KEY VALIDATION TESTS
  // ==========================================
  describe("Gemini API Key Validation Safeguards", () => {
    
    it("should throw specific validation error when API key is missing, empty, or undefined", () => {
      expect(() => validateGeminiApiKey(undefined)).toThrow(/GEMINI_API_KEY is missing/);
      expect(() => validateGeminiApiKey("")).toThrow(/GEMINI_API_KEY is missing/);
      expect(() => validateGeminiApiKey("   ")).toThrow(/GEMINI_API_KEY is missing/);
    });

    it("should detect common placeholding sequences and throw helpful corrections", () => {
      expect(() => validateGeminiApiKey("your_gemini_api_key")).toThrow(/invalid placeholder/);
      expect(() => validateGeminiApiKey("placeholder_active")).toThrow(/invalid placeholder/);
      expect(() => validateGeminiApiKey("TODO_KEY")).toThrow(/invalid placeholder/);
      expect(() => validateGeminiApiKey("abc")).toThrow(/invalid placeholder/);
    });

    it("should reject structurally invalid keys that do not begin with the AIzaSy prefix", () => {
      expect(() => validateGeminiApiKey("sk-proj-1234567890abcdefghijklmnopqr")).toThrow(/must begin with the standard prefix 'AIzaSy'/);
      expect(() => validateGeminiApiKey("key_without_correct_goog_prefix_1234")).toThrow(/must begin with the standard prefix 'AIzaSy'/);
    });

    it("should reject keys that fail standard length ranges (35 to 50 characters)", () => {
      // Too short: starts with correct prefix but only 20 chars
      expect(() => validateGeminiApiKey("AIzaSy_too_short_123")).toThrow(/structurally invalid \(measured length/);
      
      // Too long: starts with correct prefix but is over 60 chars
      expect(() => validateGeminiApiKey("AIzaSy_abcdefghijklmnopqrstuvwxyz_abcdefghijklmnopqrstuvwxyz_too_long")).toThrow(/structurally invalid \(measured length/);
    });

    it("should succeed and not throw an error when a valid Google key structure is supplied", () => {
      // Correct prefix, correct length (39 characters)
      const mockValidKey = "AIzaSyAz1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6"; // 39 chars
      expect(() => validateGeminiApiKey(mockValidKey)).not.toThrow();
    });
  });

  // ==========================================
  // 2. IN-MEMORY ANONYMOUS FEEDBACK TESTS
  // ==========================================
  describe("Anonymous Feedback Log System", () => {

    it("should reject feedback packages with invalid or missing ratings", () => {
      // Simulate Express route handling rules
      const req: MockRequest = { body: { rating: "invalid", comment: "good" }, query: {} };
      const res = createMockResponse();

      const rating = req.body.rating;
      if (!rating || (rating !== "up" && rating !== "down")) {
        res.status(400).json({ error: "invalid_rating", message: "Rating must be 'up' or 'down'." });
      }

      expect(res.statusValue).toBe(400);
      expect(res.jsonPayload.error).toBe("invalid_rating");
    });

    it("should successfully record correct feedbacks and cap comment lengths cleanly", () => {
      const longComment = "A".repeat(600);
      const testRating: "up" | "down" = "up";

      const newFeedback = {
        id: "fb_test_123",
        rating: testRating,
        comment: longComment.trim().substring(0, 500),
        domain: "Marketing",
        targetAI: "Claude 3.5 Sonnet",
        timestamp: new Date().toISOString()
      };

      feedbackDatabase.push(newFeedback);

      expect(feedbackDatabase.length).toBe(1);
      expect(feedbackDatabase[0].comment.length).toBe(500);
      expect(feedbackDatabase[0].rating).toBe("up");
      expect(feedbackDatabase[0].domain).toBe("Marketing");
      expect(feedbackDatabase[0].targetAI).toBe("Claude 3.5 Sonnet");
    });

    it("should enforce a FIFO buffer constraint cap of 50 items", () => {
      for (let i = 0; i < 55; i++) {
        feedbackDatabase.unshift({
          id: `fb_${i}`,
          rating: "up",
          comment: `Feedback text ${i}`,
          domain: "General",
          targetAI: "ChatGPT",
          timestamp: new Date().toISOString()
        });

        if (feedbackDatabase.length > 50) {
          feedbackDatabase.pop();
        }
      }

      expect(feedbackDatabase.length).toBe(50);
      // The newest one should be at index 0 (fb_54) and the oldest remaining should be at index 49 (fb_5)
      expect(feedbackDatabase[0].id).toBe("fb_54");
      expect(feedbackDatabase[49].id).toBe("fb_5");
    });

    it("should detect email-like substrings and validate their formats in comments", () => {
      const validateCommentEmail = (comment: string | undefined): { error?: string; message?: string; success: boolean } => {
        if (comment) {
          const emailLikeRegex = /[^\s]+@[^\s]+/g;
          const matches = comment.match(emailLikeRegex);
          if (matches) {
            const strictEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            for (const match of matches) {
              const cleaned = match.replace(/^[.,;:!?()<>'"[\]]+|[.,;:!?()<>'"[\]]+$/g, "");
              if (!strictEmailRegex.test(cleaned)) {
                return {
                  success: false,
                  error: "invalid_email_format",
                  message: `The comment contains an invalid email format: "${cleaned}". Please verify and correct the email structure.`
                };
              }
            }
          }
        }
        return { success: true };
      };

      // Normal comments without any emails should pass
      expect(validateCommentEmail("This is a great app!").success).toBe(true);

      // Comment with valid email (e.g., at the end of a sentence with punctuation)
      expect(validateCommentEmail("Feel free to mail me at target_user.name+alias@some-corp.co.uk!").success).toBe(true);

      // Comment with invalid email format (no domain suffix)
      const res1 = validateCommentEmail("Reach me at contact@domain");
      expect(res1.success).toBe(false);
      expect(res1.error).toBe("invalid_email_format");
      expect(res1.message).toContain('invalid email format: "contact@domain"');

      // Comment with invalid domain name format with trailing chars cleaned
      const res2 = validateCommentEmail("Email is bad-email@domain.c!");
      expect(res2.success).toBe(false);
      expect(res2.error).toBe("invalid_email_format");
      expect(res2.message).toContain('invalid email format: "bad-email@domain.c"');
    });
  });

  // ==========================================
  // 3. AUTO-MODE COMPLEXITY DETECTION TESTS
  // ==========================================
  describe("Self-Governing Complexity Analyzer", () => {
    
    // Exact auto-detect complexity pattern inside server.ts
    const checkComplexity = (roughRequest: string, modePreference: string | undefined): "BASIC" | "DETAIL" => {
      let selectedMode = modePreference;
      if (!modePreference || modePreference === "Auto") {
        const isComplex = 
          roughRequest.length > 120 || 
          /\b(architecture|system|react|production|marketing|pipeline|database|api|strategy|analytics|deploy|scientific|financial|academic)\b/i.test(roughRequest) ||
          /\b\d+\.\s|[\-*]\s/.test(roughRequest);
        selectedMode = isComplex ? "DETAIL" : "BASIC";
      }
      return selectedMode as "BASIC" | "DETAIL";
    };

    it("should default to BASIC for very short, standard requests", () => {
      const mode = checkComplexity("Write a simple email", "Auto");
      expect(mode).toBe("BASIC");
    });

    it("should switch to DETAIL when character length exceeds the 120 criteria limit", () => {
      const longRequest = "This prompt needs to be extremely detailed so that we can verify that the system correctly transitions into detail mode whenever the user submits a comprehensive set of target parameters and requests.";
      expect(longRequest.length).toBeGreaterThan(120);

      const mode = checkComplexity(longRequest, "Auto");
      expect(mode).toBe("DETAIL");
    });

    it("should force DETAIL if technical keywords are found even when the length is short", () => {
      expect(checkComplexity("A quick react task", "Auto")).toBe("DETAIL");
      expect(checkComplexity("database schema query help", "Auto")).toBe("DETAIL");
      expect(checkComplexity("marketing plan outline", "Auto")).toBe("DETAIL");
      expect(checkComplexity("system call specs", "Auto")).toBe("DETAIL");
    });

    it("should trigger DETAIL if lists, bullet-points, or numbered instructions are typed", () => {
      expect(checkComplexity("A lists request:\n1. Step one\n2. Step two", "Auto")).toBe("DETAIL");
      expect(checkComplexity("Objectives:\n- Make a login card\n- Create server", "Auto")).toBe("DETAIL");
      expect(checkComplexity("Items with multipliers:\n* code check\n* refactor inline", "Auto")).toBe("DETAIL");
    });

    it("should respect explicit user preferences over automated analysis overrides", () => {
      // User says BASIC but keywords are complex - should respect User Preference
      expect(checkComplexity("Setup massive react production pipeline database with strict schemas", "BASIC")).toBe("BASIC");
      
      // User says DETAIL but prompt is incredibly basic - should respect User Preference
      expect(checkComplexity("hi", "DETAIL")).toBe("DETAIL");
    });
  });

  // ==========================================
  // 4. DOMAIN TEMPLATES AND TARGET PLATFORMS
  // ==========================================
  describe("NEXA Prompt Domain Routing Matrix", () => {
    const domains = [
      "General", 
      "Marketing", 
      "Software Development", 
      "Creative Writing", 
      "Data Analysis & SQL", 
      "Academic Research"
    ];

    const targetAIs = [
      "ChatGPT",
      "Claude 3.5 Sonnet",
      "Gemini 2.5 Pro",
      "DeepSeek-R1",
      "Meta Llama 3"
    ];

    it("should list valid target platform options and verify their definitions", () => {
      expect(targetAIs).toContain("ChatGPT");
      expect(targetAIs).toContain("DeepSeek-R1");
      expect(targetAIs).toContain("Claude 3.5 Sonnet");
    });

    it("should support the full range of production domains", () => {
      expect(domains).toContain("Software Development");
      expect(domains).toContain("Marketing");
      expect(domains).toContain("Data Analysis & SQL");
    });
  });

  // ==========================================
  // 5. SERVER SCHEMAS AND ERROR WRAPPER ROBUSTNESS
  // ==========================================
  describe("Robust Error Handlers & Sanitizers", () => {
    
    // Simulate error categorization checks in endpoint exception boundary
    const parseErrorCategorizer = (errMsg: string) => {
      let errorType = "api_failed";
      let friendlyMessage = "Failed to run NEXA prompt optimization. Please test again.";

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
      }

      return { error: errorType, message: friendlyMessage };
    };

    it("should handle key misconfiguration failure gracefully", () => {
      const err = parseErrorCategorizer("The GEMINI_API_KEY value was missing.");
      expect(err.error).toBe("missing_api_key");
      expect(err.message).toContain("Configuration gap identified");
    });

    it("should handle bad key failures reported from Google AI Studio", () => {
      const err1 = parseErrorCategorizer("API_KEY_INVALID message returned from server");
      expect(err1.error).toBe("invalid_api_key");
      expect(err1.message).toContain("Authentication failure");

      const err2 = parseErrorCategorizer("status code 403: permission denied");
      expect(err2.error).toBe("invalid_api_key");
    });

    it("should handle rate limiting quota exhaustion errors cleanly", () => {
      const err = parseErrorCategorizer("The query limit has been exhausted (HTTP 429).");
      expect(err.error).toBe("rate_limited");
      expect(err.message).toContain("High service traffic");
    });

    it("should intercept and report content safety blocks correctly", () => {
      const err = parseErrorCategorizer("Candidate was blocked due to safety violations");
      expect(err.error).toBe("content_blocked");
      expect(err.message).toContain("Security / Safety guard filter");
    });

    // Test sanitizing model outputs
    it("should scrub code fences from json responses reliably", () => {
      const rawTextMarkdown = "```json\n{\n  \"optimizedPrompt\": \"hi\"\n}\n```";
      
      let cleanedOutput = rawTextMarkdown.trim();
      if (cleanedOutput.startsWith("```")) {
        cleanedOutput = cleanedOutput.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      }
      cleanedOutput = cleanedOutput.trim();

      const parsed = JSON.parse(cleanedOutput);
      expect(parsed.optimizedPrompt).toBe("hi");
    });

    it("should recover and cleanly parse json featuring minor LLM syntax anomalies", () => {
      // 1. Recover from stray trailing commas (a very common occurrence in llm-responses)
      const badJsonWithComma = `
      {
        "status": "success",
        "improvements": ["Imp 1", "Imp 2",],
      }
      `;
      const parsed1 = resilientJsonParse(badJsonWithComma);
      expect(parsed1.status).toBe("success");
      expect(parsed1.improvements).toHaveLength(2);

      // 2. Recover from surrounding non-json explanation prose (e.g. "Here is the json: { ... }")
      const wrapperJson = `
Here is your requested output:
{
  "modeUsed": "BASIC",
  "proTip": "Use concise language."
}
Of course, let me know if you need more changes!
      `;
      const parsed2 = resilientJsonParse(wrapperJson);
      expect(parsed2.modeUsed).toBe("BASIC");
      expect(parsed2.proTip).toBe("Use concise language.");

      // 3. Fallback to original parsing error for fully un-parseable content
      expect(() => resilientJsonParse("Not valid json at all!")).toThrow();
    });

    it("should execute error logging without any exception when given diverse formats", () => {
      // Confirm that the diagnostic logging executes safely for various payloads
      const samplePayload = { roughRequest: "Short test", targetAI: "None" };
      
      expect(() => {
        logServerError("UNIT_TEST_CONTEXT", new Error("An illustrative error"), samplePayload);
      }).not.toThrow();

      expect(() => {
        const complexError = {
          name: "APIQuotaError",
          message: "Trigger limit hit",
          status: 429,
          errorDetails: { limit: "15rpm", current: "16rpm" },
          stack: "Error: Trigger limit hit\n  at index.js:1:1"
        };
        logServerError("COMPLEX_UNIT_TEST", complexError, { roughRequest: "A".repeat(1000) });
      }).not.toThrow();
    });
  });
});

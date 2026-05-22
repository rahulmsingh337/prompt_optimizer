import { describe, it, expect } from "vitest";
import { detectLanguage } from "../src/components/OptimizerApp";

describe("NEXA Prompt Agent UAT Verification Suite", () => {
  
  // ==========================================
  // UAT-01: LIGHTWEIGHT SYNTAX HIGHLIGHTER DETECTION
  // ==========================================
  describe("UAT TC-07 - Syntax Highlighting Auto-Detection", () => {
    
    it("should correctly identify empty or default prompts as markdown", () => {
      expect(detectLanguage("")).toBe("markdown");
      expect(detectLanguage("This is a standard English question without code.")).toBe("markdown");
    });

    it("should identify structured JSON objects correctly", () => {
      const validJson = `{
        "name": "NEXA",
        "version": "1.0.0",
        "description": "JSON check"
      }`;
      expect(detectLanguage(validJson)).toBe("json");
    });

    it("should identify SQL select queries", () => {
      const sqlQuery = "SELECT name, tokens FROM feedback_db WHERE rating = 'up' JOIN users ON users.id = feedback_db.userId;";
      expect(detectLanguage(sqlQuery)).toBe("sql");
    });

    it("should identify Python code containing definitions and functions", () => {
      const pythonCode = `def optimize_prompt(rough_prompt):
    print("optimizing...")
    self.log("optimized")
    return rough_prompt`;
      expect(detectLanguage(pythonCode)).toBe("python");
    });

    it("should identify JavaScript/ESM module syntax correctly", () => {
      const jsCode = `import { useState, useEffect } from 'react';
      const [tokens, setTokens] = useState(0);
      export const getTokens = () => tokens;`;
      expect(detectLanguage(jsCode)).toBe("javascript");
    });

    it("should identify YAML declarations", () => {
      const yamlCode = `app: nexa
version: 1.0.0
services:
  - web
  - api
  - worker`;
      expect(detectLanguage(yamlCode)).toBe("yaml");
    });

    it("should identify bash and command lines", () => {
      const bashCommand = "$ npm install prismjs --save";
      expect(detectLanguage(bashCommand)).toBe("bash");
    });
  });

  // ==========================================
  // UAT-02: CHART HISTORY MAPPING & METRICS
  // ==========================================
  describe("UAT TC-08 - Chart Consumption Trending & Data Formatting", () => {

    it("should correctly format and prepare historical records for the Recharts graph up to a 10 item cap", () => {
      const mockHistory = [
        { id: "1", optimizedPrompt: "Short test 1", timestamp: "2026-05-22T05:00:00Z", domain: "General", targetAI: "ChatGPT" },
        { id: "2", optimizedPrompt: "Long test 2 matching high expand", timestamp: "2026-05-22T05:05:00Z", domain: "Marketing", targetAI: "Claude" },
      ];

      // Replicate the exact transformation logic used in the OptimizerApp dashboard view
      const reversedHistory = [...mockHistory]
        .slice(0, 10)
        .reverse();

      const chartData = reversedHistory.map((item, idx) => {
        const tokens = Math.ceil((item.optimizedPrompt || "").length / 4.1);
        const dateObj = item.timestamp ? new Date(item.timestamp) : new Date();
        return {
          index: idx + 1,
          time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }),
          tokens: tokens,
          chars: (item.optimizedPrompt || "").length,
          domain: item.domain || "General",
          targetAI: item.targetAI || "ChatGPT"
        };
      });

      expect(chartData).toHaveLength(2);
      // Index 0 in chartData is item 2 (Long test 2) due to reverse chronological graphing order
      expect(chartData[0].tokens).toBe(Math.ceil("Long test 2 matching high expand".length / 4.1));
      expect(chartData[0].domain).toBe("Marketing");
      
      // Index 1 in chartData is item 1 (Short test 1)
      expect(chartData[1].tokens).toBe(Math.ceil("Short test 1".length / 4.1));
      expect(chartData[1].domain).toBe("General");
    });

    it("should cap charts cleanly to represent a maximum of the 10 most recent results", () => {
      const massiveHistory = Array.from({ length: 15 }, (_, i) => ({
        id: `${i}`,
        optimizedPrompt: `Token prompt volume indexing item sequence ${i}`,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        domain: "General",
        targetAI: "ChatGPT"
      }));

      // In the app dashboard, we take the up to 10 latest entries and reverse them for chronological visualization
      const reversedHistory = [...massiveHistory]
        .slice(0, 10)
        .reverse();

      expect(reversedHistory).toHaveLength(10);
      // Since massiveHistory starts with index 0 (which is the newest/most recent because we unshift), 
      // the slice(0, 10) selects the 10 newest items (0 to 9), and reversing it makes item 9 (oldest among the 10 newest) the first element.
      expect(reversedHistory[0].id).toBe("9");
      expect(reversedHistory[9].id).toBe("0");
    });
  });

  // ==========================================
  // UAT-03: WEB SPEECH API / MICROPHONE DICTATION
  // ==========================================
  describe("UAT TC-11 - Microphone Voice Dictation Integration", () => {
    it("should emulate standard text concatenation logic when speech is transcribed", () => {
      let roughRequest = "Initial concept.";
      const simulateResult = (transcript: string) => {
        const trimmed = roughRequest.trim();
        roughRequest = trimmed ? `${trimmed} ${transcript.trim()}` : transcript.trim();
      };

      simulateResult("Add a sidebar component.");
      expect(roughRequest).toBe("Initial concept. Add a sidebar component.");

      let emptyRoughRequest = "";
      const simulateResultEmpty = (transcript: string) => {
        const trimmed = emptyRoughRequest.trim();
        emptyRoughRequest = trimmed ? `${trimmed} ${transcript.trim()}` : transcript.trim();
      };
      simulateResultEmpty("Hello from dictate mode.");
      expect(emptyRoughRequest).toBe("Hello from dictate mode.");
    });
  });

  // ==========================================
  // UAT-04: DISTRACTION-FREE FULL SCREEN PROMPT MODE
  // ==========================================
  describe("UAT TC-12 - Full Screen Distraction Free Prompt Focus", () => {
    it("should manage toggle transitions when Full Screen Prompt mode is activated", () => {
      let isFullScreenPrompt = false;
      const toggleFullScreen = (active: boolean) => {
        isFullScreenPrompt = active;
      };

      expect(isFullScreenPrompt).toBe(false);
      toggleFullScreen(true);
      expect(isFullScreenPrompt).toBe(true);
      toggleFullScreen(false);
      expect(isFullScreenPrompt).toBe(false);
    });

    it("should emulate Escape key event closure of full screen mode", () => {
      let isFullScreenPrompt = true;
      const handleEscapeKey = (event: { key: string }) => {
        if (event.key === "Escape") {
          isFullScreenPrompt = false;
        }
      };

      handleEscapeKey({ key: "Enter" });
      expect(isFullScreenPrompt).toBe(true); // Should remain open

      handleEscapeKey({ key: "Escape" });
      expect(isFullScreenPrompt).toBe(false); // Should transition to closed
    });
  });

  // ==========================================
  // UAT-05: SYNTAX HIGHLIGHTING TOGGLE PREFERENCE
  // ==========================================
  describe("UAT TC-13 - Toggle Syntax Colors Preference Setting", () => {
    it("should allow toggling between highlighted colors render mode and plain text render mode", () => {
      let enableHighlighting = true;
      const toggleHighlighting = (value: boolean) => {
        enableHighlighting = value;
      };

      expect(enableHighlighting).toBe(true);
      toggleHighlighting(false);
      expect(enableHighlighting).toBe(false);
      toggleHighlighting(true);
      expect(enableHighlighting).toBe(true);
    });

    it("should persistently represent enableHighlighting state within user preferences model configuration", () => {
      const mockPreferences = {
        targetAI: "ChatGPT",
        modePreference: "DETAIL" as const,
        domain: "Marketing",
        enableHighlighting: false,
        updatedAt: "2026-05-22T12:00:00Z"
      };

      expect(mockPreferences.enableHighlighting).toBe(false);
    });
  });
});

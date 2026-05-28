import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add body parser for JSON
  app.use(express.json({ limit: "50mb" }));

  // API Route for AI analysis
  app.post("/api/analyze", async (req, res) => {
    try {
      const { data, prompt } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API Key is not configured." });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Construct the analysis prompt
      const finalPrompt = `
      You are an expert Inventory Stock Analyst.
      Analyze the following inventory data based on the user's request.
      
      User Request: ${prompt || "Analyze the inventory and provide insights such as biggest discrepancy, suggestions, and potential issues."}
      
      Data (JSON):
      ${Array.isArray(data) ? JSON.stringify(data.slice(0, 50)) : JSON.stringify(data)}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: finalPrompt,
        config: {
          systemInstruction: "You are an analytical assistant for inventory data. Provide clear, concise, and professional answers. If there are stock issues, point them out. Answer in Indonesian as requested previously.",
        }
      });

      res.json({ text: response.text });
    } catch (e: any) {
      console.error("AI Analysis error:", e);
      res.status(500).json({ error: e.message || "Something went wrong during analysis" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the dist folder
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For Express 4
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

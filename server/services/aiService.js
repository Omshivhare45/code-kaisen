const { GoogleGenerativeAI } = require("@google/generative-ai");

// Define departments to match frontend/database
const VALID_DEPARTMENTS = ["PWD", "BMC", "Traffic", "Pollution Board", "Electricity", "Water"];
const VALID_CATEGORIES = ["pothole", "blockage", "pollution", "garbage", "waterlogging", "streetlight"];

async function classifyIssue(text, photoUrl) {
  let result = null;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        Analyze the following civic issue reported by a citizen in Bhopal:
        "${text}"
        ${photoUrl ? `(Photo attached: ${photoUrl})` : ''}

        Return a JSON object strictly adhering to this schema:
        {
          "category": "One of: ${VALID_CATEGORIES.join(', ')}",
          "urgencyScore": "Number from 1 to 10 (10 being most critical)",
          "suggestedDepartments": ["Array of departments. Choose from: ${VALID_DEPARTMENTS.join(', ')}. Include multiple if the issue overlaps (e.g. 'Water' and 'PWD' for a leak destroying a road)."],
          "summary": "A 1-sentence concise summary of the issue."
        }
      `;

      const aiResult = await model.generateContent(prompt);
      const response = await aiResult.response;
      let textResponse = response.text();
      
      // Clean up markdown block if present
      textResponse = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
      
      result = JSON.parse(textResponse);
    }
  } catch (error) {
    console.error("AI Classification failed, falling back to rules:", error.message);
  }

  // Rule-based fallback
  if (!result || !result.category || !result.suggestedDepartments || result.suggestedDepartments.length === 0) {
    result = applyRuleBasedFallback(text);
  }

  // Ensure output format is correct
  return {
    category: VALID_CATEGORIES.includes(result.category) ? result.category : "pothole",
    urgencyScore: typeof result.urgencyScore === 'number' ? result.urgencyScore : 5,
    suggestedDepartments: result.suggestedDepartments.filter(d => VALID_DEPARTMENTS.includes(d)),
    summary: result.summary || text.substring(0, 100),
  };
}

function applyRuleBasedFallback(text) {
  const lowerText = text.toLowerCase();
  
  let category = "pothole";
  let suggestedDepartments = ["PWD"];
  let urgencyScore = 5;

  if (lowerText.includes("water") || lowerText.includes("leak") || lowerText.includes("pipe")) {
    category = "waterlogging";
    suggestedDepartments.push("Water");
    urgencyScore = 8;
  }
  if (lowerText.includes("garbage") || lowerText.includes("trash") || lowerText.includes("drain")) {
    category = "garbage";
    if (!suggestedDepartments.includes("BMC")) suggestedDepartments.push("BMC");
  }
  if (lowerText.includes("traffic") || lowerText.includes("block") || lowerText.includes("jam")) {
    category = "blockage";
    if (!suggestedDepartments.includes("Traffic")) suggestedDepartments.push("Traffic");
    urgencyScore = 7;
  }
  if (lowerText.includes("smoke") || lowerText.includes("pollut") || lowerText.includes("dust")) {
    category = "pollution";
    if (!suggestedDepartments.includes("Pollution Board")) suggestedDepartments.push("Pollution Board");
  }
  if (lowerText.includes("light") || lowerText.includes("dark") || lowerText.includes("electric")) {
    category = "streetlight";
    if (!suggestedDepartments.includes("Electricity")) suggestedDepartments.push("Electricity");
  }

  // Deduplicate departments
  suggestedDepartments = [...new Set(suggestedDepartments)];

  return {
    category,
    urgencyScore,
    suggestedDepartments,
    summary: text.substring(0, 100),
  };
}

module.exports = { classifyIssue };

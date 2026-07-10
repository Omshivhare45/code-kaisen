const { GoogleGenerativeAI } = require('@google/generative-ai');

// Ensure API key exists
const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
let genAI = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

/**
 * Generates an AI summary and resolution plan for an issue.
 * 
 * @param {Object} issueData - { title, description, category, area, urgencyScore, departmentName }
 * @returns {Promise<{ summary: string, resolutionPlan: string, suggestedLinkedDepartment: string | null }>}
 */
async function generateIssuePlan(issueData) {
  if (!genAI) {
    throw new Error('Gemini API key is missing. Please set VITE_GEMINI_API_KEY in .env');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
    You are an expert civic administration assistant for the city of Bhopal.
    An issue has been reported by a citizen. Generate a concise summary and a step-by-step resolution plan for the assigned field officers.
    
    Issue Details:
    - Title: ${issueData.title}
    - Description: ${issueData.description}
    - Category: ${issueData.category}
    - Location Area: ${issueData.area}
    - Urgency Score (out of 10): ${issueData.urgencyScore}
    - Primary Department: ${issueData.departmentName}
    
    Your task is to return a JSON object with the following structure exactly:
    {
      "summary": "A 1-2 sentence summary of the issue.",
      "resolutionPlan": "A step-by-step plan (in Markdown) for the field officers to resolve this. Include immediate actions, required equipment, and safety measures.",
      "suggestedLinkedDepartment": "If this issue clearly requires coordination with another specific department (like Traffic, Water, Electricity, PWD, BMC, Pollution Board), output the department name here. Otherwise, return null."
    }
    
    Return ONLY valid JSON. Do not include markdown code block backticks around the JSON.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Strip markdown JSON block if the model included it despite instructions
    if (text.startsWith('\`\`\`json')) {
      text = text.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (text.startsWith('\`\`\`')) {
      text = text.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    try {
      const parsed = JSON.parse(text);
      return {
        summary: parsed.summary || 'No summary generated.',
        resolutionPlan: parsed.resolutionPlan || 'No plan generated.',
        suggestedLinkedDepartment: parsed.suggestedLinkedDepartment || null,
      };
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON. Falling back to raw text.', parseError);
      return {
        summary: 'Failed to generate structured summary.',
        resolutionPlan: text, // Raw text fallback
        suggestedLinkedDepartment: null,
      };
    }
  } catch (error) {
    console.error('AI Generation Error:', error);
    throw new Error('Failed to generate AI plan.');
  }
}

module.exports = {
  generateIssuePlan
};

/**
 * Groq API Service for Borderless SAT Prep
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;

/**
 * Generates a lightning-fast SAT explanation for Review Mode
 */
export const generateInstantExplanation = async (questionText, options, correctAnswer, selectedAnswer) => {
  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are Mintesnot, a world-class SAT tutor. Provide a step-by-step breakdown. Use LaTeX for all mathematical symbols and expressions, wrapped in single $ for inline (e.g. $x = 2$) and double $$ for blocks. Be concise and encouraging. Ensure all math is correctly formatted in LaTeX." },
          { role: "user", content: `Question: ${questionText}\nOptions: A: ${options.A}, B: ${options.B}, C: ${options.C}, D: ${options.D}\nCorrect: ${correctAnswer}\nStudent chose: ${selectedAnswer}` }
        ]
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Groq Error");
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Review AI Error:", error);
    return "Mintesnot is having trouble explaining this one right now, but keep going!";
  }
};

/**
 * Generates a detailed SAT explanation using Groq
 */
export const generateSATExplanation = async (questionText, options, correctAnswer, subtopic) => {
  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", 
        messages: [
          { 
            role: "system", 
            content: "You are Mintesnot, a world-class SAT tutor for the Borderless Club. Explain clearly and concisely why the correct answer is correct. Use a student-friendly, encouraging tone. IMPORTANT: Use LaTeX for all mathematical symbols and expressions, wrapped in single $ for inline and double $$ for blocks. Ensure all math is correctly formatted in LaTeX." 
          },
          { 
            role: "user", 
            content: `Topic: ${subtopic}\nQuestion: ${questionText}\nOptions: A: ${options.A}, B: ${options.B}, C: ${options.C}, D: ${options.D}\nCorrect Answer: Choice ${correctAnswer}` 
          }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (!response.ok || data.error) {
      throw new Error(data.error?.message || `Groq API error: ${response.status}`);
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("Groq (Mintesnot) Error:", error);
    throw error;
  }
};

/**
 * General student inquiry handler
 */
export const askMintesnot = async (userInput, context = "") => {
  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: "You are Mintesnot, a helpful and encouraging SAT assistant for the Borderless Club. Use LaTeX for math symbols wrapped in $ signs. Ensure all math is correctly formatted in LaTeX"  
          },
          { 
            role: "user", 
            content: `Context: ${context}\n\nStudent Question: ${userInput}` 
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || `Groq API error: ${response.status}`);
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("Groq (Mintesnot) Error:", error);
    throw error;
  }
};
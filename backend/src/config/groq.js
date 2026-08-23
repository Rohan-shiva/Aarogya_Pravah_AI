const Groq = require('groq-sdk');

let groqClient = null;

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_groq_api_key_here') {
    return null;
  }

  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }

  return groqClient;
};

const isGroqConfigured = () => {
  const apiKey = process.env.GROQ_API_KEY;
  return Boolean(apiKey && apiKey.trim() !== '' && apiKey !== 'your_groq_api_key_here');
};

module.exports = {
  getGroqClient,
  isGroqConfigured,
  DEFAULT_MODEL: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
};

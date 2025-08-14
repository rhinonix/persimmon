import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface AnalysisRequest {
  content: string;
  source?: string;
  metadata?: {
    location?: string;
    author?: string;
    date?: string;
  };
  pirs?: Array<{
    name: string;
    category: string;
    description: string;
    keywords: string[];
    confidenceThreshold: number;
  }>;
}

interface AnalysisResponse {
  relevant: boolean;
  category: "ukraine" | "sabotage" | "insider" | "none";
  priority: "high" | "medium" | "low";
  confidence: number;
  title: string;
  summary: string;
  quote?: string;
  reasoning: string;
  tags: string[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Claude API key from environment
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) {
      throw new Error('Claude API key not configured');
    }

    // Parse request body
    const { content, source = '', metadata = {}, pirs = [] }: AnalysisRequest = await req.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Content is required and must be a non-empty string');
    }

    // Truncate content if too long
    const truncatedContent = content.length > 10000 
      ? content.substring(0, 10000) + '...' 
      : content;

    // Default PIRs if none provided
    const defaultPIRs = [
      {
        name: "Ukraine Conflict",
        category: "ukraine",
        description: "Frontline movements, political developments, strategic shifts",
        keywords: ["ukraine", "ukrainian", "bakhmut", "kharkiv", "frontline", "military", "zelensky"],
        confidenceThreshold: 70
      },
      {
        name: "Industrial Sabotage", 
        category: "sabotage",
        description: "Infrastructure attacks, facility threats (focus Eurasia)",
        keywords: ["sabotage", "infrastructure", "industrial", "cyber", "attack", "facility", "scada"],
        confidenceThreshold: 70
      },
      {
        name: "Insider Threats",
        category: "insider", 
        description: "Employee security, background check issues",
        keywords: ["employee", "insider", "security", "clearance", "background", "breach", "access"],
        confidenceThreshold: 70
      }
    ];

    const activePIRs = pirs.length > 0 ? pirs : defaultPIRs;

    // Build analysis prompt
    const pirDescriptions = activePIRs
      .map(pir => 
        `${pir.name.toUpperCase()} (${pir.category}): ${pir.description}${
          pir.keywords.length > 0 ? ` Keywords: ${pir.keywords.join(', ')}` : ''
        }`
      )
      .join('\n');

    const prompt = `You are an intelligence analyst for corporate security. Analyze the following content against these Priority Intelligence Requirements (PIRs):

${pirDescriptions}

Content to analyze:
"${truncatedContent}"

Source: ${source}
${metadata.location ? `Location: ${metadata.location}` : ''}
${metadata.author ? `Author: ${metadata.author}` : ''}
${metadata.date ? `Date: ${metadata.date}` : ''}

Instructions:
1. Determine if this content is relevant to any PIR
2. Be conservative - only flag items with clear relevance
3. Consider context, not just keywords
4. Assess confidence based on content quality and relevance

Respond with a JSON object containing:
{
    "relevant": true/false,
    "category": "ukraine" | "sabotage" | "insider" | "none",
    "priority": "high" | "medium" | "low", 
    "confidence": 0-100,
    "title": "Clear, concise title for intelligence feed (max 80 chars)",
    "summary": "2-3 sentence summary for analysts (max 200 chars)",
    "quote": "Most relevant quote from original content (if applicable, max 150 chars)",
    "reasoning": "Brief explanation of categorization and confidence score",
    "tags": ["tag1", "tag2"] // Relevant tags for categorization
}

Only mark as relevant if it directly relates to one of our PIRs. Be conservative - it's better to reject marginally relevant items.`;

    // Make request to Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 1000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.json().catch(() => ({}));
      throw new Error(
        `Claude API error: ${claudeResponse.status} ${claudeResponse.statusText} - ${
          errorData.error?.message || 'Unknown error'
        }`
      );
    }

    const claudeData = await claudeResponse.json();

    if (!claudeData.content || !claudeData.content[0] || !claudeData.content[0].text) {
      throw new Error('Invalid response format from Claude API');
    }

    // Parse Claude's response
    const responseText = claudeData.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const analysis: AnalysisResponse = JSON.parse(jsonMatch[0]);

    // Validate and sanitize response
    const requiredFields = ['relevant', 'category', 'priority', 'confidence', 'title', 'summary', 'reasoning'];
    for (const field of requiredFields) {
      if (analysis[field] === undefined) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Sanitize fields
    analysis.title = analysis.title.substring(0, 80);
    analysis.summary = analysis.summary.substring(0, 200);
    analysis.quote = (analysis.quote || '').substring(0, 150);
    analysis.reasoning = analysis.reasoning.substring(0, 300);
    analysis.tags = Array.isArray(analysis.tags) ? analysis.tags.slice(0, 5) : [];

    console.log(`Analysis complete: ${analysis.relevant ? 'RELEVANT' : 'NOT RELEVANT'} - ${analysis.category} (${analysis.confidence}% confidence)`);

    return new Response(
      JSON.stringify(analysis),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Analysis error:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Intelligence analysis failed'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

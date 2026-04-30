import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image_base64 } = await req.json();
    if (!image_base64) {
      return new Response(
        JSON.stringify({ data: null, error: { code: 'BAD_REQUEST', message: 'image_base64 is required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')!;

    // Google Cloud Vision API でOCR
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: image_base64 },
            features: [{ type: 'TEXT_DETECTION' }],
          }],
        }),
      }
    );

    const visionData = await visionRes.json();
    const rawText = visionData.responses?.[0]?.fullTextAnnotation?.text ?? '';

    // OpenAI で構造化
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '医療費領収書のテキストから情報を抽出してJSON形式で返してください。フィールド: facility_name(施設名), expense_date(YYYY-MM-DD), total_amount(整数・円), expense_type(hospital/pharmacy/other), items([{name,amount}])',
          },
          { role: 'user', content: rawText },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    const openaiData = await openaiRes.json();
    const parsed = JSON.parse(openaiData.choices?.[0]?.message?.content ?? '{}');

    return new Response(
      JSON.stringify({ data: { ...parsed, ocr_raw_text: rawText }, error: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ data: null, error: { code: 'INTERNAL_ERROR', message: String(err) } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
        JSON.stringify({ data: null, error: 'image_base64 is required' }),
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

    if (!rawText) {
      return new Response(
        JSON.stringify({ data: { drug_name: '', dosage: '', frequency: '', days_supply: null, purpose: '', ocr_raw_text: '' }, error: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OpenAI で薬情報を構造化抽出
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
            content: `処方箋・薬袋・お薬説明書の画像テキストから薬の情報を抽出してJSON形式で返してください。
フィールド:
- drug_name: 薬品名（商品名・一般名含む。例: アムロジピン錠5mg）
- dosage: 1回用量（例: 1錠、2カプセル）
- frequency: 服用タイミング（例: 1日1回朝食後、毎食後）
- days_supply: 日数（整数、不明な場合はnull）
- purpose: 用途・効能（例: 高血圧、花粉症）
- prescribed_date: 処方日（YYYY-MM-DD形式、不明な場合はnull）
情報が読み取れない場合は空文字またはnullを返してください。`,
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
      JSON.stringify({ data: null, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

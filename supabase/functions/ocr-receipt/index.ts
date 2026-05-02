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

    if (!rawText.trim()) {
      return new Response(
        JSON.stringify({
          data: {
            facility_name: '',
            expense_date: null,
            total_amount: null,
            expense_type: 'other',
            items: [],
            confidence: 0,
            ocr_raw_text: '',
          },
          error: null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
            content: `日本の医療費領収書・診療費明細・レセプト・薬局の領収書のOCRテキストから、次のキーだけをJSONで返してください。

必須キー:
- facility_name: 医療機関名・薬局名・医院名（正式名称に近い方。店舗名があればそれ）
- expense_date: 領収日または診療日を YYYY-MM-DD（年が不明なら推定せず null）
- total_amount: 患者が支払った請求金額の合計を整数（円）。「合計」「請求額」「会計」「領収額」「税込」など最も確からしい1つを採用。カンマや円記号は無視して数値のみ。
- expense_type: 次のいずれかだけ: "hospital"（病院・クリニック・診療所・歯科など診療） / "pharmacy"（薬局・調剤薬局・ドラッグストアの調剤） / "other"
- items: 内訳が読み取れる場合のみ配列 [{ "name": 項目名, "amount": 整数円 }]。なければ []。
- confidence: 0〜1の数値。読み取りの確信度。

ルール:
- 金額は日本円の整数。複数の合計らしき数字がある場合は、領収書として最も妥当な1つ（通常は最大の請求合計）。
- 日付は和暦なら西暦に換算（例: 令和7年5月1日 → 2025-05-01）。
- 読み取れないフィールドは null または空文字や空配列でよい。`,
          },
          { role: 'user', content: rawText },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content ?? '{}';
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }

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

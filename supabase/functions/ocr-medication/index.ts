import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

type MedItem = {
  drug_name?: string;
  dosage?: string;
  frequency?: string;
  days_supply?: number | null;
  purpose?: string;
};

function normalizeItems(parsed: Record<string, unknown>, rawText: string) {
  const prescribed_date = (parsed.prescribed_date as string | null) ?? null;
  let items: MedItem[] = [];

  if (Array.isArray(parsed.items)) {
    items = (parsed.items as MedItem[])
      .slice(0, 3)
      .filter((it) => it && typeof it === 'object');
  }

  if (items.length === 0 && parsed.drug_name) {
    items = [{
      drug_name: parsed.drug_name as string,
      dosage: parsed.dosage as string | undefined,
      frequency: parsed.frequency as string | undefined,
      days_supply: parsed.days_supply as number | null | undefined,
      purpose: parsed.purpose as string | undefined,
    }];
  }

  return {
    items,
    prescribed_date,
    ocr_raw_text: rawText,
  };
}

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
        JSON.stringify({
          data: { items: [], prescribed_date: null, ocr_raw_text: '' },
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
            content: `処方箋・薬袋・お薬説明書のOCRテキストから、薬1件〜最大3件を抽出してJSONで返してください。

必須キー:
- prescribed_date: 処方日（YYYY-MM-DD、不明ならnull）
- items: 薬の配列（1〜3要素）。同じ処方内の複数剤はそれぞれ別要素にする。読み取れる薬が1つだけなら要素は1つ。

各 items[] 要素のキー:
- drug_name: 薬品名（商品名・一般名）
- dosage: 1回用量（例: 1錠）
- frequency: 服用タイミング（例: 1日1回朝食後）
- days_supply: 処方日数（整数、不明ならnull）
- purpose: 用途・効能（不明なら空文字）

読み取れない場合は items は空配列にする。`,
          },
          { role: 'user', content: rawText },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    const openaiData = await openaiRes.json();
    const parsed = JSON.parse(openaiData.choices?.[0]?.message?.content ?? '{}');
    const normalized = normalizeItems(parsed, rawText);

    return new Response(
      JSON.stringify({ data: normalized, error: null }),
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

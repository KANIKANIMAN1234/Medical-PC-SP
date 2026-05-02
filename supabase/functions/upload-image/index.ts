/**
 * Google Drive へ画像を保存し、view URL と fileId を返す。
 *
 * 必須シークレット:
 * - GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON  サービスアカウント鍵 JSON（1行）
 * - GOOGLE_DRIVE_FOLDER_ID              共有ドライブ上のルートフォルダID
 *
 * リクエスト JSON:
 * - image_base64: string（必須）
 * - folder: string（デフォルト receipts）  ※最下位のカテゴリフォルダ名
 * - organization_id?: string（指定時はフロントが組織メンバーであること）
 * - member_id?: string（organization_id とセットで org/member/folder の階層）
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { google } from 'npm:googleapis@144';
import { Buffer } from 'node:buffer';
import { corsHeaders } from '../_shared/cors.ts';

type DriveV3 = ReturnType<typeof google.drive>;

async function ensureFolder(drive: DriveV3, parentId: string, name: string): Promise<string> {
  const safe = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const q =
    `name='${safe}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const list = await drive.files.list({
    q,
    fields: 'files(id)',
    pageSize: 5,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const existingId = list.data.files?.[0]?.id;
  if (existingId) return existingId;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  const id = created.data.id;
  if (!id) throw new Error('Drive フォルダの作成に失敗しました');
  return id;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }
    const user = authData.user;

    const rawJson = await req.json();
    const image_base64 = rawJson?.image_base64 as string | undefined;
    const folder = String(rawJson?.folder ?? 'receipts').trim() || 'receipts';
    const organization_id = rawJson?.organization_id as string | undefined;
    const member_id = rawJson?.member_id as string | undefined;

    if (!image_base64) {
      return new Response(JSON.stringify({ error: 'image_base64 is required' }), { status: 400, headers: jsonHeaders });
    }

    const saJson = Deno.env.get('GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON');
    const rootFolderId = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID');
    if (!saJson || !rootFolderId) {
      console.error('Missing GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON or GOOGLE_DRIVE_FOLDER_ID');
      return new Response(
        JSON.stringify({ error: 'Drive が未設定です（サーバー設定を確認してください）' }),
        { status: 503, headers: jsonHeaders },
      );
    }

    let credentials: { client_email?: string; private_key?: string };
    try {
      credentials = JSON.parse(saJson) as { client_email?: string; private_key?: string };
    } catch {
      return new Response(JSON.stringify({ error: 'GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON が不正です' }), { status: 503, headers: jsonHeaders });
    }

    if (organization_id) {
      const { data: ou, error: ouErr } = await supabase
        .from('m_organization_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', organization_id)
        .maybeSingle();
      if (ouErr || !ou) {
        return new Response(JSON.stringify({ error: 'この組織へのアップロード権限がありません' }), { status: 403, headers: jsonHeaders });
      }
    }

    if (member_id && organization_id) {
      const { data: mem, error: memErr } = await supabase
        .from('m_members')
        .select('id')
        .eq('id', member_id)
        .eq('organization_id', organization_id)
        .maybeSingle();
      if (memErr || !mem) {
        return new Response(JSON.stringify({ error: '指定のメンバーが見つかりません' }), { status: 403, headers: jsonHeaders });
      }
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const drive = google.drive({ version: 'v3', auth });

    let parentId = rootFolderId;
    if (organization_id) {
      parentId = await ensureFolder(drive, parentId, organization_id);
      if (member_id) {
        parentId = await ensureFolder(drive, parentId, member_id);
      }
    }
    parentId = await ensureFolder(drive, parentId, folder);

    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `receipt_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.jpg`;

    const uploaded = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentId],
      },
      media: {
        mimeType: 'image/jpeg',
        body: buffer,
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });

    const fileId = uploaded.data.id;
    if (!fileId) {
      return new Response(JSON.stringify({ error: 'Drive へのアップロードに失敗しました' }), { status: 502, headers: jsonHeaders });
    }

    const url =
      uploaded.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`;

    return new Response(JSON.stringify({ url, fileId }), { status: 200, headers: jsonHeaders });
  } catch (e) {
    console.error('upload-image', e);
    const message = e instanceof Error ? e.message : 'アップロードに失敗しました';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders });
  }
});

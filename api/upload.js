import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  if (req.method === 'GET') return res.json({ tokenOk: !!process.env.BLOB_READ_WRITE_TOKEN, env: process.env.VERCEL_ENV, blobVars: Object.keys(process.env).filter((k) => k.startsWith('BLOB')) });
  try {
    const json = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => ({ addRandomSuffix: true, maximumSizeInBytes: 5 * 1024 ** 3 }),
      onUploadCompleted: async () => {}
    });
    res.json(json);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

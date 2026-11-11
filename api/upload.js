import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
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

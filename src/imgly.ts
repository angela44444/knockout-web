/**
 * Loaded from CDN at runtime so knockout-app.js stays small enough for Squarespace /s/ upload.
 * @imgly/background-removal is AGPL-3.0 — see THIRD_PARTY.md
 */
const IMGLY_ESM =
  'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm'

type RemoveFn = (
  image: File,
  configuration?: {
    device?: 'cpu' | 'gpu'
    model?: 'isnet' | 'isnet_fp16' | 'isnet_quint8'
    output?: { format: 'image/png'; type: 'foreground' }
    progress?: (key: string, current: number, total: number) => void
  },
) => Promise<Blob>

let removeFn: RemoveFn | null = null

export async function removeBackground(
  file: File,
  config: NonNullable<Parameters<RemoveFn>[1]>,
): Promise<Blob> {
  if (!removeFn) {
    const mod = (await import(/* @vite-ignore */ IMGLY_ESM)) as {
      removeBackground: RemoveFn
    }
    removeFn = mod.removeBackground
  }
  return removeFn(file, config)
}

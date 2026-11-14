import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('../../services/supabaseClient', () => ({ supabase: { functions: { invoke } } }));

import { StorageUploadError, trocUploadErrorMessage, uploadTrocPhotos } from '../../services/uploadService';

const jpeg = (name: string) => new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' });

describe('trocUploadErrorMessage', () => {
  it('donne la photo, une cause lisible et le code d\'étape', () => {
    const msg = trocUploadErrorMessage(new StorageUploadError('webp', 'x'), 2);
    expect(msg).toContain('Photo 2 non envoyée');
    expect(msg).toContain('(code webp)');
    expect(msg).not.toMatch(/cloudinary|preset/i);
  });

  it('classe une erreur inconnue en « upload »', () => {
    expect(trocUploadErrorMessage(new Error('boom'), 1)).toContain('(code upload)');
  });
});

describe('uploadTrocPhotos', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    invoke.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 4000, height: 3000, close: vi.fn() })));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb: BlobCallback) {
      cb(new Blob([new Uint8Array(10)], { type: 'image/webp' }));
    });
  });

  it('envoie les photos une par une, dans l\'ordre, sans Cloudinary', async () => {
    let active = 0;
    let maxActive = 0;
    invoke.mockImplementation(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      active -= 1;
      const id = invoke.mock.calls.length;
      return {
        data: { token: 't', uploadUrl: `/v1/uploads/x/${id}`, mediaUrl: `/v1/media/x/${id}`, origin: 'https://storage.example' },
        error: null,
      };
    });
    fetchMock.mockResolvedValue({ ok: true });

    const urls = await uploadTrocPhotos([jpeg('a.jpg'), jpeg('b.jpg'), jpeg('c.jpg')], 'sess');

    expect(urls).toEqual([1, 2, 3].map((i) => `https://storage.example/v1/media/x/${i}`));
    expect(maxActive).toBe(1);
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes('cloudinary'))).toBe(true);
  });

  it('remonte un quota atteint (429) avec le numéro de la photo', async () => {
    invoke
      .mockResolvedValueOnce({ data: { token: 't', uploadUrl: '/u/1', mediaUrl: '/m/1', origin: 'https://storage.example' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { name: 'FunctionsHttpError', context: { status: 429 } } });
    fetchMock.mockResolvedValue({ ok: true });

    await expect(uploadTrocPhotos([jpeg('a.jpg'), jpeg('b.jpg')], 'sess')).rejects.toThrow(/Photo 2 .*\(code rate_limited\)/);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('cloudinary'))).toBe(false);
  });

  it('signale une conversion WebP impossible sans appeler le serveur', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb: BlobCallback) {
      cb(new Blob([new Uint8Array(10)], { type: 'image/png' }));
    });

    await expect(uploadTrocPhotos([jpeg('a.jpg')], 'sess')).rejects.toThrow(/Photo 1 .*\(code webp\)/);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('distingue une coupure réseau pendant l\'envoi', async () => {
    invoke.mockResolvedValue({ data: { token: 't', uploadUrl: '/u/1', mediaUrl: '/m/1', origin: 'https://storage.example' }, error: null });
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(uploadTrocPhotos([jpeg('a.jpg')], 'sess')).rejects.toThrow(/\(code network\)/);
  });
});

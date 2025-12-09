import React, { useEffect, useState } from 'react';
import { compressImage } from '../utils/imageOptimizer';

type WishItem = {
  id: string;
  title: string;
  url?: string;
  notes?: string;
};

type WishlistState = {
  items: WishItem[];
  photos: string[]; // base64 data URLs
};

type WishlistProps = {
  canEdit?: boolean;
  participantName?: string;
};

const STORAGE_KEY = 'wishlist_items_v2';
const MAX_PHOTOS = 3;

async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function Wishlist({ canEdit = true, participantName }: WishlistProps) {
  const [items, setItems] = useState<WishItem[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WishlistState;
        setItems(parsed.items || []);
        setPhotos(parsed.photos || []);
      } catch (err) {
        console.error('Error parsing wishlist', err);
      }
    }
  }, []);

  useEffect(() => {
    const state: WishlistState = { items, photos };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [items, photos]);

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!title.trim()) return;
    const newItem: WishItem = {
      id: crypto.randomUUID(),
      title: title.trim(),
      url: url.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    setItems((prev) => [newItem, ...prev]);
    setTitle('');
    setUrl('');
    setNotes('');
  };

  const removeItem = (id: string) => {
    if (!canEdit) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handlePhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (!canEdit) return;
    setIsUploading(true);
    try {
      const remainingSlots = MAX_PHOTOS - photos.length;
      const selected = files.slice(0, remainingSlots);
      const compressedDataUrls: string[] = [];
      for (const f of selected) {
        const compressed = await compressImage(f);
        const dataUrl = await blobToDataURL(compressed);
        compressedDataUrls.push(dataUrl);
      }
      setPhotos((prev) => [...prev, ...compressedDataUrls].slice(0, MAX_PHOTOS));
    } catch (err) {
      console.error('Error subiendo fotos de wishlist', err);
      alert('No pudimos procesar las fotos. Intenta de nuevo.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const removePhoto = (idx: number) => {
    if (!canEdit) return;
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="p-4 bg-white shadow rounded-lg space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-1">Mi Lista de Deseos</h2>
        <p className="text-gray-600 text-sm">
          {participantName ? `Wishlist de ${participantName}` : 'Agrega ideas de regalos, links y notas.'}
        </p>
        {!canEdit && (
          <p className="text-xs text-gray-500 mt-1">
            Usa tu enlace mágico para editar esta wishlist. Ahora está en modo solo lectura.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">Fotos de referencia (máx 3)</p>
            <p className="text-xs text-gray-500">Añade imágenes que representen tus deseos.</p>
          </div>
          <label className={`px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors cursor-pointer ${(!canEdit || photos.length >= MAX_PHOTOS || isUploading) ? 'opacity-60 pointer-events-none' : ''}`}>
            {isUploading ? 'Subiendo...' : 'Subir fotos'}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotos}
              disabled={isUploading || photos.length >= MAX_PHOTOS || !canEdit}
            />
          </label>
        </div>
        {photos.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {photos.map((src, idx) => (
              <div key={idx} className="relative">
                <img
                  src={src}
                  alt={`wishlist-photo-${idx}`}
                  className="w-20 h-20 rounded-lg object-cover border"
                />
                {canEdit && (
                  <button
                    onClick={() => removePhoto(idx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full px-2 text-[10px]"
                    aria-label="Eliminar foto"
                  >
                    X
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Aún no hay fotos.</p>
        )}
      </div>

      <form onSubmit={addItem} className="space-y-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Artículo</label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-christmas-green/60"
            placeholder="Ej. Audífonos inalámbricos"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={!canEdit}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Link (opcional)</label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-christmas-green/60"
            placeholder="https://tienda.com/producto"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={!canEdit}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Notas (opcional)</label>
          <textarea
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-christmas-green/60"
            placeholder="Talla M, color negro, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            disabled={!canEdit}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-christmas-green text-white font-semibold rounded-lg py-2 hover:bg-emerald-600 transition-colors disabled:opacity-60"
          disabled={!canEdit}
        >
          Guardar en la lista
        </button>
      </form>

      <div className="border-t border-gray-100 pt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no hay deseos guardados.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-lg p-3 flex justify-between gap-3 items-start"
            >
              <div className="space-y-1">
                <p className="font-semibold text-gray-800">{item.title}</p>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-christmas-red hover:underline break-all"
                  >
                    {item.url}
                  </a>
                )}
                {item.notes && <p className="text-sm text-gray-600">{item.notes}</p>}
              </div>
              {canEdit && (
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Eliminar
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';

type WishItem = {
  id: string;
  title: string;
  url?: string;
  notes?: string;
};

const STORAGE_KEY = 'wishlist_items_v1';

export default function Wishlist() {
  const [items, setItems] = useState<WishItem[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WishItem[];
        setItems(parsed);
      } catch (err) {
        console.error('Error parsing wishlist', err);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
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
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="p-4 bg-white shadow rounded-lg space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-1">Mi Lista de Deseos</h2>
        <p className="text-gray-600 text-sm">Agrega ideas de regalos, links y notas.</p>
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
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Link (opcional)</label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-christmas-green/60"
            placeholder="https://tienda.com/producto"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
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
          />
        </div>
        <button
          type="submit"
          className="w-full bg-christmas-green text-white font-semibold rounded-lg py-2 hover:bg-emerald-600 transition-colors"
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
              <button
                onClick={() => removeItem(item.id)}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Eliminar
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

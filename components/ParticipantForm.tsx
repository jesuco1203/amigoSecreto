import React, { useRef, useState } from 'react';
import { Plus, Image as ImageIcon, Loader2 } from 'lucide-react';
import { pb } from '../services/pocketbase';
import { compressImage } from '../utils/imageOptimizer';
import { Button } from './Button';
import { Input } from './Input';

const ParticipantForm: React.FC = () => {
  const [name, setName] = useState('');
  const [interests, setInterests] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [wishlistFiles, setWishlistFiles] = useState<File[]>([]);
  const [wishlistPreviews, setWishlistPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wishlistInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleWishlistChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const combined = [...wishlistFiles, ...files].slice(0, 3);
    setWishlistFiles(combined);
    setWishlistPreviews(combined.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isUploading) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('interests', interests);

      if (file) {
        const compressed = await compressImage(file);
        const newName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
        formData.append('avatar', compressed, newName);
      }

       if (wishlistFiles.length) {
         for (const wf of wishlistFiles.slice(0, 3)) {
           const compressed = await compressImage(wf);
           const newName = wf.name.replace(/\.[^/.]+$/, '') + '.webp';
           formData.append('wishlistPhotos', compressed, newName);
         }
       }

      await pb.collection('participants').create(formData);

      setName('');
      setInterests('');
      setFile(null);
      setPreview(null);
      setWishlistFiles([]);
      setWishlistPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (wishlistInputRef.current) wishlistInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      alert('Error al conectar con el servidor.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full space-y-8">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-christmas-red via-christmas-gold to-christmas-green" />

        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-christmas-green" />
          Agregar Participante
        </h3>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex flex-col items-center gap-3 min-w-[140px]">
            <div
              className={`relative w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group shadow-inner ${
                isUploading ? 'cursor-wait' : 'cursor-pointer'
              }`}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Avatar"
                  className="w-full h-full object-cover animate-[fadeIn_0.3s_ease-out]"
                />
              ) : isUploading ? (
                <Loader2 className="w-8 h-8 text-christmas-green animate-spin" />
              ) : (
                <ImageIcon className="w-8 h-8 text-gray-400" />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </div>
            <span className="text-[10px] text-gray-500">
              {isUploading ? 'Subiendo...' : 'Subir foto'}
            </span>
          </div>

          <div className="flex-1 space-y-4">
            <Input
              placeholder="Nombre (ej. Juan Pérez)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              label="Nombre"
              disabled={isUploading}
            />
            <Input
              placeholder="Gustos (ej. Cocina, Star Wars...)"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              label="Intereses"
              disabled={isUploading}
            />

            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Fotos de referencia (máx 3)</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => !isUploading && wishlistInputRef.current?.click()}
                  className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                  disabled={isUploading}
                >
                  Subir fotos
                </button>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  ref={wishlistInputRef}
                  onChange={handleWishlistChange}
                  disabled={isUploading}
                />
              </div>
              {wishlistPreviews.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {wishlistPreviews.map((src, idx) => (
                    <img
                      key={idx}
                      src={src}
                      alt={`wishlist-${idx}`}
                      className="w-16 h-16 rounded-lg object-cover border"
                    />
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" fullWidth disabled={!name.trim() || isUploading}>
              {isUploading ? 'Subiendo...' : 'Agregar a la Lista'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export { ParticipantForm };

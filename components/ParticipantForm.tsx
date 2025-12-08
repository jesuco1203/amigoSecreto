import React, { useState, useRef } from 'react';
import { Plus, Trash2, User, Gift, Image as ImageIcon, Upload, Sparkles, Loader2, X, Palette, MessageSquare } from 'lucide-react';
import { Participant } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { generateAvatar } from '../services/geminiService';
import { storage } from '../firebaseConfig';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

interface ParticipantFormProps {
  participants: Participant[];
  onAdd: (p: Omit<Participant, 'id'>) => void;
  onRemove: (id: string) => void;
}

const AVATAR_STYLES = [
  { id: '3D Cartoon', label: '3D Cute' },
  { id: 'Anime', label: 'Anime' },
  { id: 'Pixel Art', label: 'Pixel Art' },
  { id: 'Minimalist Flat', label: 'Minimalista' },
  { id: 'Watercolor', label: 'Acuarela' },
  { id: 'Claymation', label: 'Plastilina' },
  { id: 'Cyberpunk', label: 'Cyberpunk' },
  { id: 'Pop Art', label: 'Pop Art' },
  { id: 'Custom', label: 'Personalizado (Prompt)' },
];

const compressImage = (file: File): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxSize = 800;
      let { width, height } = img;

      if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo crear el contexto del canvas'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = canvas.toDataURL('image/webp').startsWith('data:image/webp')
        ? 'image/webp'
        : 'image/jpeg';

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('No se pudo comprimir la imagen'));
        },
        mimeType,
        0.7
      );
    };

    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = objectUrl;
  });

export const ParticipantForm: React.FC<ParticipantFormProps> = ({ participants, onAdd, onRemove }) => {
  const [name, setName] = useState('');
  const [interests, setInterests] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarStyle, setAvatarStyle] = useState('3D Cartoon');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isUploading || isGenerating) return;
    onAdd({ name, interests, avatar: avatar || undefined });
    setName('');
    setInterests('');
    setCustomPrompt('');
    setAvatar(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const compressedBlob = await compressImage(file);
      const safeName = file.name.replace(/\s+/g, '_');
      const extension = compressedBlob.type.includes('webp') ? 'webp' : 'jpg';
      const storageRef = ref(storage, `avatars/${Date.now()}-${safeName}.${extension}`);

      await uploadBytes(storageRef, compressedBlob, { contentType: compressedBlob.type });
      const downloadURL = await getDownloadURL(storageRef);
      setAvatar(downloadURL);
    } catch (error) {
      console.error('Error subiendo avatar:', error);
      alert('No pudimos subir la imagen. Intenta de nuevo.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGenerateAvatar = async () => {
    if (!name) return;
    setIsGenerating(true);

    try {
      const promptToUse = avatarStyle === 'Custom' ? customPrompt : interests;
      const generatedImage = await generateAvatar(name, promptToUse, avatarStyle);
      if (generatedImage) {
        setAvatar(generatedImage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const isGenerateDisabled = () => {
    if (isGenerating) return true;
    if (!name.trim()) return true;
    if (avatarStyle === 'Custom' && !customPrompt.trim()) return true;
    return false;
  };

  return (
    <div className="w-full space-y-8">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-christmas-red via-christmas-gold to-christmas-green"></div>
        
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-christmas-green" />
          Agregar Participante
        </h3>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3 min-w-[140px]">
            <div className="relative w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group shadow-inner">
              {avatar ? (
                <>
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover animate-[fadeIn_0.3s_ease-out]" />
                  <button 
                    type="button"
                    onClick={() => setAvatar(null)}
                    className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                    title="Eliminar imagen"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </>
              ) : isGenerating || isUploading ? (
                <Loader2 className="w-8 h-8 text-christmas-green animate-spin" />
              ) : (
                <ImageIcon className="w-8 h-8 text-gray-400" />
              )}
            </div>
            
            <div className="flex flex-col gap-2 w-full">
               <div className="relative">
                  <select 
                    value={avatarStyle}
                    onChange={(e) => setAvatarStyle(e.target.value)}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg py-1.5 pl-2 pr-6 focus:outline-none focus:border-christmas-green focus:ring-1 focus:ring-christmas-green cursor-pointer"
                    disabled={isGenerating || isUploading}
                  >
                    {AVATAR_STYLES.map(style => (
                      <option key={style.id} value={style.id}>{style.label}</option>
                    ))}
                  </select>
                  <Palette className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
               </div>

               <div className="flex gap-2 justify-center">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors border border-gray-200 flex items-center justify-center gap-1 disabled:opacity-50"
                    title="Subir foto desde archivo"
                    disabled={isUploading}
                  >
                    <Upload className="w-3 h-3" />
                    <span className="text-[10px] font-bold">
                      {isUploading ? 'Subiendo...' : 'Subir'}
                    </span>
                  </button>
                  <button 
                    type="button"
                    onClick={handleGenerateAvatar}
                    disabled={isGenerateDisabled()}
                    className="flex-1 p-2 rounded-lg bg-christmas-green/10 text-christmas-green hover:bg-christmas-green/20 border border-christmas-green/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    title={avatarStyle === 'Custom' && !customPrompt ? "Escribe un prompt para generar" : "Generar Avatar con IA"}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span className="text-[10px] font-bold">Generar</span>
                  </button>
               </div>
               {isUploading && (
                 <p className="text-[11px] text-gray-500 text-center">Comprimimos y subimos tu avatar...</p>
               )}
            </div>
          </div>

          {/* Fields Section */}
          <div className="flex-1 space-y-4">
            <Input 
              placeholder="Nombre (ej. Juan Pérez)" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              label="Nombre"
            />
            
            {avatarStyle === 'Custom' ? (
                <div className="animate-[fadeIn_0.3s_ease-out]">
                    <Input 
                        placeholder="Describe el avatar (ej. Un gato espacial con gafas de sol)" 
                        value={customPrompt} 
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        label="Descripción Visual para el Avatar"
                        icon={<MessageSquare className="w-4 h-4 text-christmas-green" />}
                    />
                    <Input 
                        placeholder="Gustos (ej. Cocina, Star Wars...)" 
                        value={interests} 
                        onChange={(e) => setInterests(e.target.value)}
                        label="Intereses (para sugerencia de regalos)"
                        className="mt-4"
                    />
                </div>
            ) : (
                <Input 
                    placeholder="Gustos (ej. Cocina, Star Wars, color azul...)" 
                    value={interests} 
                    onChange={(e) => setInterests(e.target.value)}
                    label="Intereses (para regalos y avatar)"
                />
            )}

            <Button type="submit" fullWidth disabled={!name.trim() || isGenerating || isUploading}>
              {isUploading ? 'Esperando imagen...' : 'Agregar a la Lista'}
            </Button>
          </div>
        </div>
      </form>

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-700 ml-1">
          Participantes ({participants.length})
        </h3>
        
        {participants.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white/50 rounded-xl border-2 border-dashed border-gray-300">
            <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Aún no hay participantes.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {participants.map((p) => (
              <li key={p.id} className="group bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                    {p.avatar ? (
                      <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-christmas-red/10 text-christmas-red">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800 leading-tight">
                      {p.name}
                    </span>
                    {p.interests && (
                      <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Gift className="w-3 h-3" />
                        {p.interests}
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => onRemove(p.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

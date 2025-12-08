import React, { useState, useEffect } from 'react';
import { Gift, Eye, EyeOff, Sparkles, Loader2, User } from 'lucide-react';
import { Participant, GiftSuggestion } from '../types';
import { Button } from './Button';
import { getGiftSuggestions } from '../services/geminiService';

interface RevealCardProps {
  santa: Participant;
  giftee: Participant;
  budget: string;
  onAck: () => void;
}

export const RevealCard: React.FC<RevealCardProps> = ({ santa, giftee, budget, onAck }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [suggestions, setSuggestions] = useState<GiftSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch suggestions only when revealed to save API calls and suspense
  useEffect(() => {
    if (isRevealed && !suggestions && !loading) {
      setLoading(true);
      getGiftSuggestions(giftee.name, giftee.interests, budget)
        .then(data => {
            setSuggestions(data);
        })
        .finally(() => setLoading(false));
    }
  }, [isRevealed, giftee, suggestions, budget, loading]);

  if (!isRevealed) {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-christmas-red transform transition-all hover:scale-105 duration-300">
        <div className="bg-christmas-red p-8 text-center text-white">
          <Gift className="w-20 h-20 mx-auto mb-4 animate-bounce-slow" />
          <h2 className="text-2xl font-bold mb-2">¡Hola, {santa.name}!</h2>
          <p className="opacity-90">Es tu turno de descubrir a quién le regalarás.</p>
        </div>
        <div className="p-8 flex flex-col items-center gap-6 bg-[url('https://www.transparenttextures.com/patterns/snow.png')]">
          <p className="text-gray-600 text-center">Asegúrate de que nadie más esté mirando la pantalla.</p>
          <Button onClick={() => setIsRevealed(true)} variant="primary" className="w-full text-lg py-4 shadow-xl">
            <Eye className="w-5 h-5" />
            Revelar mi Amigo Secreto
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden relative animate-[fadeIn_0.5s_ease-out]">
      <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-christmas-gold via-yellow-300 to-christmas-gold"></div>
      
      <div className="p-8 text-center space-y-6">
        <div>
           {/* Avatar Display */}
           <div className="w-28 h-28 mx-auto mb-4 rounded-full bg-gray-50 border-4 border-christmas-green p-1 shadow-lg relative">
             <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
               {giftee.avatar ? (
                  <img src={giftee.avatar} alt={giftee.name} className="w-full h-full object-cover" />
               ) : (
                  <User className="w-12 h-12 text-gray-300" />
               )}
             </div>
             <div className="absolute -bottom-2 -right-2 bg-christmas-gold p-2 rounded-full shadow-md text-white">
               <Gift className="w-5 h-5" />
             </div>
           </div>

          <p className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-2">Tu Amigo Secreto es</p>
          <h1 className="text-4xl font-extrabold text-christmas-green mb-1">{giftee.name}</h1>
          <p className="text-sm text-gray-500 italic bg-gray-50 inline-block px-3 py-1 rounded-full border border-gray-100">
             "{giftee.interests || 'Sin intereses específicos'}"
          </p>
        </div>

        <div className="border-t border-b border-gray-100 py-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-christmas-gold" />
            <h3 className="font-bold text-gray-800">Sugerencias de la IA</h3>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-4 text-gray-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Consultando a los elfos digitales...</span>
            </div>
          ) : (
            <div className="space-y-3 text-left">
              {suggestions?.map((gift, idx) => (
                <div key={idx} className="bg-christmas-cream p-3 rounded-xl border border-yellow-100">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-gray-800 text-sm">{gift.title}</h4>
                    <span className="text-xs bg-white px-2 py-0.5 rounded text-gray-500 shadow-sm border">{gift.estimatedPrice}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{gift.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button onClick={onAck} variant="outline" fullWidth>
          <EyeOff className="w-5 h-5" />
          Ocultar y Pasar al Siguiente
        </Button>
      </div>
    </div>
  );
};
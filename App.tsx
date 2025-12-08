import React, { useEffect, useState } from 'react';
import { Participant, Match, AppPhase, GlobalSettings } from './types';
import { ParticipantForm } from './components/ParticipantForm';
import { RevealCard } from './components/RevealCard';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { Snowfall } from './components/Snowfall';
import { Gift, RefreshCw, Calendar, Users, Edit2, ArrowRight, Check, Loader2, X } from 'lucide-react';
import { pb } from './services/pocketbase';

const ADMIN_FLAG_KEY = 'secret_santa_admin';
const ADMIN_CODE = import.meta.env.VITE_ADMIN_CODE || 'admin123';

function shuffle<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

const defaultSettings: GlobalSettings = {
  budget: '100',
  exchangeDate: '',
  isConfigured: false,
};

const App: React.FC = () => {
  const [phase, setPhase] = useState<AppPhase>(AppPhase.SETUP);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentRevealIndex, setCurrentRevealIndex] = useState(0);
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);
  const [gameStateId, setGameStateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let unsubParticipants: (() => void) | null = null;
    let unsubGame: (() => void) | null = null;

    const load = async () => {
      try {
        const people = await pb.collection('participants').getFullList({ sort: 'created' });
        setParticipants(
          people.map((p: any) => ({
            id: p.id,
            name: p.name,
            interests: p.interests,
            avatar: p.avatar ? pb.files.getURL(p, p.avatar) : undefined,
          }))
        );

        const stateResp = await pb.collection('game_state').getList(1, 1, { sort: '-created' });
        if (stateResp.items.length) {
          const s: any = stateResp.items[0];
          setGameStateId(s.id);
          if (s.phase) setPhase(s.phase as AppPhase);
          if (s.matches) setMatches(s.matches as Match[]);
          if (s.currentRevealIndex !== undefined) setCurrentRevealIndex(s.currentRevealIndex);

          const mergedSettings: GlobalSettings = {
            budget: s.budget ?? s.settings?.budget ?? defaultSettings.budget,
            exchangeDate: s.exchangeDate ?? s.settings?.exchangeDate ?? defaultSettings.exchangeDate,
            isConfigured: s.isConfigured ?? s.settings?.isConfigured ?? true, // si hay game_state asumimos configurado
          };
          setSettings(mergedSettings);
        } else {
          const created = await pb.collection('game_state').create({
            phase: AppPhase.SETUP,
            matches: [],
            currentRevealIndex: 0,
            settings: defaultSettings,
            budget: defaultSettings.budget,
            exchangeDate: defaultSettings.exchangeDate,
            isConfigured: defaultSettings.isConfigured,
          });
          setGameStateId(created.id);
        }
      } catch (err) {
        console.error('Error loading data', err);
      } finally {
        setLoading(false);
      }

      if (localStorage.getItem(ADMIN_FLAG_KEY) === '1') {
        setIsAdmin(true);
      }

      unsubParticipants = pb.collection('participants').subscribe('*', async () => {
        const peopleSnap = await pb.collection('participants').getFullList({ sort: 'created' });
        setParticipants(
          peopleSnap.map((p: any) => ({
            id: p.id,
            name: p.name,
            interests: p.interests,
            avatar: p.avatar ? pb.files.getURL(p, p.avatar) : undefined,
          }))
        );
      });

      unsubGame = pb.collection('game_state').subscribe('*', (e) => {
        const r: any = e.record;
        if (r.phase) setPhase(r.phase as AppPhase);
        if (r.matches) setMatches(r.matches as Match[]);
        if (r.currentRevealIndex !== undefined) setCurrentRevealIndex(r.currentRevealIndex);
        const mergedSettings: GlobalSettings = {
          budget: r.budget ?? r.settings?.budget ?? defaultSettings.budget,
          exchangeDate: r.exchangeDate ?? r.settings?.exchangeDate ?? defaultSettings.exchangeDate,
          isConfigured: r.isConfigured ?? r.settings?.isConfigured ?? true,
        };
        setSettings(mergedSettings);
      });
    };

    load();

    return () => {
      if (unsubParticipants) pb.collection('participants').unsubscribe('*');
      if (unsubGame) pb.collection('game_state').unsubscribe('*');
    };
  }, []);

  const saveConfiguration = async () => {
    if (!settings.budget) {
      alert('Por favor ingresa un presupuesto.');
      return;
    }
    if (!gameStateId) return;
    await pb.collection('game_state').update(gameStateId, {
      settings: { ...settings, isConfigured: true },
      budget: settings.budget,
      exchangeDate: settings.exchangeDate,
      isConfigured: true,
      phase: AppPhase.SETUP,
    });
    setSettings((s) => ({ ...s, isConfigured: true }));
    localStorage.setItem(ADMIN_FLAG_KEY, '1');
    setIsAdmin(true);
  };

  const editConfiguration = async () => {
    if (!window.confirm('¿Quieres editar la configuración del evento?')) return;
    if (!gameStateId) return;
    await pb.collection('game_state').update(gameStateId, {
      settings: { ...settings, isConfigured: false },
      budget: settings.budget,
      exchangeDate: settings.exchangeDate,
      isConfigured: false,
      phase: AppPhase.SETUP,
    });
    setPhase(AppPhase.SETUP);
    setSettings((s) => ({ ...s, isConfigured: false }));
  };

  const startDraw = async () => {
    if (!isAdmin) {
      alert('Solo el admin puede realizar el sorteo.');
      return;
    }
    if (participants.length < 2 || !gameStateId) {
      alert('Necesitas al menos 2 participantes para jugar.');
      return;
    }
    if (!window.confirm('¿Cerrar inscripciones y sortear?')) return;

    const shuffled = shuffle(participants);
    const newMatches = shuffled.map((p, idx) => ({
      santaId: p.id,
      gifteeId: shuffled[(idx + 1) % shuffled.length].id,
    }));

    await pb.collection('game_state').update(gameStateId, {
      matches: newMatches,
      phase: AppPhase.REVEAL,
      currentRevealIndex: 0,
      settings: { ...settings, isConfigured: true },
      budget: settings.budget,
      exchangeDate: settings.exchangeDate,
      isConfigured: true,
    });
    setMatches(newMatches);
    setPhase(AppPhase.REVEAL);
    setCurrentRevealIndex(0);
  };

  const nextReveal = async () => {
    if (!gameStateId) return;
    if (currentRevealIndex < matches.length - 1) {
      const next = currentRevealIndex + 1;
      setCurrentRevealIndex(next);
      await pb.collection('game_state').update(gameStateId, { currentRevealIndex: next });
    } else {
      setPhase(AppPhase.FINISHED);
      await pb.collection('game_state').update(gameStateId, { phase: AppPhase.FINISHED });
    }
  };

  const resetGame = async () => {
    if (!isAdmin) {
      alert('Solo el admin puede reiniciar.');
      return;
    }
    if (!window.confirm('¿Seguro que quieres reiniciar? Se borrarán los sorteos y participantes.')) return;
    if (!gameStateId) return;

    const people = await pb.collection('participants').getFullList();
    await Promise.all(people.map((p: any) => pb.collection('participants').delete(p.id)));

    await pb.collection('game_state').update(gameStateId, {
      matches: [],
      phase: AppPhase.SETUP,
      currentRevealIndex: 0,
      settings: defaultSettings,
      budget: defaultSettings.budget,
      exchangeDate: defaultSettings.exchangeDate,
      isConfigured: defaultSettings.isConfigured,
    });

    setParticipants([]);
    setMatches([]);
    setPhase(AppPhase.SETUP);
    setCurrentRevealIndex(0);
    setSettings(defaultSettings);
  };

  const removeParticipant = async (id: string) => {
    if (window.confirm('¿Eliminar participante?')) {
      await pb.collection('participants').delete(id);
    }
  };

  const getCurrentMatch = () => {
    if (!matches.length || currentRevealIndex >= matches.length) return { santa: null, giftee: null };
    const match = matches[currentRevealIndex];
    const santa = participants.find((p) => p.id === match.santaId) || null;
    const giftee = participants.find((p) => p.id === match.gifteeId) || null;
    return { santa, giftee };
  };

  const handleAdminUnlock = () => {
    const code = window.prompt('Ingresa la clave de administrador');
    if (!code) return;
    if (code === ADMIN_CODE) {
      setIsAdmin(true);
      localStorage.setItem(ADMIN_FLAG_KEY, '1');
    } else {
      alert('Clave incorrecta');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F0E8]">
        <Loader2 className="w-10 h-10 text-christmas-red animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F0E8] text-gray-800 font-sans pb-20 relative">
      <Snowfall />
      <header className="bg-christmas-red text-white py-6 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-full shadow-inner">
              <Gift className="w-6 h-6 text-christmas-red" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Amigo Secreto Nuestra Familia</h1>
          </div>
          <div className="flex items-center gap-2">
            {phase !== AppPhase.SETUP && isAdmin && (
              <button
                onClick={resetGame}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
                title="Reiniciar Sorteo"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-8 max-w-3xl relative z-10 pb-32">
        {phase === AppPhase.SETUP && (
          <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            {!settings.isConfigured ? (
              <div className="bg-white p-8 rounded-3xl shadow-xl border-t-4 border-christmas-gold text-center space-y-6 max-w-lg mx-auto mt-10">
                <div className="bg-christmas-red/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-10 h-10 text-christmas-red" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">¡Comencemos!</h2>
                  <p className="text-gray-500">Configura las reglas del intercambio antes de invitar a la familia.</p>
                </div>

                <div className="text-left space-y-4 bg-gray-50 p-6 rounded-2xl">
                  <Input
                    label="Presupuesto Máximo"
                    value={settings.budget}
                    onChange={(e) => setSettings({ ...settings, budget: e.target.value })}
                    placeholder="Ej. 100"
                    icon={<span className="text-sm font-bold text-gray-500 font-sans">S/</span>}
                  />
                  <Input
                    label="Fecha del Intercambio (Opcional)"
                    type="date"
                    value={settings.exchangeDate}
                    onChange={(e) => setSettings({ ...settings, exchangeDate: e.target.value })}
                  />
                </div>

                <Button onClick={saveConfiguration} fullWidth className="text-lg py-4">
                  Crear Evento <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <>
                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-christmas-green/20 flex flex-wrap justify-between items-center gap-4 shadow-sm animate-[slideDown_0.3s_ease-out]">
                  <div className="flex gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-christmas-gold/20 rounded-lg text-christmas-gold">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 font-bold uppercase">Presupuesto</span>
                        <span className="font-bold text-gray-800">S/ {settings.budget}</span>
                      </div>
                    </div>
                    {settings.exchangeDate && (
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-christmas-green/20 rounded-lg text-christmas-green">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 font-bold uppercase">Fecha</span>
                          <span className="font-bold text-gray-800">{settings.exchangeDate}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={editConfiguration}
                    className="text-xs text-gray-400 hover:text-christmas-red flex items-center gap-1 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" /> Editar reglas
                  </button>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Participantes ({participants.length})
                  </h3>
                  {participants.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 bg-white/70 rounded-xl border-2 border-dashed border-gray-200">
                      <p>Aún no hay participantes.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {participants.map((p) => (
                        <div
                          key={p.id}
                          className="group bg-white p-2 rounded-lg border border-gray-100 flex items-center gap-2 relative"
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border">
                            <img
                              src={p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}`}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{p.name}</p>
                            {p.interests && <p className="text-[11px] text-gray-500 truncate">{p.interests}</p>}
                          </div>
                          <button
                            onClick={() => removeParticipant(p.id)}
                            className="absolute -top-2 -right-2 bg-red-100 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <ParticipantForm />

                <div className="h-28" />
              </>
            )}
          </div>
        )}

        {phase === AppPhase.REVEAL && (
          <div className="py-8">
            <div className="mb-6 flex justify-between items-center text-sm text-gray-500 font-medium px-4 bg-white/50 p-2 rounded-full backdrop-blur-sm">
              <span>Turno {currentRevealIndex + 1} de {matches.length}</span>
              <span className="bg-christmas-red/10 text-christmas-red px-3 py-1 rounded-full text-xs font-bold">Modo Presencial</span>
            </div>

            {(() => {
              const { santa, giftee } = getCurrentMatch();
              if (!santa || !giftee) return null;
              return (
                <RevealCard
                  key={matches[currentRevealIndex].santaId}
                  santa={santa}
                  giftee={giftee}
                  budget={settings.budget}
                  onAck={nextReveal}
                />
              );
            })()}
          </div>
        )}

        {phase === AppPhase.FINISHED && (
          <div className="text-center py-12 space-y-6 animate-[scaleIn_0.5s_ease-out]">
            <div className="inline-block p-6 rounded-full bg-white shadow-xl mb-4 relative z-20">
              <Users className="w-16 h-16 text-christmas-green" />
            </div>
            <h2 className="text-4xl font-extrabold text-gray-800 relative z-20">¡Sorteo Completado!</h2>
            <p className="text-xl text-gray-600 max-w-md mx-auto relative z-20">
              Todos tienen su Amigo Secreto asignado. ¡Es hora de buscar el regalo perfecto!
            </p>

            <div className="bg-white p-6 rounded-xl max-w-sm mx-auto shadow-lg border-t-4 border-christmas-gold relative z-20">
              <h3 className="font-bold text-gray-800 mb-2">Resumen</h3>
              <ul className="text-left space-y-2 text-sm text-gray-600">
                <li className="flex justify-between">
                  <span>Participantes:</span>
                  <span className="font-bold">{participants.length}</span>
                </li>
                <li className="flex justify-between">
                  <span>Presupuesto:</span>
                  <span className="font-bold">S/ {settings.budget}</span>
                </li>
                {settings.exchangeDate && (
                  <li className="flex justify-between">
                    <span>Fecha:</span>
                    <span className="font-bold">{settings.exchangeDate}</span>
                  </li>
                )}
              </ul>
            </div>

            <div className="relative z-20">
              <Button onClick={resetGame} variant="secondary">
                Organizar Nuevo Sorteo
              </Button>
            </div>
          </div>
        )}
      </main>

      {phase === AppPhase.SETUP && (
        <div className="fixed bottom-0 left-0 w-full z-50 bg-white/90 backdrop-blur border-t border-gray-200 p-4">
          <div className="max-w-3xl mx-auto">
            {isAdmin ? (
              <Button
                onClick={startDraw}
                fullWidth
                variant="primary"
                disabled={participants.length < 2}
                className="text-lg py-4 shadow-christmas-red/30 shadow-xl"
              >
                <Gift className="w-6 h-6" />
                ¡Realizar el Sorteo Mágico!
              </Button>
            ) : (
              <div className="flex flex-col gap-2 text-center text-sm text-gray-600">
                <span>Esperando al administrador para realizar el sorteo.</span>
                <Button variant="secondary" onClick={handleAdminUnlock} fullWidth>
                  Soy admin
                </Button>
              </div>
            )}
            <p className="text-center text-xs text-gray-500 mt-2">
              {participants.length < 2
                ? 'Agrega al menos 2 personas para comenzar.'
                : `${participants.length} participantes listos`}
            </p>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 w-full h-2 bg-gradient-to-r from-christmas-green via-emerald-600 to-christmas-green z-40" />
    </div>
  );
};

export default App;

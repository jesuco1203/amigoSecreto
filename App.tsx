import React, { useEffect, useState } from 'react';
import { Participant, Match, AppPhase, GlobalSettings } from './types';
import { ParticipantForm } from './components/ParticipantForm';
import { RevealCard } from './components/RevealCard';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { Snowfall } from './components/Snowfall';
import { Gift, RefreshCw, Calendar, Users, Edit2, ArrowRight, Check } from 'lucide-react';
import { db } from './firebaseConfig';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, setDoc, writeBatch } from 'firebase/firestore';

const configRef = doc(db, 'config', 'state');

// Fisher-Yates shuffle
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
  const [participantsLoaded, setParticipantsLoaded] = useState(false);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Firestore listeners
  useEffect(() => {
    const participantsRef = collection(db, 'participants');
    const matchesRef = query(collection(db, 'matches'), orderBy('order', 'asc'));

    const unsubParticipants = onSnapshot(participantsRef, (snapshot) => {
      const people: Participant[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Participant, 'id'>),
      }));
      setParticipants(people);
      setParticipantsLoaded(true);
    });

    const unsubMatches = onSnapshot(matchesRef, (snapshot) => {
      const data: Match[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data() as Match & { order?: number };
        return { santaId: d.santaId, gifteeId: d.gifteeId };
      });
      setMatches(data);
      setMatchesLoaded(true);
    });

    const unsubConfig = onSnapshot(
      configRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as {
            phase?: AppPhase;
            currentRevealIndex?: number;
            settings?: GlobalSettings;
          };
          if (data.phase) setPhase(data.phase);
          if (data.currentRevealIndex !== undefined) setCurrentRevealIndex(data.currentRevealIndex);
          if (data.settings) {
            setSettings({
              budget: data.settings.budget ?? defaultSettings.budget,
              exchangeDate: data.settings.exchangeDate ?? defaultSettings.exchangeDate,
              isConfigured: data.settings.isConfigured ?? false,
            });
          }
        }
        setConfigLoaded(true);
      },
      (error) => {
        console.error('Error cargando configuración:', error);
        setConfigLoaded(true);
      }
    );

    return () => {
      unsubParticipants();
      unsubMatches();
      unsubConfig();
    };
  }, []);

  useEffect(() => {
    if (participantsLoaded && matchesLoaded && configLoaded) {
      setIsDataLoaded(true);
    }
  }, [participantsLoaded, matchesLoaded, configLoaded]);

  // Actions
  const addParticipant = async (p: Omit<Participant, 'id'>) => {
    await addDoc(collection(db, 'participants'), p);
  };

  const removeParticipant = async (id: string) => {
    await deleteDoc(doc(db, 'participants', id));
  };

  const saveConfiguration = async () => {
    if (!settings.budget) {
      alert('Por favor ingresa un presupuesto.');
      return;
    }
    await setDoc(
      configRef,
      { settings: { ...settings, isConfigured: true }, phase: AppPhase.SETUP },
      { merge: true }
    );
    setSettings({ ...settings, isConfigured: true });
  };

  const editConfiguration = async () => {
    if (!window.confirm('¿Quieres editar la configuración del evento?')) return;
    await setDoc(
      configRef,
      { settings: { ...settings, isConfigured: false }, phase: AppPhase.SETUP },
      { merge: true }
    );
    setSettings({ ...settings, isConfigured: false });
    setPhase(AppPhase.SETUP);
  };

  const startDraw = async () => {
    if (participants.length < 2) {
      alert('Necesitas al menos 2 participantes para jugar.');
      return;
    }

    const shuffled: Participant[] = shuffle(participants);
    const newMatches: Match[] = [];

    for (let i = 0; i < shuffled.length; i++) {
      const santa = shuffled[i];
      const giftee = shuffled[(i + 1) % shuffled.length];
      newMatches.push({
        santaId: santa.id,
        gifteeId: giftee.id,
      });
    }

    const matchesCol = collection(db, 'matches');
    const batch = writeBatch(db);
    const existingMatches = await getDocs(matchesCol);
    existingMatches.forEach((snap) => batch.delete(snap.ref));

    newMatches.forEach((match, index) => {
      const matchRef = doc(matchesCol);
      batch.set(matchRef, { ...match, order: index });
    });

    batch.set(
      configRef,
      {
        phase: AppPhase.REVEAL,
        currentRevealIndex: 0,
        settings: { ...settings, isConfigured: true },
      },
      { merge: true }
    );

    await batch.commit();
  };

  const nextReveal = async () => {
    if (currentRevealIndex < matches.length - 1) {
      const newIndex = currentRevealIndex + 1;
      setCurrentRevealIndex(newIndex);
      await setDoc(configRef, { currentRevealIndex: newIndex }, { merge: true });
    } else {
      setPhase(AppPhase.FINISHED);
      await setDoc(configRef, { phase: AppPhase.FINISHED }, { merge: true });
    }
  };

  const resetGame = async () => {
    if (!window.confirm('¿Seguro que quieres reiniciar? Se borrarán los sorteos y participantes.')) return;

    const batch = writeBatch(db);
    const participantsCol = collection(db, 'participants');
    const matchesCol = collection(db, 'matches');

    const [participantsSnap, matchesSnap] = await Promise.all([
      getDocs(participantsCol),
      getDocs(matchesCol),
    ]);

    participantsSnap.forEach((snap) => batch.delete(snap.ref));
    matchesSnap.forEach((snap) => batch.delete(snap.ref));

    batch.set(configRef, {
      phase: AppPhase.SETUP,
      currentRevealIndex: 0,
      settings: { ...defaultSettings },
    });

    await batch.commit();
    setPhase(AppPhase.SETUP);
    setMatches([]);
    setParticipants([]);
    setSettings({ ...defaultSettings });
    setCurrentRevealIndex(0);
  };

  // Render Helpers
  const getCurrentMatch = () => {
    if (!matches.length || currentRevealIndex >= matches.length) return { santa: null, giftee: null };
    const match = matches[currentRevealIndex];
    const santa = participants.find((p) => p.id === match.santaId) || null;
    const giftee = participants.find((p) => p.id === match.gifteeId) || null;
    return { santa, giftee };
  };

  if (!isDataLoaded) return null; // Prevent flash of default state

  return (
    <div className="min-h-screen bg-[#F1F0E8] text-gray-800 font-sans pb-20 relative">
      <Snowfall />
      
      {/* Header */}
      <header className="bg-christmas-red text-white py-6 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-full shadow-inner">
               <Gift className="w-6 h-6 text-christmas-red" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Amigo Secreto Nuestra Familia</h1>
          </div>
          <div className="flex items-center gap-2">
            {phase !== AppPhase.SETUP && (
              <button onClick={resetGame} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all" title="Reiniciar Sorteo">
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 mt-8 max-w-3xl relative z-10">
        
        {/* SETUP PHASE */}
        {phase === AppPhase.SETUP && (
          <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            
            {/* 1. CONFIGURATION SCREEN (Only visible if NOT configured) */}
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
                        onChange={e => setSettings({...settings, budget: e.target.value})}
                        placeholder="Ej. 100"
                        icon={<span className="text-sm font-bold text-gray-500 font-sans">S/</span>}
                        />
                        <Input 
                        label="Fecha del Intercambio (Opcional)" 
                        type="date"
                        value={settings.exchangeDate} 
                        onChange={e => setSettings({...settings, exchangeDate: e.target.value})}
                        />
                    </div>

                    <Button onClick={saveConfiguration} fullWidth className="text-lg py-4">
                        Crear Evento <ArrowRight className="w-5 h-5" />
                    </Button>
                 </div>
            ) : (
                /* 2. REGISTRATION SCREEN (Visible to guests) */
                <>
                    {/* Small Info Bar for Guests */}
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

                    <ParticipantForm 
                        participants={participants} 
                        onAdd={addParticipant} 
                        onRemove={removeParticipant} 
                    />

                    <div className="sticky bottom-4 z-40 bg-[#F1F0E8]/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-gray-200">
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
                        {participants.length < 2 ? (
                            <p className="text-center text-xs text-gray-500 mt-2">Agrega al menos 2 personas para comenzar.</p>
                        ) : (
                             <p className="text-center text-xs text-christmas-green font-bold mt-2 flex items-center justify-center gap-1">
                                <Check className="w-3 h-3" /> {participants.length} participantes listos
                             </p>
                        )}
                    </div>
                </>
            )}
          </div>
        )}

        {/* REVEAL PHASE */}
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
                  key={matches[currentRevealIndex].santaId} // Key ensures remount/reset state
                  santa={santa} 
                  giftee={giftee} 
                  budget={settings.budget}
                  onAck={nextReveal} 
                />
              );
            })()}
          </div>
        )}

        {/* FINISHED PHASE */}
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
                <Button onClick={() => resetGame()} variant="secondary">
                Organizar Nuevo Sorteo
                </Button>
            </div>
          </div>
        )}

      </main>
      
      {/* Decorative Snow Footer */}
      <div className="fixed bottom-0 left-0 w-full h-2 bg-gradient-to-r from-christmas-green via-emerald-600 to-christmas-green z-50"></div>
    </div>
  );
};

export default App;

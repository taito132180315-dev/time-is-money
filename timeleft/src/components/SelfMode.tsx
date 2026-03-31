import { useState } from 'react';
import { Plus, X, RefreshCw } from 'lucide-react';
import { Milestone, UserProfile } from '../types';
import { calculateMilestoneStats } from '../lib/dateUtils';
import { generateMilestoneComment } from '../services/ai';
import { motion, AnimatePresence } from 'motion/react';
import TiltCard from './TiltCard';

export default function SelfMode({ 
  milestones, 
  saveMilestones,
  userProfile,
  saveUserProfile
}: { 
  milestones: Milestone[], 
  saveMilestones: (m: Milestone[]) => void,
  userProfile: UserProfile | null,
  saveUserProfile: (p: UserProfile) => void
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Milestone>>({ type: 'date' });
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const handleSaveProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const birthDate = fd.get('birthDate') as string;
    if (birthDate) {
      saveUserProfile({ birthDate });
    }
  };

  const handleAdd = async () => {
    if (!formData.name) return;
    if (formData.type === 'age' && !formData.targetAge) return;
    if ((formData.type === 'date' || formData.type === 'event') && !formData.targetDate) return;
    
    const newMs: Milestone = {
      id: Date.now().toString(),
      name: formData.name,
      type: formData.type as any,
      targetDate: formData.targetDate,
      targetAge: formData.targetAge,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setIsAdding(false);
    setFormData({ type: 'date' });
    
    saveMilestones([...milestones, newMs]);
    await updateAiComment(newMs.id, [...milestones, newMs]);
  };

  const updateAiComment = async (id: string, currentMs: Milestone[]) => {
    setIsGenerating(id);
    const ms = currentMs.find(m => m.id === id);
    if (!ms) return;

    const stats = calculateMilestoneStats(ms, userProfile?.birthDate);
    const aiInput = {
      birthDate: userProfile?.birthDate,
      milestone: {
        name: ms.name,
        type: ms.type,
        targetDate: stats.targetDate.toISOString().split('T')[0],
      },
      leftDays: stats.leftDays,
      yearsLeft: stats.yearsLeft,
      monthsLeft: stats.monthsLeft,
      weightOfToday: stats.weightOfToday,
      otherMilestones: currentMs.filter(m => m.id !== id).map(m => {
        const s = calculateMilestoneStats(m, userProfile?.birthDate);
        return { name: m.name, leftDays: s.leftDays };
      })
    };

    const comment = await generateMilestoneComment(aiInput);
    
    const updatedMs = currentMs.map(m => m.id === id ? { ...m, aiComment: comment } : m);
    saveMilestones(updatedMs);
    setIsGenerating(null);
  };

  const handleDelete = (id: string) => {
    saveMilestones(milestones.filter(m => m.id !== id));
  };

  if (!userProfile) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
        className="border border-white/10 bg-[#0a0a0a] p-12 max-w-2xl mx-auto mt-20 rounded-3xl"
      >
        <h2 className="display-text text-5xl md:text-7xl mb-6 text-center">YOUR ORIGIN</h2>
        <p className="editorial-text text-white/60 text-2xl text-center mb-12">
          To measure the weight of your time, we must know when it began.
        </p>
        <form onSubmit={handleSaveProfile} className="space-y-12">
          <div>
            <input 
              type="date" 
              name="birthDate"
              required
              className="w-full bg-white/5 border border-white/20 px-6 py-4 text-3xl text-white focus:outline-none focus:border-[#ff3300] transition-colors [color-scheme:dark] text-center font-sans rounded-2xl"
            />
          </div>
          <button 
            type="submit"
            className="w-full py-6 bg-white text-black hover:bg-[#ff3300] hover:text-white display-text text-3xl transition-colors duration-300 rounded-full"
          >
            START THE CLOCK
          </button>
        </form>
      </motion.div>
    );
  }

  return (
    <div className="space-y-12">
      {milestones.length === 0 && !isAdding && (
        <div className="text-center py-32 editorial-text text-white/40 text-2xl">
          <p>No milestones set.</p>
          <p className="text-base mt-4 font-sans not-italic uppercase tracking-widest">Define the chapters of your life.</p>
        </div>
      )}

      <div className="grid gap-8">
        <AnimatePresence>
          {milestones.map(ms => {
            const stats = calculateMilestoneStats(ms, userProfile.birthDate);
            const weightPercent = (stats.weightOfToday * 100).toFixed(6);
            
            return (
              <motion.div 
                key={ms.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
              >
                <TiltCard progress={stats.progress}>
                  <button 
                    onClick={() => handleDelete(ms.id)}
                    className="absolute -top-4 -right-4 text-white/20 hover:text-[#ff3300] opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-black/50 hover:bg-black/80"
                  >
                    <X size={24} />
                  </button>

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
                    <div>
                      <h3 className="display-text text-6xl md:text-8xl mb-2 leading-none">{ms.name}</h3>
                      <p className="text-sm text-[#ff3300] uppercase tracking-widest">
                        {stats.targetDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-left md:text-right flex flex-col md:items-end gap-2">
                      <div>
                        <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">Days Left</div>
                        <div className="display-text text-7xl md:text-9xl leading-none text-white">
                          {Math.max(0, stats.leftDays).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-left md:text-right mt-4">
                        <div className="text-[10px] text-[#ff3300] uppercase tracking-widest mb-1">Weight of Today</div>
                        <div className="text-xl font-mono text-white/80">{weightPercent}%</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-white/10 relative">
                    {isGenerating === ms.id ? (
                      <div className="flex items-center gap-4 text-[#ff3300] editorial-text text-2xl">
                        <RefreshCw size={24} className="animate-spin" />
                        <span>Formulating thought...</span>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-8">
                        <p className="editorial-text text-2xl md:text-4xl leading-tight text-white/80 max-w-4xl">
                          "{ms.aiComment || '...'}"
                        </p>
                        <button 
                          onClick={() => updateAiComment(ms.id, milestones)}
                          className="text-white/20 hover:text-[#ff3300] p-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 rounded-full hover:bg-white/10"
                          title="Regenerate"
                        >
                          <RefreshCw size={24} />
                        </button>
                      </div>
                    )}
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {!isAdding ? (
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full py-8 border border-white/10 bg-black/50 hover:bg-white hover:text-black transition-colors duration-500 flex items-center justify-center gap-4 group rounded-full"
        >
          <Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" />
          <span className="display-text text-3xl mt-1">ADD MILESTONE</span>
        </button>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-white/10 bg-[#0a0a0a] p-8 md:p-12 space-y-8 rounded-3xl"
        >
          <div className="flex justify-between items-center mb-8">
            <h3 className="display-text text-4xl">NEW MILESTONE</h3>
            <button onClick={() => setIsAdding(false)} className="text-white/40 hover:text-white rounded-full p-2 hover:bg-white/10"><X size={32}/></button>
          </div>
          
          <div className="space-y-8">
            <div>
              <label className="block text-xs text-white/40 mb-2 uppercase tracking-widest">Name (e.g. Turn 30, Start Business)</label>
              <input 
                type="text" 
                className="w-full bg-white/5 border border-white/20 px-6 py-4 text-3xl text-white focus:outline-none focus:border-[#ff3300] transition-colors font-sans rounded-2xl"
                value={formData.name || ''}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Enter milestone..."
              />
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-4 uppercase tracking-widest">Target Type</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, type: 'date', targetAge: undefined})}
                  className={`flex-1 py-4 text-xl display-text border transition-colors rounded-full ${
                    formData.type === 'date' || formData.type === 'event'
                      ? 'bg-white text-black border-white' 
                      : 'bg-transparent border-white/20 text-white/40 hover:text-white'
                  }`}
                >
                  BY DATE
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, type: 'age', targetDate: undefined})}
                  className={`flex-1 py-4 text-xl display-text border transition-colors rounded-full ${
                    formData.type === 'age' 
                      ? 'bg-white text-black border-white' 
                      : 'bg-transparent border-white/20 text-white/40 hover:text-white'
                  }`}
                >
                  BY AGE
                </button>
              </div>
            </div>
            
            {formData.type === 'age' ? (
              <div>
                <label className="block text-xs text-white/40 mb-2 uppercase tracking-widest">Target Age</label>
                <div className="flex items-end gap-4">
                  <input 
                    type="number" 
                    min="0"
                    max="120"
                    className="w-full bg-white/5 border border-white/20 px-6 py-4 text-3xl text-white focus:outline-none focus:border-[#ff3300] transition-colors font-sans rounded-2xl"
                    value={formData.targetAge || ''}
                    onChange={e => setFormData({...formData, targetAge: parseInt(e.target.value)})}
                    placeholder="e.g. 30"
                  />
                  <span className="text-white/40 text-2xl pb-4">years</span>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-white/40 mb-2 uppercase tracking-widest">Target Date</label>
                <input 
                  type="date" 
                  className="w-full bg-white/5 border border-white/20 px-6 py-4 text-3xl text-white focus:outline-none focus:border-[#ff3300] transition-colors [color-scheme:dark] font-sans rounded-2xl"
                  value={formData.targetDate || ''}
                  onChange={e => setFormData({...formData, targetDate: e.target.value})}
                />
              </div>
            )}

            <button 
              onClick={handleAdd}
              disabled={!formData.name || (formData.type === 'age' ? !formData.targetAge : !formData.targetDate)}
              className="w-full py-6 mt-8 bg-white text-black hover:bg-[#ff3300] hover:text-white disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black display-text text-3xl transition-colors duration-300 rounded-full"
            >
              CREATE
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

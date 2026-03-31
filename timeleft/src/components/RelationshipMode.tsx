import { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { CameraControls, Stars, Text, ContactShadows, Float, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Relationship, Plan } from '../types';
import { calculateRelationshipStats } from '../lib/dateUtils';
import { generateRelationshipComment } from '../services/ai';
import { Plus, X, Calendar, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Daisy } from './Daisy';

const PLANET_RADIUS = 10;

function getAvatarPosition(index: number) {
  // Golden ratio spiral for even distribution on a flat disk
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const radius = Math.sqrt(index + 1) * 1.5; // Spread out
  const angle = index * goldenAngle;
  
  const px = radius * Math.cos(angle);
  const pz = radius * Math.sin(angle);
  const py = 0; // Sit on the giant sunflower center
  
  return new THREE.Vector3(px, py, pz);
}

function Avatar({ rel, index, isSelected, onClick }: { rel: Relationship, index: number, isSelected: boolean, onClick: () => void }) {
  const pos = useMemo(() => getAvatarPosition(index), [index]);
  const color = isSelected ? '#ff3300' : '#ffffff';
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle floating/bobbing on the Y axis
      groupRef.current.position.copy(pos).add(new THREE.Vector3(0, Math.sin(state.clock.elapsedTime * 3 + index) * 0.1, 0));
    }
  });

  return (
    <group position={pos} onClick={(e) => { e.stopPropagation(); onClick(); }} ref={groupRef} scale={0.5}>
      <group position={[0, 0.5, 0]}>
        {/* Body */}
        <mesh castShadow position={[0, 0.2, 0]}>
          <capsuleGeometry args={[0.25, 0.4, 16, 32]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        {/* Head */}
        <mesh castShadow position={[0, 0.65, 0]}>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial color={isSelected ? '#ffe0bd' : '#ffcda3'} roughness={0.5} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.12, 0.7, 0.31]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#222" />
        </mesh>
        <mesh position={[0.12, 0.7, 0.31]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#222" />
        </mesh>
        {/* Smile */}
        <mesh position={[0, 0.55, 0.33]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.08, 0.02, 16, 32, Math.PI]} />
          <meshBasicMaterial color="#222" />
        </mesh>
        {/* Sprout/Leaf */}
        <mesh castShadow position={[0, 1.05, 0]}>
          <capsuleGeometry args={[0.05, 0.15, 8, 16]} />
          <meshStandardMaterial color="#2ed573" roughness={0.6} />
        </mesh>

        {/* Name Tag */}
        <Text
          position={[0, 1.6, 0]}
          fontSize={0.3}
          color={isSelected ? '#ff3300' : '#ffffff'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#000000"
        >
          {rel.name.toUpperCase()}
        </Text>
      </group>
    </group>
  );
}

function SunflowerScenery() {
  const { houses, clouds } = useMemo(() => {
    const houseArr = [];
    const cloudArr = [];

    // Generate small houses
    const houseColors = ['#ffb142', '#ff5252', '#34ace0', '#33d9b2', '#ffda79'];
    const roofColors = ['#84817a', '#b33939', '#227093', '#218c74', '#cc8e35'];
    
    for (let i = 0; i < 15; i++) {
      const radius = Math.random() * (PLANET_RADIUS * 0.6);
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const pos = new THREE.Vector3(x, 0, z);
      const scale = 0.6 + Math.random() * 0.5;
      const rotationY = Math.random() * Math.PI * 2;
      const color = houseColors[Math.floor(Math.random() * houseColors.length)];
      const roofColor = roofColors[Math.floor(Math.random() * roofColors.length)];
      
      houseArr.push({ id: i, pos, scale, rotationY, color, roofColor });
    }

    // Generate Clouds
    for (let i = 0; i < 20; i++) {
      const radius = Math.random() * (PLANET_RADIUS * 1.5);
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 5 + Math.random() * 8;

      const pos = new THREE.Vector3(x, y, z);
      const scale = 1 + Math.random() * 2;

      cloudArr.push({ id: i, pos, scale });
    }

    return { houses: houseArr, clouds: cloudArr };
  }, []);

  return (
    <group>
      {/* Tiny Houses */}
      {houses.map(h => (
        <group key={`house-${h.id}`} position={h.pos} rotation={[0, h.rotationY, 0]} scale={h.scale}>
          {/* Base */}
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={h.color} roughness={0.8} />
          </mesh>
          {/* Roof */}
          <mesh position={[0, 1.25, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.9, 0.8, 4]} />
            <meshStandardMaterial color={h.roofColor} roughness={0.9} />
          </mesh>
          {/* Door */}
          <mesh position={[0, 0.3, 0.51]} castShadow>
            <boxGeometry args={[0.3, 0.6, 0.05]} />
            <meshStandardMaterial color="#4a3b32" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Clouds */}
      {clouds.map(c => (
        <group key={`cloud-${c.id}`} position={c.pos} scale={c.scale}>
          <Float speed={1.5} rotationIntensity={0.05} floatIntensity={1}>
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
              <sphereGeometry args={[0.7, 32, 32]} />
              <meshStandardMaterial color="#ffffff" roughness={1} />
            </mesh>
            <mesh position={[0.6, -0.1, 0.2]} castShadow receiveShadow>
              <sphereGeometry args={[0.5, 32, 32]} />
              <meshStandardMaterial color="#ffffff" roughness={1} />
            </mesh>
            <mesh position={[-0.6, -0.15, -0.1]} castShadow receiveShadow>
              <sphereGeometry args={[0.55, 32, 32]} />
              <meshStandardMaterial color="#ffffff" roughness={1} />
            </mesh>
          </Float>
        </group>
      ))}
    </group>
  );
}


function World({ relationships, selectedId, onSelect }: { relationships: Relationship[], selectedId: string | null, onSelect: (id: string | null) => void }) {
  const controlsRef = useRef<CameraControls>(null);

  useEffect(() => {
    if (selectedId && controlsRef.current) {
      const index = relationships.findIndex(r => r.id === selectedId);
      if (index !== -1) {
        const pos = getAvatarPosition(index);
        
        // Position camera slightly above and looking at the avatar
        const camPos = pos.clone().add(new THREE.Vector3(3, 4, 3));
        
        controlsRef.current.setLookAt(camPos.x, camPos.y, camPos.z, pos.x, pos.y, pos.z, true);
      }
    } else if (controlsRef.current) {
      // Reset view to look at the whole island from a slight distance
      controlsRef.current.setLookAt(0, 12, 25, 0, 0, 0, true);
    }
  }, [selectedId, relationships]);

  useFrame((state, delta) => {
    if (!selectedId && controlsRef.current) {
      // Slowly rotate the camera around the island when no one is selected
      controlsRef.current.azimuthAngle -= delta * 0.05;
    }
  });

  return (
    <>
      <color attach="background" args={['#1a0f14']} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0.5} fade speed={1} />
      
      {/* Warm Golden Lighting */}
      <ambientLight intensity={1.5} color="#ffda79" />
      <directionalLight position={[20, 30, 20]} intensity={2} castShadow color="#ffb142">
        <orthographicCamera attach="shadow-camera" args={[-30, 30, 30, -30, 0.1, 100]} />
      </directionalLight>
      <directionalLight position={[-20, 20, -20]} intensity={1.2} color="#ff7f50" />
      <directionalLight position={[0, -20, 20]} intensity={0.5} color="#34ace0" />
      <Environment preset="sunset" />

      <CameraControls ref={controlsRef} makeDefault minDistance={2} maxDistance={40} maxPolarAngle={Math.PI / 2 - 0.1} />

      <group>
        {/* Daisy Island */}
        <Suspense fallback={
          <mesh position={[0, -1, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[PLANET_RADIUS, PLANET_RADIUS * 0.8, 2, 64]} />
            <meshStandardMaterial color="#5c4033" roughness={1} metalness={0} />
          </mesh>
        }>
          <group position={[0, -1, 0]} scale={[10, 10, 10]}>
            <Daisy />
          </group>
        </Suspense>
        
        <SunflowerScenery />

        <group onPointerMissed={() => onSelect(null)}>
          {relationships.map((rel, i) => (
            <Avatar 
              key={rel.id} 
              rel={rel} 
              index={i} 
              isSelected={selectedId === rel.id} 
              onClick={() => onSelect(rel.id)} 
            />
          ))}
        </group>
      </group>

      <ContactShadows position={[0, -1.5, 0]} scale={30} blur={2} far={10} opacity={0.5} />
    </>
  );
}

export default function RelationshipMode({ relationships, saveRelationships }: { relationships: Relationship[], saveRelationships: (r: Relationship[]) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Relationship>>({ context: 'other' });
  const [planData, setPlanData] = useState({ title: '', date: '' });
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const selectedRel = useMemo(() => relationships.find(r => r.id === selectedId), [relationships, selectedId]);

  const handleOpenAdd = () => {
    const today = new Date().toISOString().split('T')[0];
    const tenYears = new Date();
    tenYears.setFullYear(tenYears.getFullYear() + 10);
    const endDate = tenYears.toISOString().split('T')[0];
    
    setFormData({ 
      name: '',
      context: 'other', 
      meetDate: today, 
      endDate: endDate 
    });
    setIsAdding(true);
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.meetDate || !formData.endDate) return;
    
    const newRel: Relationship = {
      id: Date.now().toString(),
      name: formData.name,
      meetDate: formData.meetDate,
      context: formData.context as any,
      endDate: formData.endDate,
      plans: []
    };

    setIsAdding(false);
    setFormData({ context: 'other' });
    saveRelationships([...relationships, newRel]);
    await updateAiComment(newRel.id, [...relationships, newRel]);
  };

  const handleAddPlan = () => {
    if (!selectedRel || !planData.title || !planData.date) return;
    
    const newPlan: Plan = {
      id: Date.now().toString(),
      title: planData.title,
      date: planData.date
    };

    const updatedRels = relationships.map(r => 
      r.id === selectedRel.id 
        ? { ...r, plans: [...(r.plans || []), newPlan].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) } 
        : r
    );
    
    saveRelationships(updatedRels);
    setPlanData({ title: '', date: '' });
  };

  const handleDeletePlan = (planId: string) => {
    if (!selectedRel) return;
    const updatedRels = relationships.map(r => 
      r.id === selectedRel.id 
        ? { ...r, plans: (r.plans || []).filter(p => p.id !== planId) } 
        : r
    );
    saveRelationships(updatedRels);
  };

  const updateAiComment = async (id: string, currentRels: Relationship[]) => {
    setIsGenerating(id);
    const rel = currentRels.find(r => r.id === id);
    if (!rel) return;

    const stats = calculateRelationshipStats(rel);
    const aiInput = {
      name: rel.name,
      meetDate: rel.meetDate,
      context: rel.context,
      endDate: rel.endDate,
      passedDays: stats.passedDays,
      leftDays: stats.leftDays,
      progressPercent: stats.progress
    };

    const comment = await generateRelationshipComment(aiInput);
    
    const updatedRels = currentRels.map(r => r.id === id ? { ...r, aiComment: comment } : r);
    saveRelationships(updatedRels);
    setIsGenerating(null);
  };

  const handleDelete = (id: string) => {
    saveRelationships(relationships.filter(r => r.id !== id));
    setSelectedId(null);
  };

  return (
    <div className="relative w-full h-[70vh] md:h-[80vh] rounded-3xl overflow-hidden border border-white/10 bg-[#050505]">
      {/* 3D Canvas */}
      <div className="absolute inset-0 pointer-events-auto">
        <Canvas shadows camera={{ position: [0, 8, 15], fov: 45, near: 0.01, far: 1000 }}>
          <World relationships={relationships} selectedId={selectedId} onSelect={setSelectedId} />
        </Canvas>
      </div>

      {/* UI Overlay - Top Left */}
      <div className="absolute top-8 left-8 pointer-events-none z-10">
        <h2 className="display-text text-4xl md:text-6xl text-white mix-blend-difference">
          THE GARDEN<br/>OF TIME
        </h2>
        <p className="editorial-text text-white/60 mt-2">Select a soul to view your remaining time.</p>
      </div>

      {/* Add Button - Bottom Left */}
      <div className="absolute bottom-8 left-8 z-10">
        <button 
          onClick={handleOpenAdd}
          className="py-4 px-8 border border-white/20 bg-black/80 backdrop-blur-md hover:bg-white hover:text-black transition-colors duration-500 flex items-center gap-4 group pointer-events-auto rounded-full"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
          <span className="display-text text-2xl mt-1">ADD SOUL</span>
        </button>
      </div>

      {/* Selected Relationship Panel */}
      <AnimatePresence>
        {selectedRel && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 w-full md:w-[480px] h-full bg-[#0a0a0a]/95 backdrop-blur-xl border-l border-white/10 p-8 overflow-y-auto z-20 rounded-l-3xl"
          >
            <button 
              onClick={() => setSelectedId(null)}
              className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors rounded-full p-2 hover:bg-white/10"
            >
              <X size={32} />
            </button>

            <div className="mt-12">
              <h3 className="display-text text-6xl md:text-7xl mb-2 leading-none">{selectedRel.name}</h3>
              <p className="text-sm text-[#ff3300] uppercase tracking-widest mb-12">{selectedRel.context}</p>

              {/* Stats */}
              <div className="mb-12">
                <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">Days Left</div>
                <div className="display-text text-7xl md:text-8xl leading-none text-white">
                  {Math.max(0, calculateRelationshipStats(selectedRel).leftDays).toLocaleString()}
                </div>
                <div className="w-full h-1 bg-white/10 mt-6">
                  <div 
                    className="h-full bg-[#ff3300] transition-all duration-1000"
                    style={{ width: `${calculateRelationshipStats(selectedRel).progress}%` }}
                  />
                </div>
              </div>

              {/* AI Comment */}
              <div className="mb-12 p-6 border border-white/10 bg-white/5 relative group rounded-3xl">
                {isGenerating === selectedRel.id ? (
                  <div className="flex items-center gap-4 text-[#ff3300] editorial-text text-xl">
                    <RefreshCw size={20} className="animate-spin" />
                    <span>Formulating thought...</span>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <p className="editorial-text text-xl leading-relaxed text-white/80">
                      "{selectedRel.aiComment || '...'}"
                    </p>
                    <button 
                      onClick={() => updateAiComment(selectedRel.id, relationships)}
                      className="text-white/20 hover:text-[#ff3300] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 rounded-full p-2 hover:bg-white/10"
                    >
                      <RefreshCw size={20} />
                    </button>
                  </div>
                )}
              </div>

              {/* Plans / Events */}
              <div className="mb-12">
                <h4 className="display-text text-3xl mb-6 flex items-center gap-3">
                  <Calendar size={24} className="text-[#ff3300]" />
                  PLANS & PROMISES
                </h4>
                
                <div className="space-y-4 mb-6">
                  {(selectedRel.plans || []).length === 0 ? (
                    <p className="editorial-text text-white/40">No plans made yet.</p>
                  ) : (
                    (selectedRel.plans || []).map(plan => (
                      <div key={plan.id} className="flex justify-between items-center p-4 border border-white/10 bg-black/50 group rounded-3xl">
                        <div>
                          <p className="font-sans text-lg text-white">{plan.title}</p>
                          <p className="text-xs text-[#ff3300] uppercase tracking-widest mt-1">{plan.date}</p>
                        </div>
                        <button 
                          onClick={() => handleDeletePlan(plan.id)}
                          className="text-white/20 hover:text-[#ff3300] opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-2 hover:bg-white/10"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="New plan..."
                    value={planData.title}
                    onChange={e => setPlanData({...planData, title: e.target.value})}
                    className="flex-1 bg-transparent border border-white/20 px-4 py-2 text-white focus:outline-none focus:border-[#ff3300] font-sans rounded-full"
                  />
                  <input 
                    type="date" 
                    value={planData.date}
                    onChange={e => setPlanData({...planData, date: e.target.value})}
                    className="w-32 bg-transparent border border-white/20 px-4 py-2 text-white focus:outline-none focus:border-[#ff3300] [color-scheme:dark] font-sans text-sm rounded-full"
                  />
                  <button 
                    onClick={handleAddPlan}
                    disabled={!planData.title || !planData.date}
                    className="px-6 bg-white text-black hover:bg-[#ff3300] hover:text-white disabled:opacity-50 transition-colors display-text text-xl rounded-full"
                  >
                    ADD
                  </button>
                </div>
              </div>

              <button 
                onClick={() => handleDelete(selectedRel.id)}
                className="w-full py-4 border border-red-900/50 text-red-500 hover:bg-red-900/20 transition-colors uppercase tracking-widest text-xs rounded-full"
              >
                Remove Relationship
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div 
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.95 }}
              className="w-full max-w-2xl border border-white/10 bg-[#0a0a0a] p-8 md:p-12 rounded-3xl"
            >
              <div className="flex justify-between items-center mb-12">
                <h3 className="display-text text-5xl">NEW SOUL</h3>
                <button onClick={() => setIsAdding(false)} className="text-white/40 hover:text-white rounded-full p-2 hover:bg-white/10"><X size={32}/></button>
              </div>
              
              <div className="space-y-8">
                <div>
                  <label className="block text-xs text-white/40 mb-2 uppercase tracking-widest">Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/5 border border-white/20 px-6 py-4 text-3xl text-white focus:outline-none focus:border-[#ff3300] transition-colors font-sans rounded-2xl"
                    value={formData.name || ''}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter name..."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-xs text-white/40 mb-2 uppercase tracking-widest">Met On</label>
                    <input 
                      type="date" 
                      className="w-full bg-white/5 border border-white/20 px-6 py-4 text-xl text-white focus:outline-none focus:border-[#ff3300] transition-colors [color-scheme:dark] font-sans rounded-2xl"
                      value={formData.meetDate || ''}
                      onChange={e => setFormData({...formData, meetDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-2 uppercase tracking-widest">Expected End Date</label>
                    <input 
                      type="date" 
                      className="w-full bg-white/5 border border-white/20 px-6 py-4 text-xl text-white focus:outline-none focus:border-[#ff3300] transition-colors [color-scheme:dark] font-sans rounded-2xl"
                      value={formData.endDate || ''}
                      onChange={e => setFormData({...formData, endDate: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-2 uppercase tracking-widest">Context</label>
                  <select 
                    className="w-full bg-[#0a0a0a] border border-white/20 px-6 py-4 text-xl text-white focus:outline-none focus:border-[#ff3300] transition-colors font-sans rounded-2xl"
                    value={formData.context || 'other'}
                    onChange={e => setFormData({...formData, context: e.target.value as any})}
                  >
                    <option value="school">School</option>
                    <option value="work">Work</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <button 
                  onClick={handleAdd}
                  disabled={!formData.name || !formData.meetDate || !formData.endDate}
                  className="w-full py-6 mt-8 bg-white text-black hover:bg-[#ff3300] hover:text-white disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black display-text text-3xl transition-colors duration-300 rounded-full"
                >
                  MANIFEST
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

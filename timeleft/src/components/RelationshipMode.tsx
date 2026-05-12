import { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { CameraControls, Stars, Text, ContactShadows, Environment, Billboard, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Relationship, Plan, AvatarCustomization } from '../types';
import { calculateRelationshipStats } from '../lib/dateUtils';
import { generateRelationshipComment } from '../services/ai';
import { Plus, X, Calendar, RefreshCw, Shuffle, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Daisy } from './Daisy';
import { Butterflies } from './Butterflies';

const PLANET_RADIUS = 10;

// ─── Palettes ─────────────────────────────────────────────────────────────────

const SKIN_COLORS = [
  { id: 'pale',   color: '#fde8d0' },
  { id: 'light',  color: '#f5c9a0' },
  { id: 'medium', color: '#d4956a' },
  { id: 'tan',    color: '#c07a45' },
  { id: 'dark',   color: '#8d5524' },
  { id: 'deep',   color: '#5c3317' },
];
const HAIR_COLORS = [
  { id: 'black',     color: '#1a1a1a' },
  { id: 'darkbrown', color: '#2c1810' },
  { id: 'brown',     color: '#5c3317' },
  { id: 'blonde',    color: '#d4a017' },
  { id: 'auburn',    color: '#8b2500' },
  { id: 'silver',    color: '#a8a8b8' },
  { id: 'blue',      color: '#1a3a8b' },
  { id: 'pink',      color: '#d45090' },
];
const EYE_COLORS = [
  { id: 'black',  color: '#111111' },
  { id: 'brown',  color: '#5c2d0a' },
  { id: 'blue',   color: '#1a5fa8' },
  { id: 'green',  color: '#1a7a2a' },
  { id: 'amber',  color: '#b5651d' },
  { id: 'purple', color: '#5a1a8b' },
];
const OUTFIT_COLORS = [
  { id: 'blue',   color: '#4a8fe8' },
  { id: 'pink',   color: '#e8527a' },
  { id: 'red',    color: '#e83a3a' },
  { id: 'green',  color: '#3aa855' },
  { id: 'purple', color: '#8a3ae8' },
  { id: 'orange', color: '#e87a2a' },
  { id: 'teal',   color: '#2ab8a0' },
  { id: 'yellow', color: '#d4b000' },
  { id: 'black',  color: '#2a2a2a' },
  { id: 'white',  color: '#d8d8d8' },
];
const HAIR_STYLES_MALE   = [
  { id: 'short', label: 'ショート' },
  { id: 'spiky', label: 'スパイキー' },
  { id: 'long',  label: 'ロング' },
  { id: 'bald',  label: '坊主' },
];
const HAIR_STYLES_FEMALE = [
  { id: 'bob',   label: 'ボブ' },
  { id: 'long',  label: 'ロング' },
  { id: 'twin',  label: 'ツイン' },
  { id: 'pixie', label: 'ショート' },
  { id: 'bun',   label: 'お団子' },
];

const DEFAULT_AVATAR_MALE: AvatarCustomization = {
  skinColor: '#f5c9a0', hairStyle: 'short', hairColor: '#2c1810',
  outfitColor: '#4a8fe8', eyeColor: '#111111',
};
const DEFAULT_AVATAR_FEMALE: AvatarCustomization = {
  skinColor: '#f5c9a0', hairStyle: 'bob', hairColor: '#2c1810',
  outfitColor: '#e8527a', eyeColor: '#111111',
};

function randomizeAvatar(gender: 'male' | 'female'): AvatarCustomization {
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const styles = gender === 'female' ? HAIR_STYLES_FEMALE : HAIR_STYLES_MALE;
  return {
    skinColor:   pick(SKIN_COLORS).color,
    hairColor:   pick(HAIR_COLORS).color,
    eyeColor:    pick(EYE_COLORS).color,
    outfitColor: pick(OUTFIT_COLORS).color,
    hairStyle:   pick(styles).id,
  };
}

function getAvatarPosition(index: number) {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const radius = 20 + Math.sqrt(index + 1) * 2;
  const angle = index * goldenAngle;
  return new THREE.Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle));
}

// ─── Portrait Card (photo billboard) ─────────────────────────────────────────

function PortraitTexture({ url, isSelected }: { url: string; isSelected: boolean }) {
  const texture = useTexture(url);
  return (
    <Billboard>
      {/* Photo circle */}
      <mesh>
        <circleGeometry args={[1.1, 64]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* Outer ring */}
      <mesh position={[0, 0, -0.01]}>
        <ringGeometry args={[1.1, 1.24, 64]} />
        <meshBasicMaterial color={isSelected ? '#ff3300' : '#ffffff'} transparent opacity={isSelected ? 1 : 0.75} />
      </mesh>
      {/* Selection glow */}
      {isSelected && (
        <mesh position={[0, 0, -0.03]}>
          <ringGeometry args={[1.1, 1.55, 64]} />
          <meshBasicMaterial color="#ff3300" transparent opacity={0.25} />
        </mesh>
      )}
    </Billboard>
  );
}

function PortraitCard({ url, isSelected }: { url: string; isSelected: boolean }) {
  return (
    <Suspense fallback={
      <Billboard>
        <mesh>
          <circleGeometry args={[1.1, 64]} />
          <meshBasicMaterial color="#333" />
        </mesh>
      </Billboard>
    }>
      <PortraitTexture url={url} isSelected={isSelected} />
    </Suspense>
  );
}

// ─── HairMesh ─────────────────────────────────────────────────────────────────

function HairMesh({ gender, style, color }: { gender: 'male' | 'female'; style: string; color: string }) {
  if (style === 'bald') return null;
  const mat = <meshStandardMaterial color={color} roughness={0.8} />;
  const backCap = (
    <mesh position={[0, 0.04, -0.06]} scale={[0.98, 0.88, 0.72]}>
      <sphereGeometry args={[0.38, 32, 32]} />{mat}
    </mesh>
  );
  if (gender === 'male') {
    if (style === 'short') return (<>{backCap}
      <mesh position={[0, 0.32, 0.08]} scale={[0.9, 0.28, 0.62]}><sphereGeometry args={[0.5, 32, 32]} />{mat}</mesh>
      <mesh position={[0, 0.29, 0.22]} scale={[0.55, 0.18, 0.32]}><sphereGeometry args={[0.5, 16, 16]} />{mat}</mesh>
    </>);
    if (style === 'spiky') return (<>{backCap}
      {[[0,0.55,0.08,0.13,0.40,0.13],[-0.19,0.50,0.06,0.11,0.34,0.11],[0.19,0.50,0.06,0.11,0.34,0.11],[-0.09,0.52,0.19,0.10,0.30,0.10],[0.09,0.52,0.19,0.10,0.30,0.10],[0,0.38,0.24,0.08,0.22,0.08]].map(([x,y,z,sx,sy,sz],i)=>(
        <mesh key={i} position={[x,y,z] as any} scale={[sx,sy,sz] as any}><sphereGeometry args={[0.5,16,16]}/>{mat}</mesh>
      ))}
    </>);
    if (style === 'long') return (<>{backCap}
      <mesh position={[0,0.32,0.08]} scale={[0.9,0.28,0.62]}><sphereGeometry args={[0.5,32,32]}/>{mat}</mesh>
      <mesh position={[0,-0.42,-0.08]} scale={[0.85,0.92,0.40]}><sphereGeometry args={[0.5,16,16]}/>{mat}</mesh>
      <mesh position={[-0.30,-0.12,0.04]} scale={[0.28,0.66,0.24]}><sphereGeometry args={[1,16,16]}/>{mat}</mesh>
      <mesh position={[0.30,-0.12,0.04]} scale={[0.28,0.66,0.24]}><sphereGeometry args={[1,16,16]}/>{mat}</mesh>
    </>);
  }
  if (style === 'bob') return (<>{backCap}
    <mesh position={[-0.31,-0.11,0.04]} scale={[0.32,0.52,0.28]}><sphereGeometry args={[1,16,16]}/>{mat}</mesh>
    <mesh position={[0.31,-0.11,0.04]} scale={[0.32,0.52,0.28]}><sphereGeometry args={[1,16,16]}/>{mat}</mesh>
    <mesh position={[0,-0.26,0.02]} scale={[0.76,0.25,0.50]}><sphereGeometry args={[0.5,16,16]}/>{mat}</mesh>
  </>);
  if (style === 'long') return (<>{backCap}
    <mesh position={[0,-0.55,-0.05]} scale={[0.82,1.1,0.38]}><sphereGeometry args={[0.5,16,16]}/>{mat}</mesh>
    <mesh position={[-0.30,-0.12,0.10]} scale={[0.25,0.72,0.22]}><sphereGeometry args={[1,16,16]}/>{mat}</mesh>
    <mesh position={[0.30,-0.12,0.10]} scale={[0.25,0.72,0.22]}><sphereGeometry args={[1,16,16]}/>{mat}</mesh>
  </>);
  if (style === 'twin') return (<>{backCap}
    <mesh position={[0,0.28,0.05]} scale={[0.88,0.22,0.60]}><sphereGeometry args={[0.5,16,16]}/>{mat}</mesh>
    <mesh position={[-0.38,0.02,0]}><sphereGeometry args={[0.09,12,12]}/>{mat}</mesh>
    <mesh position={[0.38,0.02,0]}><sphereGeometry args={[0.09,12,12]}/>{mat}</mesh>
    <mesh position={[-0.46,-0.28,0]} rotation={[0,0,0.30]}><capsuleGeometry args={[0.09,0.48,8,16]}/>{mat}</mesh>
    <mesh position={[0.46,-0.28,0]} rotation={[0,0,-0.30]}><capsuleGeometry args={[0.09,0.48,8,16]}/>{mat}</mesh>
  </>);
  if (style === 'pixie') return (<>{backCap}
    <mesh position={[0,0.22,0.05]} scale={[0.92,0.20,0.68]}><sphereGeometry args={[0.5,32,32]}/>{mat}</mesh>
    <mesh position={[0,0.18,0.20]} scale={[0.60,0.16,0.30]}><sphereGeometry args={[0.5,16,16]}/>{mat}</mesh>
  </>);
  if (style === 'bun') return (<>{backCap}
    <mesh position={[0,0.20,0.04]} scale={[0.92,0.20,0.65]}><sphereGeometry args={[0.5,16,16]}/>{mat}</mesh>
    <mesh position={[0,0.50,-0.02]} scale={[1,0.82,1]}><sphereGeometry args={[0.22,24,24]}/>{mat}</mesh>
  </>);
  return null;
}

// ─── MiiCharacterMesh ─────────────────────────────────────────────────────────

function MiiCharacterMesh({ gender, avatar, isSelected }: { gender: 'male' | 'female'; avatar: AvatarCustomization; isSelected: boolean }) {
  const shirtColor = isSelected ? '#ff3300' : avatar.outfitColor;
  const { skinColor, hairColor, eyeColor } = avatar;
  const lowerColor = gender === 'female' ? '#f0f0f0' : '#3a3a4a';
  const shoeColor  = gender === 'female' ? '#e8e8e8' : '#222233';
  return (
    <group>
      {gender === 'male' ? (<>
        <mesh position={[0,0.44,0]}><capsuleGeometry args={[0.25,0.32,16,32]}/><meshStandardMaterial color={lowerColor} roughness={0.8}/></mesh>
        <mesh position={[-0.13,0.16,0]}><capsuleGeometry args={[0.10,0.20,8,16]}/><meshStandardMaterial color={lowerColor} roughness={0.8}/></mesh>
        <mesh position={[0.13,0.16,0]}><capsuleGeometry args={[0.10,0.20,8,16]}/><meshStandardMaterial color={lowerColor} roughness={0.8}/></mesh>
      </>) : (
        <mesh position={[0,0.37,0]}><cylinderGeometry args={[0.30,0.38,0.44,32]}/><meshStandardMaterial color={lowerColor} roughness={0.8}/></mesh>
      )}
      <mesh position={[-0.15,0.04,0.06]} scale={[1,0.55,1.5]}><sphereGeometry args={[0.11,16,16]}/><meshStandardMaterial color={shoeColor} roughness={0.7}/></mesh>
      <mesh position={[0.15,0.04,0.06]} scale={[1,0.55,1.5]}><sphereGeometry args={[0.11,16,16]}/><meshStandardMaterial color={shoeColor} roughness={0.7}/></mesh>
      <mesh castShadow position={[0,0.90,0]}><capsuleGeometry args={[0.28,0.42,16,32]}/><meshStandardMaterial color={shirtColor} roughness={0.7}/></mesh>
      <mesh position={[-0.40,0.88,0]}><capsuleGeometry args={[0.10,0.36,8,16]}/><meshStandardMaterial color={shirtColor} roughness={0.7}/></mesh>
      <mesh position={[0.40,0.88,0]}><capsuleGeometry args={[0.10,0.36,8,16]}/><meshStandardMaterial color={shirtColor} roughness={0.7}/></mesh>
      <mesh position={[-0.40,0.61,0]}><sphereGeometry args={[0.12,16,16]}/><meshStandardMaterial color={skinColor} roughness={0.6}/></mesh>
      <mesh position={[0.40,0.61,0]}><sphereGeometry args={[0.12,16,16]}/><meshStandardMaterial color={skinColor} roughness={0.6}/></mesh>
      <mesh position={[0,1.34,0]}><cylinderGeometry args={[0.14,0.17,0.14,16]}/><meshStandardMaterial color={skinColor} roughness={0.6}/></mesh>
      <mesh castShadow position={[0,1.68,0]}><sphereGeometry args={[0.36,32,32]}/><meshStandardMaterial color={skinColor} roughness={0.55}/></mesh>
      <group position={[0,1.68,0]}><HairMesh gender={gender} style={avatar.hairStyle} color={hairColor}/></group>
      <mesh position={[-0.14,1.72,0.30]}><sphereGeometry args={[0.075,24,24]}/><meshBasicMaterial color="white"/></mesh>
      <mesh position={[0.14,1.72,0.30]}><sphereGeometry args={[0.075,24,24]}/><meshBasicMaterial color="white"/></mesh>
      <mesh position={[-0.14,1.72,0.36]}><sphereGeometry args={[0.055,16,16]}/><meshBasicMaterial color={eyeColor}/></mesh>
      <mesh position={[0.14,1.72,0.36]}><sphereGeometry args={[0.055,16,16]}/><meshBasicMaterial color={eyeColor}/></mesh>
      <mesh position={[-0.11,1.748,0.40]}><sphereGeometry args={[0.018,12,12]}/><meshBasicMaterial color="white"/></mesh>
      <mesh position={[0.17,1.748,0.40]}><sphereGeometry args={[0.018,12,12]}/><meshBasicMaterial color="white"/></mesh>
      <mesh position={[-0.14,1.83,0.27]} rotation={[0.5,0,0.15]} scale={[1.2,0.4,0.5]}><capsuleGeometry args={[0.025,0.08,4,8]}/><meshBasicMaterial color={hairColor}/></mesh>
      <mesh position={[0.14,1.83,0.27]} rotation={[0.5,0,-0.15]} scale={[1.2,0.4,0.5]}><capsuleGeometry args={[0.025,0.08,4,8]}/><meshBasicMaterial color={hairColor}/></mesh>
      <mesh position={[0,1.63,0.34]}><sphereGeometry args={[0.04,16,16]}/><meshStandardMaterial color={skinColor} roughness={0.7}/></mesh>
      <mesh position={[0,1.55,0.33]} rotation={[Math.PI/2,0,0]} scale={[1,1,0.6]}><torusGeometry args={[0.07,0.018,8,24,Math.PI]}/><meshBasicMaterial color="#333"/></mesh>
      {gender === 'female' && (<>
        <mesh position={[-0.14,1.80,0.28]} rotation={[0.4,0,0]}><torusGeometry args={[0.072,0.012,6,16,Math.PI]}/><meshBasicMaterial color="#222"/></mesh>
        <mesh position={[0.14,1.80,0.28]} rotation={[0.4,0,0]}><torusGeometry args={[0.072,0.012,6,16,Math.PI]}/><meshBasicMaterial color="#222"/></mesh>
        <mesh position={[-0.26,1.62,0.25]} scale={[1.6,1,0.25]}><sphereGeometry args={[0.065,16,16]}/><meshStandardMaterial color="#f4a0a8" transparent opacity={0.55} roughness={1}/></mesh>
        <mesh position={[0.26,1.62,0.25]} scale={[1.6,1,0.25]}><sphereGeometry args={[0.065,16,16]}/><meshStandardMaterial color="#f4a0a8" transparent opacity={0.55} roughness={1}/></mesh>
      </>)}
    </group>
  );
}

// ─── Preview scene (form modal) ───────────────────────────────────────────────

function PreviewScene({ gender, avatar, photo }: { gender: 'male' | 'female'; avatar: AvatarCustomization; photo?: string }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current && !photo) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.6;
    }
  });
  return (
    <>
      <ambientLight intensity={2.5} color="#ffeecc" />
      <directionalLight position={[4, 8, 5]} intensity={2.5} color="#fff" />
      <directionalLight position={[-4, 4, -4]} intensity={0.8} color="#aaccff" />
      {photo ? (
        <group scale={1.6}>
          <PortraitCard url={photo} isSelected={false} />
        </group>
      ) : (
        <group ref={groupRef} position={[0, -1.0, 0]} scale={0.9}>
          <MiiCharacterMesh gender={gender} avatar={avatar} isSelected={false} />
        </group>
      )}
    </>
  );
}

// ─── World Avatar ─────────────────────────────────────────────────────────────

function Avatar({ rel, index, isSelected, onClick }: { rel: Relationship; index: number; isSelected: boolean; onClick: () => void }) {
  const pos = useMemo(() => getAvatarPosition(index), [index]);
  const groupRef = useRef<THREE.Group>(null);
  const gender = rel.gender || 'male';
  const avatar = rel.avatar || (gender === 'female' ? DEFAULT_AVATAR_FEMALE : DEFAULT_AVATAR_MALE);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.copy(pos).add(new THREE.Vector3(0, Math.sin(state.clock.elapsedTime * 2 + index) * 0.15, 0));
    }
  });

  const nameY = rel.photo ? -1.7 : 1.25;

  return (
    <group position={pos} onClick={(e) => { e.stopPropagation(); onClick(); }} ref={groupRef}>
      {rel.photo ? (
        <PortraitCard url={rel.photo} isSelected={isSelected} />
      ) : (
        <group scale={0.5}>
          <MiiCharacterMesh gender={gender} avatar={avatar} isSelected={isSelected} />
        </group>
      )}
      <Text
        position={[0, nameY, 0]}
        fontSize={0.35}
        color={isSelected ? '#ff3300' : '#ffffff'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        {rel.name.toUpperCase()}
      </Text>
    </group>
  );
}

// ─── World scene ──────────────────────────────────────────────────────────────

function World({ relationships, selectedId, onSelect, onButterflyClick }: { relationships: Relationship[]; selectedId: string | null; onSelect: (id: string | null) => void; onButterflyClick: () => void }) {
  const controlsRef = useRef<CameraControls>(null);

  useEffect(() => {
    if (selectedId && controlsRef.current) {
      const index = relationships.findIndex(r => r.id === selectedId);
      if (index !== -1) {
        const pos = getAvatarPosition(index);
        const camPos = pos.clone().add(new THREE.Vector3(8, 6, 8));
        controlsRef.current.setLookAt(camPos.x, camPos.y, camPos.z, pos.x, pos.y, pos.z, true);
      }
    } else if (controlsRef.current) {
      controlsRef.current.setLookAt(0, 30, 60, 0, 0, 0, true);
    }
  }, [selectedId, relationships]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.mouseButtons.right = 2;
      controlsRef.current.mouseButtons.middle = 2;
      controlsRef.current.touches.two = 768;
    }
  }, []);

  return (
    <>
      <color attach="background" args={['#1a0f14']} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0.5} fade speed={1} />
      <ambientLight intensity={1.5} color="#ffda79" />
      <directionalLight position={[20, 30, 20]} intensity={2} castShadow color="#ffb142">
        <orthographicCamera attach="shadow-camera" args={[-30, 30, 30, -30, 0.1, 100]} />
      </directionalLight>
      <directionalLight position={[-20, 20, -20]} intensity={1.2} color="#ff7f50" />
      <directionalLight position={[0, -20, 20]} intensity={0.5} color="#34ace0" />
      <Environment preset="sunset" />
      <CameraControls ref={controlsRef} makeDefault minDistance={5} maxDistance={200} maxPolarAngle={Math.PI / 2} />
      <group>
        <Suspense fallback={
          <mesh position={[0, -1, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[PLANET_RADIUS, PLANET_RADIUS * 0.8, 2, 64]} />
            <meshStandardMaterial color="#5c4033" roughness={1} metalness={0} />
          </mesh>
        }>
          <group position={[0, -1, 0]} scale={[10, 10, 10]}><Daisy /></group>
        </Suspense>
        <Butterflies count={5} onButterflyClick={onButterflyClick} />
        <group onPointerMissed={() => onSelect(null)}>
          {relationships.map((rel, i) => (
            <Avatar key={rel.id} rel={rel} index={i} isSelected={selectedId === rel.id} onClick={() => onSelect(rel.id)} />
          ))}
        </group>
      </group>
      <ContactShadows position={[0, -1.5, 0]} scale={30} blur={2} far={10} opacity={0.5} />
    </>
  );
}

// ─── Customization UI helpers ─────────────────────────────────────────────────

function ColorSwatches({ label, options, value, onChange }: { label: string; options: { id: string; color: string }[]; value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <p className="text-xs text-white/40 mb-2 uppercase tracking-widest">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt.id} type="button" onClick={() => onChange(opt.color)}
            className={`w-7 h-7 rounded-full border-2 transition-all duration-150 ${value === opt.color ? 'border-[#ff3300] scale-125' : 'border-white/20 hover:border-white/50 hover:scale-110'}`}
            style={{ backgroundColor: opt.color }}
          />
        ))}
      </div>
    </div>
  );
}

function StyleButtons({ label, options, value, onChange }: { label: string; options: { id: string; label: string }[]; value: string; onChange: (s: string) => void }) {
  return (
    <div>
      <p className="text-xs text-white/40 mb-2 uppercase tracking-widest">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt.id} type="button" onClick={() => onChange(opt.id)}
            className={`px-3 py-1 rounded-full border text-sm transition-all duration-150 ${value === opt.id ? 'border-[#ff3300] bg-white/10 text-white' : 'border-white/20 text-white/40 hover:text-white/70'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RelationshipMode({ relationships, saveRelationships }: { relationships: Relationship[]; saveRelationships: (r: Relationship[]) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState(false);

  useEffect(() => {
    if (showVideo) setVideoLoadError(false);
  }, [showVideo]);
  const [formData, setFormData] = useState<Partial<Relationship>>({ context: 'other' });
  const [planData, setPlanData] = useState({ title: '', date: '' });
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const selectedRel = useMemo(() => relationships.find(r => r.id === selectedId), [relationships, selectedId]);

  const currentGender = (formData.gender || 'male') as 'male' | 'female';
  const currentAvatar: AvatarCustomization = formData.avatar || (currentGender === 'female' ? DEFAULT_AVATAR_FEMALE : DEFAULT_AVATAR_MALE);

  const setAvatar = (patch: Partial<AvatarCustomization>) =>
    setFormData(f => ({ ...f, avatar: { ...currentAvatar, ...patch } }));

  const handleOpenAdd = () => {
    const today = new Date().toISOString().split('T')[0];
    const tenYears = new Date();
    tenYears.setFullYear(tenYears.getFullYear() + 10);
    setFormData({ name: '', gender: 'male', avatar: { ...DEFAULT_AVATAR_MALE }, context: 'other', meetDate: today, endDate: tenYears.toISOString().split('T')[0] });
    setIsAdding(true);
  };

  const handleGenderChange = (g: 'male' | 'female') => {
    const defaults = g === 'female' ? DEFAULT_AVATAR_FEMALE : DEFAULT_AVATAR_MALE;
    setFormData(f => ({ ...f, gender: g, avatar: { ...defaults } }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setFormData(f => ({ ...f, photo: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.meetDate || !formData.endDate) return;
    const newRel: Relationship = {
      id: Date.now().toString(),
      name: formData.name,
      photo: formData.photo,
      gender: formData.gender as any,
      avatar: formData.avatar,
      meetDate: formData.meetDate,
      context: formData.context as any,
      endDate: formData.endDate,
      plans: [],
    };
    setIsAdding(false);
    setFormData({ context: 'other' });
    saveRelationships([...relationships, newRel]);
    await updateAiComment(newRel.id, [...relationships, newRel]);
  };

  const handleAddPlan = () => {
    if (!selectedRel || !planData.title || !planData.date) return;
    const newPlan: Plan = { id: Date.now().toString(), title: planData.title, date: planData.date };
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
    saveRelationships(relationships.map(r =>
      r.id === selectedRel.id ? { ...r, plans: (r.plans || []).filter(p => p.id !== planId) } : r
    ));
  };

  const updateAiComment = async (id: string, currentRels: Relationship[]) => {
    setIsGenerating(id);
    const rel = currentRels.find(r => r.id === id);
    if (!rel) return;
    const stats = calculateRelationshipStats(rel);
    const comment = await generateRelationshipComment({
      name: rel.name, meetDate: rel.meetDate, context: rel.context,
      endDate: rel.endDate, passedDays: stats.passedDays,
      leftDays: stats.leftDays, progressPercent: stats.progress,
    });
    saveRelationships(currentRels.map(r => r.id === id ? { ...r, aiComment: comment } : r));
    setIsGenerating(null);
  };

  const handleDelete = (id: string) => {
    saveRelationships(relationships.filter(r => r.id !== id));
    setSelectedId(null);
  };

  return (
    <div className="relative w-full h-[70vh] md:h-[80vh] rounded-3xl overflow-hidden border border-white/10 bg-[#050505]">
      <div className="absolute inset-0 pointer-events-auto">
        <Canvas shadows camera={{ position: [0, 8, 15], fov: 45, near: 0.01, far: 1000 }}>
          <World relationships={relationships} selectedId={selectedId} onSelect={setSelectedId} onButterflyClick={() => setShowVideo(true)} />
        </Canvas>
      </div>

      <div className="absolute top-8 left-8 pointer-events-none z-10">
        <h2 className="display-text text-4xl md:text-6xl text-white mix-blend-difference">THE GARDEN<br/>OF TIME</h2>
        <p className="editorial-text text-white/60 mt-2">Select a soul to view your remaining time.</p>
      </div>

      <div className="absolute bottom-8 left-8 z-10">
        <button onClick={handleOpenAdd} className="py-4 px-8 border border-white/20 bg-black/80 backdrop-blur-md hover:bg-white hover:text-black transition-colors duration-500 flex items-center gap-4 group pointer-events-auto rounded-full">
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
          <span className="display-text text-2xl mt-1">ADD SOUL</span>
        </button>
      </div>

      {/* Video modal */}
      <AnimatePresence>
        {showVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
            className="fixed inset-0 z-[9999] bg-black"
            onClick={() => setShowVideo(false)}
          >
            {videoLoadError ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-8 text-center text-white/80 editorial-text">
                <p>動画を読み込めませんでした。</p>
                <p className="max-w-lg text-sm text-white/50">
                  次のファイルを置いてから開発サーバーを再起動してください。
                  <br />
                  <code className="mt-2 inline-block rounded bg-white/10 px-2 py-1 text-white/90">timeleft/public/butterfly-video.mp4</code>
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowVideo(false); }}
                  className="mt-4 rounded-full border border-white/30 px-6 py-2 text-white hover:bg-white/10"
                >
                  閉じる
                </button>
              </div>
            ) : (
              <video
                src="/butterfly-video.mp4"
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                onEnded={() => setShowVideo(false)}
                onError={() => setVideoLoadError(true)}
                ref={(el) => {
                  if (el) el.playbackRate = 1.75;
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected panel */}
      <AnimatePresence>
        {selectedRel && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 w-full md:w-[480px] h-full bg-[#0a0a0a]/95 backdrop-blur-xl border-l border-white/10 p-8 overflow-y-auto z-20 rounded-l-3xl"
          >
            <button onClick={() => setSelectedId(null)} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors rounded-full p-2 hover:bg-white/10"><X size={32}/></button>
            <div className="mt-12">
              {/* Photo header */}
              {selectedRel.photo && (
                <div className="flex justify-center mb-8">
                  <img src={selectedRel.photo} className="w-24 h-24 rounded-full object-cover border-2 border-white/20" />
                </div>
              )}
              <h3 className="display-text text-6xl md:text-7xl mb-2 leading-none">{selectedRel.name}</h3>
              <p className="text-sm text-[#ff3300] uppercase tracking-widest mb-12">{selectedRel.context}</p>
              <div className="mb-12">
                <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">Days Left</div>
                <div className="display-text text-7xl md:text-8xl leading-none text-white">
                  {Math.max(0, calculateRelationshipStats(selectedRel).leftDays).toLocaleString()}
                </div>
                <div className="w-full h-1 bg-white/10 mt-6">
                  <div className="h-full bg-[#ff3300] transition-all duration-1000" style={{ width: `${calculateRelationshipStats(selectedRel).progress}%` }} />
                </div>
              </div>
              <div className="mb-12 p-6 border border-white/10 bg-white/5 relative group rounded-3xl">
                {isGenerating === selectedRel.id ? (
                  <div className="flex items-center gap-4 text-[#ff3300] editorial-text text-xl"><RefreshCw size={20} className="animate-spin"/><span>Formulating thought...</span></div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <p className="editorial-text text-xl leading-relaxed text-white/80">"{selectedRel.aiComment || '...'}"</p>
                    <button onClick={() => updateAiComment(selectedRel.id, relationships)} className="text-white/20 hover:text-[#ff3300] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 rounded-full p-2 hover:bg-white/10"><RefreshCw size={20}/></button>
                  </div>
                )}
              </div>
              <div className="mb-12">
                <h4 className="display-text text-3xl mb-6 flex items-center gap-3"><Calendar size={24} className="text-[#ff3300]"/>PLANS & PROMISES</h4>
                <div className="space-y-4 mb-6">
                  {(selectedRel.plans || []).length === 0 ? (
                    <p className="editorial-text text-white/40">No plans made yet.</p>
                  ) : (selectedRel.plans || []).map(plan => (
                    <div key={plan.id} className="flex justify-between items-center p-4 border border-white/10 bg-black/50 group rounded-3xl">
                      <div>
                        <p className="font-sans text-lg text-white">{plan.title}</p>
                        <p className="text-xs text-[#ff3300] uppercase tracking-widest mt-1">{plan.date}</p>
                      </div>
                      <button onClick={() => handleDeletePlan(plan.id)} className="text-white/20 hover:text-[#ff3300] opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-2 hover:bg-white/10"><X size={16}/></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="New plan..." value={planData.title} onChange={e => setPlanData({...planData, title: e.target.value})} className="flex-1 bg-transparent border border-white/20 px-4 py-2 text-white focus:outline-none focus:border-[#ff3300] font-sans rounded-full"/>
                  <input type="date" value={planData.date} onChange={e => setPlanData({...planData, date: e.target.value})} className="w-32 bg-transparent border border-white/20 px-4 py-2 text-white focus:outline-none focus:border-[#ff3300] [color-scheme:dark] font-sans text-sm rounded-full"/>
                  <button onClick={handleAddPlan} disabled={!planData.title || !planData.date} className="px-6 bg-white text-black hover:bg-[#ff3300] hover:text-white disabled:opacity-50 transition-colors display-text text-xl rounded-full">ADD</button>
                </div>
              </div>
              <button onClick={() => handleDelete(selectedRel.id)} className="w-full py-4 border border-red-900/50 text-red-500 hover:bg-red-900/20 transition-colors uppercase tracking-widest text-xs rounded-full">Remove Relationship</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ADD MODAL ── */}
      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 py-8 pointer-events-auto"
          >
            <motion.div initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 50, scale: 0.95 }}
              className="w-full max-w-5xl border border-white/10 bg-[#0a0a0a] rounded-3xl overflow-hidden"
            >
              <div className="flex justify-between items-center px-8 pt-8 pb-4">
                <h3 className="display-text text-5xl">NEW SOUL</h3>
                <button onClick={() => setIsAdding(false)} className="text-white/40 hover:text-white rounded-full p-2 hover:bg-white/10"><X size={32}/></button>
              </div>

              <div className="flex flex-col md:flex-row gap-0">
                {/* Left: preview */}
                <div className="md:w-64 lg:w-72 shrink-0 flex flex-col items-center bg-white/3 border-r border-white/10">
                  <div className="w-full h-64 md:h-80">
                    <Canvas camera={{ position: [0, 1.2, 3.6], fov: 38 }} gl={{ antialias: true }}>
                      <PreviewScene gender={currentGender} avatar={currentAvatar} photo={formData.photo} />
                    </Canvas>
                  </div>
                  {!formData.photo && (
                    <button type="button" onClick={() => setFormData(f => ({ ...f, avatar: randomizeAvatar(currentGender) }))}
                      className="mb-6 flex items-center gap-2 px-5 py-2 border border-white/20 rounded-full text-white/60 hover:text-white hover:border-white/50 transition-colors text-sm"
                    >
                      <Shuffle size={14}/>RANDOMIZE
                    </button>
                  )}
                </div>

                {/* Right: form */}
                <div className="flex-1 p-8 space-y-6 overflow-y-auto max-h-[70vh] md:max-h-none">

                  {/* Photo upload */}
                  <div>
                    <label className="block text-xs text-white/40 mb-3 uppercase tracking-widest">Photo <span className="text-white/25 normal-case tracking-normal">(optional — makes it look real)</span></label>
                    {formData.photo ? (
                      <div className="flex items-center gap-4">
                        <img src={formData.photo} className="w-20 h-20 rounded-full object-cover border-2 border-white/20"/>
                        <button type="button" onClick={() => setFormData(f => ({ ...f, photo: undefined }))}
                          className="px-4 py-2 border border-white/20 rounded-full text-white/50 hover:text-white hover:border-white/40 transition-colors text-sm"
                        >
                          写真を外す
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-3 w-fit cursor-pointer px-5 py-3 border border-dashed border-white/25 rounded-2xl text-white/40 hover:text-white hover:border-white/50 transition-colors">
                        <Camera size={18}/>
                        <span className="text-sm">写真をアップロード</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload}/>
                      </label>
                    )}
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-xs text-white/40 mb-2 uppercase tracking-widest">Name</label>
                    <input type="text" className="w-full bg-white/5 border border-white/20 px-6 py-3 text-2xl text-white focus:outline-none focus:border-[#ff3300] transition-colors font-sans rounded-2xl"
                      value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Enter name..."/>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs text-white/40 mb-2 uppercase tracking-widest">Gender</label>
                    <div className="flex gap-3">
                      {(['male', 'female'] as const).map(g => (
                        <button key={g} type="button" onClick={() => handleGenderChange(g)}
                          className={`flex-1 py-3 border transition-colors rounded-2xl display-text text-xl uppercase ${currentGender === g ? 'border-[#ff3300] bg-white/10 text-white' : 'border-white/20 text-white/40 hover:text-white/60'}`}
                        >
                          {g === 'male' ? 'MALE' : 'FEMALE'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Character customization (shown when no photo) */}
                  {!formData.photo && (<>
                    <StyleButtons label="Hair Style" options={currentGender === 'female' ? HAIR_STYLES_FEMALE : HAIR_STYLES_MALE} value={currentAvatar.hairStyle} onChange={s => setAvatar({ hairStyle: s })}/>
                    <ColorSwatches label="Skin Color" options={SKIN_COLORS} value={currentAvatar.skinColor} onChange={c => setAvatar({ skinColor: c })}/>
                    <ColorSwatches label="Hair Color" options={HAIR_COLORS} value={currentAvatar.hairColor} onChange={c => setAvatar({ hairColor: c })}/>
                    <ColorSwatches label="Eye Color" options={EYE_COLORS} value={currentAvatar.eyeColor} onChange={c => setAvatar({ eyeColor: c })}/>
                    <ColorSwatches label="Outfit Color" options={OUTFIT_COLORS} value={currentAvatar.outfitColor} onChange={c => setAvatar({ outfitColor: c })}/>
                  </>)}

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/40 mb-2 uppercase tracking-widest">Met On</label>
                      <input type="date" className="w-full bg-white/5 border border-white/20 px-4 py-3 text-lg text-white focus:outline-none focus:border-[#ff3300] [color-scheme:dark] font-sans rounded-2xl" value={formData.meetDate || ''} onChange={e => setFormData({...formData, meetDate: e.target.value})}/>
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-2 uppercase tracking-widest">Expected End</label>
                      <input type="date" className="w-full bg-white/5 border border-white/20 px-4 py-3 text-lg text-white focus:outline-none focus:border-[#ff3300] [color-scheme:dark] font-sans rounded-2xl" value={formData.endDate || ''} onChange={e => setFormData({...formData, endDate: e.target.value})}/>
                    </div>
                  </div>

                  {/* Context */}
                  <div>
                    <label className="block text-xs text-white/40 mb-2 uppercase tracking-widest">Context</label>
                    <select className="w-full bg-[#0a0a0a] border border-white/20 px-4 py-3 text-lg text-white focus:outline-none focus:border-[#ff3300] font-sans rounded-2xl" value={formData.context || 'other'} onChange={e => setFormData({...formData, context: e.target.value as any})}>
                      <option value="school">School</option>
                      <option value="work">Work</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <button onClick={handleAdd} disabled={!formData.name || !formData.meetDate || !formData.endDate}
                    className="w-full py-5 bg-white text-black hover:bg-[#ff3300] hover:text-white disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black display-text text-3xl transition-colors duration-300 rounded-full"
                  >
                    MANIFEST
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

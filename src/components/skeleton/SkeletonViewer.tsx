import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Bone, BoneAnnotation, BoneCategory } from './types';
import { BoneModel } from './BoneModel';

interface SkeletonViewerProps {
  bones: Bone[];
  selectedBone: Bone | null;
  hoveredBone: Bone | null;
  activeCategory: BoneCategory | 'All';
  annotationsByBone: Map<string, BoneAnnotation[]>;
  searchHighlightedBone: Bone | null;
  onSelectBone: (bone: Bone | null) => void;
  onHoverBone: (bone: Bone | null) => void;
}

function SkeletonGroup({
  bones,
  selectedBone,
  hoveredBone,
  activeCategory,
  annotationsByBone,
  searchHighlightedBone,
  onSelectBone,
  onHoverBone,
}: SkeletonViewerProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Slow idle rotation when nothing selected
  useFrame((state) => {
    if (groupRef.current && !selectedBone && !hoveredBone) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {bones.map((bone) => {
        const isSelected = selectedBone?.id === bone.id || searchHighlightedBone?.id === bone.id;
        const isHovered = hoveredBone?.id === bone.id;
        const isDimmed = activeCategory !== 'All' && bone.bone_category !== activeCategory;
        const annotations = annotationsByBone.get(bone.id) || [];

        return (
          <BoneModel
            key={bone.id}
            bone={bone}
            isSelected={isSelected}
            isHovered={isHovered}
            isDimmed={isDimmed}
            annotations={annotations}
            onSelect={onSelectBone}
            onHover={onHoverBone}
          />
        );
      })}
    </group>
  );
}

export function SkeletonViewer(props: SkeletonViewerProps) {
  return (
    <div className="w-full h-full min-h-[500px] bg-gradient-to-b from-muted/30 to-background rounded-xl overflow-hidden">
      <Canvas shadows dpr={[1, 2]}>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 1.5, 4]} fov={50} />
          
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 5, 5]}
            intensity={0.8}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-5, 3, -5]} intensity={0.3} />
          <pointLight position={[0, 4, 0]} intensity={0.5} />
          
          {/* Skeleton */}
          <SkeletonGroup {...props} />
          
          {/* Environment and shadows */}
          <ContactShadows
            position={[0, -2, 0]}
            opacity={0.4}
            scale={10}
            blur={2}
            far={4}
          />
          <Environment preset="studio" />
          
          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={10}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI - Math.PI / 6}
            target={[0, 1.2, 0]}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

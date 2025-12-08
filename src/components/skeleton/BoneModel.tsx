import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Box, Cylinder, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Bone, BoneAnnotation, CATEGORY_COLORS, ANNOTATION_COLORS } from './types';

interface BoneModelProps {
  bone: Bone;
  isSelected: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  annotations: BoneAnnotation[];
  onSelect: (bone: Bone) => void;
  onHover: (bone: Bone | null) => void;
}

export function BoneModel({
  bone,
  isSelected,
  isHovered,
  isDimmed,
  annotations,
  onSelect,
  onHover,
}: BoneModelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hoverScale, setHoverScale] = useState(1);

  // Animate selection pulse
  useFrame((state) => {
    if (meshRef.current) {
      if (isSelected) {
        meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.05);
      } else {
        meshRef.current.scale.setScalar(hoverScale);
      }
    }
  });

  // Determine bone shape based on category
  const getBoneGeometry = () => {
    const category = bone.bone_category;
    
    // Skull bones are spherical
    if (category === 'Skull') {
      return <sphereGeometry args={[0.12, 16, 16]} />;
    }
    
    // Spine bones are small cylinders
    if (category === 'Spine') {
      return <cylinderGeometry args={[0.06, 0.08, 0.08, 8]} />;
    }
    
    // Ribs are thin curved shapes (simplified as elongated boxes)
    if (category === 'Thorax') {
      if (bone.english_name.includes('Rib')) {
        return <boxGeometry args={[0.3, 0.03, 0.05]} />;
      }
      return <boxGeometry args={[0.15, 0.25, 0.08]} />;
    }
    
    // Pelvis bones
    if (category === 'Pelvis') {
      return <boxGeometry args={[0.25, 0.2, 0.1]} />;
    }
    
    // Long bones (limbs)
    if (bone.english_name.includes('Humerus') || bone.english_name.includes('Femur')) {
      return <cylinderGeometry args={[0.04, 0.05, 0.6, 8]} />;
    }
    
    if (bone.english_name.includes('Radius') || bone.english_name.includes('Ulna') ||
        bone.english_name.includes('Tibia') || bone.english_name.includes('Fibula')) {
      return <cylinderGeometry args={[0.025, 0.035, 0.45, 8]} />;
    }
    
    // Hand/foot bones
    if (bone.english_name.includes('Carpal') || bone.english_name.includes('Tarsal')) {
      return <boxGeometry args={[0.08, 0.04, 0.06]} />;
    }
    
    if (bone.english_name.includes('Metacarpal') || bone.english_name.includes('Metatarsal')) {
      return <boxGeometry args={[0.1, 0.03, 0.04]} />;
    }
    
    if (bone.english_name.includes('Phalanges')) {
      return <boxGeometry args={[0.12, 0.02, 0.03]} />;
    }
    
    // Clavicle and scapula
    if (bone.english_name.includes('Clavicle')) {
      return <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />;
    }
    
    if (bone.english_name.includes('Scapula')) {
      return <boxGeometry args={[0.15, 0.18, 0.02]} />;
    }
    
    if (bone.english_name.includes('Patella')) {
      return <sphereGeometry args={[0.04, 12, 12]} />;
    }
    
    // Default
    return <boxGeometry args={[0.1, 0.1, 0.05]} />;
  };

  // Get bone color
  const getColor = () => {
    if (annotations.length > 0) {
      // Show most severe annotation color
      const annotation = annotations[0];
      return ANNOTATION_COLORS[annotation.annotation_type];
    }
    
    if (isSelected) return '#22c55e';
    if (isHovered) return '#60a5fa';
    
    return isDimmed ? '#4b5563' : CATEGORY_COLORS[bone.bone_category];
  };

  const rotation = getBoneRotation();

  function getBoneRotation(): [number, number, number] {
    const name = bone.english_name;
    
    // Rotate ribs to curve around
    if (name.includes('Rib')) {
      const isLeft = name.includes('Left');
      return [0, 0, isLeft ? Math.PI / 6 : -Math.PI / 6];
    }
    
    // Rotate clavicles
    if (name.includes('Clavicle')) {
      const isLeft = name.includes('Left');
      return [0, isLeft ? Math.PI / 8 : -Math.PI / 8, 0];
    }
    
    return [0, 0, 0];
  }

  return (
    <group position={[bone.position_x, bone.position_y, bone.position_z]}>
      <mesh
        ref={meshRef}
        rotation={rotation}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(bone);
        }}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHoverScale(1.1);
          onHover(bone);
          document.body.style.cursor = 'pointer';
        }}
        onPointerLeave={() => {
          setHoverScale(1);
          onHover(null);
          document.body.style.cursor = 'auto';
        }}
      >
        {getBoneGeometry()}
        <meshStandardMaterial
          color={getColor()}
          transparent
          opacity={isDimmed ? 0.3 : isSelected ? 1 : 0.85}
          emissive={isSelected || isHovered ? getColor() : '#000000'}
          emissiveIntensity={isSelected ? 0.4 : isHovered ? 0.2 : 0}
        />
      </mesh>
      
      {/* Hover tooltip */}
      {isHovered && !isSelected && (
        <Html distanceFactor={8} position={[0, 0.15, 0]}>
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap pointer-events-none">
            <p className="text-sm font-semibold text-foreground">{bone.english_name}</p>
          </div>
        </Html>
      )}
      
      {/* Annotation indicator */}
      {annotations.length > 0 && (
        <mesh position={[0.1, 0.1, 0.1]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      )}
    </group>
  );
}

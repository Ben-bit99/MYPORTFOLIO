"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, ChromaticAberration, DepthOfField, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Component, Suspense, type ReactNode } from "react";
import * as THREE from "three";
import { setState, useApp } from "@/lib/store";
import CityScene, { CITY_FOCUS } from "./CityScene";
import SceneFallback from "./SceneFallback";
import TimelineScene from "./TimelineScene";
import VaultScene from "./VaultScene";
import WorksScene from "./WorksScene";

class WebGLBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[scene] WebGL scene failed, using CSS fallback:", err);
    setState({ webglOk: false });
  }
  render() {
    return this.state.failed ? <SceneFallback /> : this.props.children;
  }
}

function ActiveScene({ lowPower }: { lowPower: boolean }) {
  const section = useApp((s) => s.activeSection);
  switch (section) {
    case "works":
      return <WorksScene lowPower={lowPower} />;
    case "timeline":
      return <TimelineScene lowPower={lowPower} />;
    case "vault":
      return <VaultScene key="vault" mode="vault" lowPower={lowPower} />;
    case "memories":
      return <VaultScene key="memories" mode="memories" lowPower={lowPower} />;
    case "contact":
      return <CityScene key="city-contact" mode="contact" lowPower={lowPower} />;
    case "about":
      return <CityScene key="city" mode="about" lowPower={lowPower} />;
    default:
      return <CityScene key="city" mode="hero" lowPower={lowPower} />;
  }
}

function Effects() {
  const section = useApp((s) => s.activeSection);
  const city = section === "hero" || section === "about" || section === "contact";
  // Re-mount the composer when the DOF pass toggles (happens during the black dip).
  return city ? (
    <EffectComposer key="fx-city" multisampling={0}>
      <DepthOfField target={CITY_FOCUS} focusRange={6} bokehScale={4.2} height={600} />
      <Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.7} luminanceSmoothing={0.2} radius={0.7} />
      <ChromaticAberration offset={new THREE.Vector2(0.0008, 0.0008)} radialModulation={false} modulationOffset={0} blendFunction={BlendFunction.NORMAL} />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.05} />
      <Vignette eskil={false} offset={0.2} darkness={0.85} />
    </EffectComposer>
  ) : (
    <EffectComposer key="fx" multisampling={0}>
      <Bloom mipmapBlur intensity={1.05} luminanceThreshold={0.62} luminanceSmoothing={0.2} radius={0.75} />
      <ChromaticAberration offset={new THREE.Vector2(0.00025, 0.00025)} radialModulation={false} modulationOffset={0} blendFunction={BlendFunction.NORMAL} />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.05} />
      <Vignette eskil={false} offset={0.25} darkness={0.8} />
    </EffectComposer>
  );
}

export default function SceneCanvas() {
  const lowPower = useApp((s) => s.lowPower);
  const webglOk = useApp((s) => s.webglOk);
  if (!webglOk) return <SceneFallback />;

  return (
    <WebGLBoundary>
      <div aria-hidden className="fixed inset-0 z-0">
        <Canvas
          dpr={lowPower ? [1, 1.25] : [1, 1.75]}
          camera={{ fov: 45, near: 0.1, far: 900, position: [0, 2.4, 17] }}
          gl={{ antialias: !lowPower, powerPreference: "high-performance", alpha: false, stencil: false }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
            gl.domElement.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              setState({ webglOk: false });
            });
          }}
        >
          <Suspense fallback={null}>
            <ActiveScene lowPower={lowPower} />
          </Suspense>
          {!lowPower && <Effects />}
        </Canvas>
      </div>
    </WebGLBoundary>
  );
}

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { WeatherKind } from "@/lib/weather";

type Props = { kind: WeatherKind; isNight: boolean };

const PALETTES: Record<WeatherKind, { top: string; bot: string; particle: string; accent: string }> = {
  clear:    { top: "#86c5ff", bot: "#ffe3a8", particle: "#fff4c2", accent: "#ffd27a" },
  clouds:   { top: "#6a7e95", bot: "#c9d5e0", particle: "#e8eef5", accent: "#ffffff" },
  rain:     { top: "#2a3b4c", bot: "#4a6173", particle: "#b9d5ea", accent: "#9fd0ff" },
  storm:    { top: "#0f1620", bot: "#2b3340", particle: "#a9b9c9", accent: "#dcb6ff" },
  snow:     { top: "#a8c3d8", bot: "#e9eef5", particle: "#ffffff", accent: "#ffffff" },
  fog:      { top: "#5a6470", bot: "#aab3bd", particle: "#dde2e8", accent: "#ffffff" },
  night:    { top: "#070b1a", bot: "#1a1340", particle: "#cfe0ff", accent: "#a07bff" },
};

export function WeatherCanvas({ kind, isNight }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const kindRef = useRef<WeatherKind>(kind);
  const nightRef = useRef<boolean>(isNight);

  useEffect(() => { kindRef.current = kind; }, [kind]);
  useEffect(() => { nightRef.current = isNight; }, [isNight]);

  useEffect(() => {
    const mount = mountRef.current!;
    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 2000);
    camera.position.z = 100;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);

    // Sky gradient background (shader plane behind everything)
    const skyGeo = new THREE.PlaneGeometry(2, 2);
    const skyMat = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color(PALETTES[kind].top) },
        uBot: { value: new THREE.Color(PALETTES[kind].bot) },
        uTime: { value: 0 },
        uNight: { value: isNight ? 1 : 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.999, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 uTop;
        uniform vec3 uBot;
        uniform float uTime;
        uniform float uNight;
        // hash-based noise for soft aurora bands
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){
          vec2 i=floor(p);vec2 f=fract(p);
          float a=hash(i);float b=hash(i+vec2(1,0));
          float c=hash(i+vec2(0,1));float d=hash(i+vec2(1,1));
          vec2 u=f*f*(3.0-2.0*f);
          return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
        }
        void main() {
          float y = vUv.y;
          vec3 col = mix(uBot, uTop, smoothstep(0.0, 1.0, y));
          // sun/moon glow blob
          vec2 center = vec2(0.78, 0.72);
          float d = distance(vUv, center);
          float glow = exp(-d*6.0) * (uNight > 0.5 ? 0.45 : 0.7);
          col += glow * (uNight > 0.5 ? vec3(0.7,0.8,1.0) : vec3(1.0,0.85,0.6));
          // soft aurora band at night
          if (uNight > 0.5) {
            float n = noise(vec2(vUv.x*3.0 + uTime*0.05, vUv.y*6.0));
            float band = smoothstep(0.55, 0.85, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y));
            col += band * n * vec3(0.4, 0.9, 0.7) * 0.35;
            col += band * (1.0-n) * vec3(0.6, 0.4, 1.0) * 0.25;
          }
          // film grain
          float g = (hash(vUv*1000.0 + uTime)-0.5)*0.025;
          col += g;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // Particle systems
    const PARTICLE_COUNT = 1400;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const seeds = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i*3]   = (Math.random()-0.5) * 320;
      positions[i*3+1] = (Math.random()-0.5) * 220;
      positions[i*3+2] = (Math.random()-0.5) * 200;
      velocities[i*3]   = (Math.random()-0.5) * 0.05;
      velocities[i*3+1] = -0.2 - Math.random()*0.3;
      velocities[i*3+2] = (Math.random()-0.5) * 0.05;
      seeds[i] = Math.random();
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    const pMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(PALETTES[kind].particle) },
        uMode: { value: 0 }, // 0 dot, 1 streak (rain)
        uSize: { value: 6.0 },
      },
      vertexShader: `
        attribute float aSeed;
        uniform float uTime;
        uniform float uSize;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.x += sin(uTime*0.6 + aSeed*10.0) * 4.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * (300.0 / -mv.z) * (0.5 + aSeed);
          vAlpha = 0.4 + aSeed*0.6;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform int uMode;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float a = 0.0;
          if (uMode == 1) {
            // streak: tall ellipse
            float s = smoothstep(0.5, 0.0, length(vec2(c.x*4.0, c.y)));
            a = s * vAlpha;
          } else {
            a = smoothstep(0.5, 0.0, d) * vAlpha;
          }
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    // Cloud blobs (sprites using radial gradient texture)
    const cloudTex = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const g = c.getContext("2d")!;
      const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      grd.addColorStop(0, "rgba(255,255,255,0.9)");
      grd.addColorStop(0.5, "rgba(255,255,255,0.4)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();

    const clouds: THREE.Sprite[] = [];
    for (let i = 0; i < 22; i++) {
      const m = new THREE.SpriteMaterial({
        map: cloudTex,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      const s = new THREE.Sprite(m);
      const scale = 60 + Math.random() * 120;
      s.scale.set(scale, scale*0.7, 1);
      s.position.set(
        (Math.random()-0.5) * 400,
        20 + Math.random()*60,
        -80 - Math.random()*120,
      );
      (s as any).speed = 0.04 + Math.random()*0.08;
      clouds.push(s);
      scene.add(s);
    }

    // Stars (only visible at night via alpha)
    const starCount = 600;
    const starPos = new Float32Array(starCount*3);
    for (let i = 0; i < starCount; i++) {
      starPos[i*3]   = (Math.random()-0.5) * 600;
      starPos[i*3+1] = Math.random() * 200 - 20;
      starPos[i*3+2] = -150 - Math.random() * 200;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.6,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Lightning overlay
    const flashGeo = new THREE.PlaneGeometry(2, 2);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.z = -1;
    scene.add(flash);

    let mouseX = 0, mouseY = 0;
    const onMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5);
      mouseY = (e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("mousemove", onMove);

    const onResize = () => {
      const w2 = mount.clientWidth, h2 = mount.clientHeight;
      renderer.setSize(w2, h2);
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // Smooth color transitions
    const currentTop = new THREE.Color(PALETTES[kind].top);
    const currentBot = new THREE.Color(PALETTES[kind].bot);
    const currentParticle = new THREE.Color(PALETTES[kind].particle);

    let raf = 0;
    const clock = new THREE.Clock();
    let nextFlash = 4 + Math.random()*6;
    let flashIntensity = 0;

    const animate = () => {
      const t = clock.getElapsedTime();
      const dt = clock.getDelta();
      const k = kindRef.current;
      const night = nightRef.current;
      const pal = PALETTES[night ? "night" : k];

      // target colors
      const tgtTop = new THREE.Color(pal.top);
      const tgtBot = new THREE.Color(pal.bot);
      const tgtPar = new THREE.Color(pal.particle);
      currentTop.lerp(tgtTop, 0.02);
      currentBot.lerp(tgtBot, 0.02);
      currentParticle.lerp(tgtPar, 0.02);
      (skyMat.uniforms.uTop.value as THREE.Color).copy(currentTop);
      (skyMat.uniforms.uBot.value as THREE.Color).copy(currentBot);
      skyMat.uniforms.uTime.value = t;
      skyMat.uniforms.uNight.value += ((night ? 1 : 0) - skyMat.uniforms.uNight.value) * 0.02;
      (pMat.uniforms.uColor.value as THREE.Color).copy(currentParticle);
      pMat.uniforms.uTime.value = t;

      // Configure particles per weather
      let targetSize = 6, targetMode = 0, targetOpacityClouds = 0.0, gravity = -0.2;
      let starOpacity = 0;
      const speedMul = (() => {
        switch (k) {
          case "rain": targetSize = 3; targetMode = 1; targetOpacityClouds = 0.5; gravity = -1.4; return 1;
          case "storm": targetSize = 3.5; targetMode = 1; targetOpacityClouds = 0.7; gravity = -2.0; return 1;
          case "snow": targetSize = 5; targetMode = 0; targetOpacityClouds = 0.4; gravity = -0.25; return 1;
          case "clouds": targetSize = 4; targetMode = 0; targetOpacityClouds = 0.55; gravity = -0.05; return 1;
          case "fog": targetSize = 9; targetMode = 0; targetOpacityClouds = 0.7; gravity = -0.05; return 1;
          case "clear": targetSize = 5; targetMode = 0; targetOpacityClouds = 0.15; gravity = -0.05; return 1;
          case "night": targetSize = 4; targetMode = 0; targetOpacityClouds = 0.2; gravity = -0.05; return 1;
        }
      })();
      if (night) starOpacity = 0.95;

      pMat.uniforms.uSize.value += (targetSize - pMat.uniforms.uSize.value) * 0.05;
      pMat.uniforms.uMode.value = targetMode;
      starMat.opacity += (starOpacity - starMat.opacity) * 0.02;

      // Update particle positions
      const pos = pGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        pos[i*3+1] += gravity * (0.6 + seeds[i]*0.8);
        pos[i*3]   += velocities[i*3] * speedMul;
        if (pos[i*3+1] < -110) {
          pos[i*3+1] = 110;
          pos[i*3]   = (Math.random()-0.5) * 320;
          pos[i*3+2] = (Math.random()-0.5) * 200;
        }
      }
      pGeo.attributes.position.needsUpdate = true;

      // Clouds drift
      for (const c of clouds) {
        c.position.x += (c as any).speed;
        if (c.position.x > 230) c.position.x = -230;
        c.material.opacity += (targetOpacityClouds - c.material.opacity) * 0.02;
      }

      // Lightning during storm
      if (k === "storm") {
        nextFlash -= dt;
        if (nextFlash <= 0) {
          flashIntensity = 0.9;
          nextFlash = 3 + Math.random()*5;
        }
      }
      flashIntensity *= 0.85;
      flashMat.opacity = flashIntensity;

      // gentle parallax
      camera.position.x += (mouseX * 8 - camera.position.x) * 0.03;
      camera.position.y += (-mouseY * 6 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      pGeo.dispose();
      pMat.dispose();
      skyGeo.dispose();
      skyMat.dispose();
      cloudTex.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 -z-10" aria-hidden />;
}
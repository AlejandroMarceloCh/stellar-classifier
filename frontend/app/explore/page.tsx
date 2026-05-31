"use client";

// /explore — el juego. Ruta dark full-bleed que orquesta la máquina S0..S6:
// viaje por el cielo (SkyCanvas) → contacto → interceptación (GamePanel) → apuesta
// → predicción real del modelo → reveal → profundidad 3D (Reveal3D). Las 4 rutas
// light sobreviven como "modo docente"; esta es la experiencia central.
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, StellarApiError } from "@/lib/api";
import type { GameObject, GameObjectsPayload, SamplePointsPayload, StellarClass } from "@/lib/types";
import { gameReducer, INITIAL_GAME_STATE } from "@/lib/gameState";
import { pickNext, readProgress, recordRound } from "@/lib/gameStore";
import type { GameProgress } from "@/lib/gameStore";
import { useCamera, DEFAULT_BOUNDS } from "@/components/explore/useCamera";
import type { Bounds } from "@/components/explore/useCamera";
import { useSpatialHash } from "@/components/explore/useSpatialHash";
import { SkyCanvas } from "@/components/explore/SkyCanvas";
import type { ClassIndex } from "@/components/explore/SkyCanvas";
import { Hud } from "@/components/explore/Hud";
import { GamePanel } from "@/components/explore/GamePanel";
import { Reveal3D } from "@/components/explore/Reveal3D";

const EMPTY_PROGRESS: GameProgress = { discovered: [], playerHits: 0, modelHits: 0, rounds: 0 };
const ALL_CLASSES: StellarClass[] = ["GALAXY", "STAR", "QSO"];

export default function ExplorePage() {
  const router = useRouter();

  const [sample, setSample] = useState<SamplePointsPayload | null>(null);
  const [game, setGame] = useState<GameObjectsPayload | null>(null);
  const [redshiftImp, setRedshiftImp] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [state, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);
  const [progress, setProgress] = useState<GameProgress>(EMPTY_PROGRESS);
  const [enabled, setEnabled] = useState<Set<StellarClass>>(new Set(ALL_CLASSES));
  const [reduced, setReduced] = useState(false);
  const [predictErr, setPredictErr] = useState<string | null>(null);

  // --- Carga de datos ---
  useEffect(() => {
    let m = true;
    Promise.all([api.samplePoints(), api.gameObjects(), api.version()])
      .then(([s, g, v]) => {
        if (!m) return;
        setSample(s);
        setGame(g);
        setRedshiftImp(v.feature_importance?.redshift ?? null);
      })
      .catch((e) => {
        if (!m) return;
        setError(e instanceof StellarApiError ? `Backend respondió ${e.status}` : "Backend no responde");
      });
    return () => {
      m = false;
    };
  }, []);

  useEffect(() => setProgress(readProgress()), []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const h = () => setReduced(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  // --- Estructuras de render (una vez por dataset) ---
  const sky = useMemo(() => {
    if (!sample) return null;
    const n = sample.alpha.length;
    const alpha = new Float32Array(sample.alpha);
    const delta = new Float32Array(sample.delta);
    const g: number[] = [];
    const s: number[] = [];
    const q: number[] = [];
    for (let i = 0; i < n; i++) {
      const c = sample.class[i];
      if (c === "GALAXY") g.push(i);
      else if (c === "STAR") s.push(i);
      else q.push(i);
    }
    const classIdx: ClassIndex = {
      GALAXY: Uint32Array.from(g),
      STAR: Uint32Array.from(s),
      QSO: Uint32Array.from(q),
    };
    return { alpha, delta, classIdx };
  }, [sample]);

  const bounds: Bounds = useMemo(() => {
    if (!sample) return DEFAULT_BOUNDS;
    let aMin = Infinity, aMax = -Infinity, dMin = Infinity, dMax = -Infinity;
    for (let i = 0; i < sample.alpha.length; i++) {
      const a = sample.alpha[i];
      const d = sample.delta[i];
      if (a < aMin) aMin = a;
      if (a > aMax) aMax = a;
      if (d < dMin) dMin = d;
      if (d > dMax) dMax = d;
    }
    const pa = (aMax - aMin) * 0.02;
    const pd = (dMax - dMin) * 0.05;
    return { aMin: aMin - pa, aMax: aMax + pa, dMin: dMin - pd, dMax: dMax + pd };
  }, [sample]);

  const missions = useMemo(() => (game ? game.objects : []), [game]);
  const missionX = useMemo(() => Float32Array.from(missions.map((m) => m.alpha)), [missions]);
  const missionY = useMemo(() => Float32Array.from(missions.map((m) => m.delta)), [missions]);
  const missionHash = useSpatialHash(missionX, missionY, 8);

  const cam = useCamera();
  const fitted = useRef(false);
  useEffect(() => {
    if (!sample) return;
    cam.setBounds(bounds);
    let raf = 0;
    const tryFit = () => {
      if (cam.vw > 1) {
        if (!fitted.current) {
          cam.fitTo();
          // Arranque más cerrado y centrado en el CENTROIDE de los datos (no el
          // bounding box): el SDSS cubre el cielo a parches, así la pantalla se
          // llena con el grueso de objetos en vez de mostrar enormes vacíos.
          let sa = 0;
          let sd = 0;
          const n = sample.alpha.length;
          for (let i = 0; i < n; i++) {
            sa += sample.alpha[i];
            sd += sample.delta[i];
          }
          cam.jumpTo(sa / n, sd / n, cam.baseScale * 1.6);
          fitted.current = true;
        }
      } else {
        raf = requestAnimationFrame(tryFit);
      }
    };
    tryFit();
    return () => cancelAnimationFrame(raf);
  }, [sample, bounds, cam]);

  const discovered = useMemo(() => new Set(progress.discovered), [progress.discovered]);

  // --- Handlers de juego ---
  const selectMission = (obj: GameObject) => {
    setPredictErr(null);
    dispatch({ type: "CONTACT", object: obj });
    const targetScale = Math.max(cam.baseScale * 10, cam.scale);
    if (reduced) {
      cam.jumpTo(obj.alpha, obj.delta, targetScale);
      dispatch({ type: "INTERCEPT" });
    } else {
      cam.flyTo(obj.alpha, obj.delta, targetScale, 640);
      window.setTimeout(() => dispatch({ type: "INTERCEPT" }), 660);
    }
  };

  const findLight = () => {
    const next = pickNext(missions, progress.discovered, state.active?.obj_id);
    if (next) selectMission(next);
  };

  const onGuess = async (cls: StellarClass) => {
    const a = state.active;
    if (!a) return;
    dispatch({ type: "GUESS", guess: cls });
    setPredictErr(null);
    try {
      const [res] = await Promise.all([
        api.predict({ alpha: a.alpha, delta: a.delta, u: a.u, g: a.g, r: a.r, i: a.i, z: a.z, redshift: a.redshift }),
        new Promise((r) => window.setTimeout(r, reduced ? 0 : 380)),
      ]);
      dispatch({ type: "MODEL_REPLIED", prediction: res });
    } catch {
      setPredictErr("No se pudo consultar al modelo. Reintenta.");
      dispatch({ type: "INTERCEPT" });
    }
  };

  const onSeeResult = () => {
    if (state.active && state.guess && state.prediction) {
      const playerCorrect = state.guess === state.active.true_class;
      const modelCorrect = state.prediction.prediction === state.active.true_class;
      setProgress((prev) => recordRound(prev, state.active!.obj_id, playerCorrect, modelCorrect));
    }
    dispatch({ type: "REVEAL" });
  };

  const onEnterDepth = () => dispatch({ type: "ENTER_DEPTH" });

  const onNextLight = () => {
    const prevId = state.active?.obj_id;
    dispatch({ type: "BACK_TO_MAP" });
    const next = pickNext(missions, progress.discovered, prevId);
    if (next) selectMission(next);
  };

  const onClose = () => dispatch({ type: "BACK_TO_MAP" });
  const onExit = () => router.push("/");

  const onResetView = () => {
    if (reduced) cam.fitTo();
    else {
      const cx = (bounds.aMin + bounds.aMax) / 2;
      const cy = (bounds.dMin + bounds.dMax) / 2;
      cam.flyTo(cx, cy, cam.baseScale, 540);
    }
  };

  const toggleClass = (cls: StellarClass) =>
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });

  // --- Estados de carga / error ---
  if (error) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "#05070D" }}>
        <div className="max-w-sm rounded-2xl border p-6 text-center" style={{ borderColor: "rgba(120,150,210,0.18)" }}>
          <h1 className="text-[16px] font-semibold text-[#E8EDF7]">No se pudo entrar al cielo</h1>
          <p className="mt-2 text-[13px] text-[#8595B8]">{error}</p>
          <p className="mt-3 font-mono text-[11px] text-[#8595B8]">El backend debe responder en :8000 (o NEXT_PUBLIC_API_URL).</p>
        </div>
      </div>
    );
  }
  if (!sample || !game || !sky) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "#05070D" }}>
        <p className="animate-pulse font-mono text-[12px] text-[#8595B8]">Cargando el cielo: 10 000 objetos del SDSS17…</p>
      </div>
    );
  }

  const panelOpen = ["intercept", "bet", "predict", "reveal"].includes(state.phase);
  const activeId = state.active?.obj_id ?? null;
  const revealActive = state.phase === "reveal" || state.phase === "depth";

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden" style={{ background: "#05070D" }}>
      <SkyCanvas
        cam={cam}
        alpha={sky.alpha}
        delta={sky.delta}
        classIdx={sky.classIdx}
        enabled={enabled}
        missions={missions}
        missionHash={missionHash}
        discovered={discovered}
        activeId={activeId}
        revealActive={revealActive}
        dim={panelOpen ? 1 : 0}
        reducedMotion={reduced}
        interactive={state.phase === "travel"}
        onMissionSelect={selectMission}
      />

      <Hud
        cam={cam}
        bounds={bounds}
        missions={missions}
        discovered={discovered}
        enabled={enabled}
        onToggleClass={toggleClass}
        progress={{
          discovered: progress.discovered.length,
          playerHits: progress.playerHits,
          modelHits: progress.modelHits,
          rounds: progress.rounds,
        }}
        phase={state.phase}
        reducedMotion={reduced}
        onExit={onExit}
        onFindLight={findLight}
        onResetView={onResetView}
      />

      {predictErr && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-30 flex justify-center">
          <span className="rounded-full border px-3 py-1.5 text-[12px] text-[#FBBF24]" style={{ borderColor: "rgba(251,191,36,0.35)", background: "rgba(10,15,25,0.85)" }}>
            {predictErr}
          </span>
        </div>
      )}

      {panelOpen && (
        <GamePanel
          state={state}
          reducedMotion={reduced}
          onGuess={onGuess}
          onSeeResult={onSeeResult}
          onEnterDepth={onEnterDepth}
          onNextLight={onNextLight}
          onClose={onClose}
        />
      )}

      {state.phase === "depth" && state.active && (
        <Reveal3D
          obj={state.active}
          sample={sample}
          redshiftImportance={redshiftImp}
          reducedMotion={reduced}
          onBack={onClose}
        />
      )}
    </div>
  );
}

import type { PredictRequest, StellarClass } from "./types";

export interface TestCase {
  id: string;
  label: string;
  note: string;
  expectedClass: StellarClass;
  expectedConfidence: number;
  values: PredictRequest;
}

/** Casos de prueba reales del SDSS17, verificados contra el modelo de producción.
 *  Cubren las 3 clases + un caso de frontera (Quásar 92%) para mostrar variedad
 *  de confianza, no solo aciertos triviales. */
export const TEST_CASES: TestCase[] = [
  {
    id: "1237678579288572416",
    label: "Estrella local",
    note: "Redshift casi nulo: está en nuestra galaxia, se mueve con nosotros.",
    expectedClass: "STAR",
    expectedConfidence: 0.99,
    values: { alpha: 351.789349, delta: 23.577796, u: 22.48429, g: 21.15005, r: 20.62343, i: 20.81613, z: 20.19417, redshift: -0.000076 },
  },
  {
    id: "1237657401335350272",
    label: "Galaxia típica",
    note: "Redshift intermedio (0.33): el caso más común del dataset.",
    expectedClass: "GALAXY",
    expectedConfidence: 1.0,
    values: { alpha: 117.392141, delta: 28.360676, u: 23.41949, g: 22.10062, r: 20.83376, i: 20.03002, z: 19.4807, redshift: 0.330267 },
  },
  {
    id: "1237678858477240832",
    label: "Quásar lejano",
    note: "Redshift altísimo (2.37): a miles de millones de años luz.",
    expectedClass: "QSO",
    expectedConfidence: 1.0,
    values: { alpha: 13.186608, delta: 11.756123, u: 22.87967, g: 21.90276, r: 22.01376, i: 21.87333, z: 21.08294, redshift: 2.370471 },
  },
  {
    id: "1237678860075598336",
    label: "Quásar dudoso",
    note: "Redshift moderado (0.67): el modelo baja a 92% — frontera con galaxia.",
    expectedClass: "QSO",
    expectedConfidence: 0.92,
    values: { alpha: 344.519136, delta: 12.377171, u: 22.54692, g: 21.53392, r: 21.47066, i: 20.97943, z: 20.6388, redshift: 0.672209 },
  },
  {
    id: "1237666434188248320",
    label: "Galaxia distante",
    note: "Galaxia con redshift alto (0.69): menos típica, igual la acierta.",
    expectedClass: "GALAXY",
    expectedConfidence: 1.0,
    values: { alpha: 335.546739, delta: 22.43289, u: 24.52573, g: 24.56507, r: 21.85904, i: 20.6003, z: 19.56432, redshift: 0.691947 },
  },
];

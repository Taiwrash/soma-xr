import type { AttachKey, LayerKey } from '../anatomy/proceduralAnatomyBuilder';

export type AnatomyLayerKey = LayerKey;
export type HandAttach = 'hand-L' | 'hand-R';

export interface AnatomyStructureInfo {
  id: string;
  name: string;
  latinName: string;
  layer: AnatomyLayerKey;
  region: 'head' | 'thorax' | 'abdomen' | 'pelvis' | 'upper limb' | 'lower limb';
  /** body part the label anchor follows */
  attach: AttachKey | HandAttach;
  /** anchor in the attach node's local frame (or hand joint name for hands) */
  local: [number, number, number];
  handJoint?: string;
  summary: string;
  biomechanics: string;
  clinicalNote: string;
  keywords: string[];
}

export interface ClinicalCase {
  id: string;
  title: string;
  badge: string;
  targetStructureId: string;
  attach: AttachKey | HandAttach;
  local: [number, number, number];
  handJoint?: string;
  patientHistory: string;
  hint: string;
  findingSummary: string;
  treatmentNote: string;
}

export interface PinpointPrompt {
  id: string;
  structureId: string;
  clue: string;
  difficulty: 'Core' | 'Clinical' | 'Advanced';
}

export const ANATOMY_STRUCTURES: AnatomyStructureInfo[] = [
  // ---------------- skeleton ----------------
  {
    id: 'cranium-skull',
    name: 'Skull',
    latinName: 'Cranium',
    layer: 'skeleton',
    region: 'head',
    attach: 'head',
    local: [-0.06, 0.15, 0.05],
    summary: 'Eight cranial and fourteen facial bones fused by sutures, enclosing the brain and the orbits.',
    biomechanics: 'Vertical buttresses (nasomaxillary, zygomatic, pterygomaxillary) carry bite forces into the cranial vault.',
    clinicalNote: 'The pterion overlies the middle meningeal artery; a blow here can cause an epidural haematoma.',
    keywords: ['skull', 'cranium', 'head', 'forehead', 'zygomatic', 'cheekbone', 'orbit'],
  },
  {
    id: 'mandible-tmj',
    name: 'Mandible & TMJ',
    latinName: 'Mandibula',
    layer: 'skeleton',
    region: 'head',
    attach: 'jaw',
    local: [0.04, -0.06, 0.04],
    summary: 'The only movable skull bone, hinged at the temporomandibular joint. It opens with your voice in this mirror.',
    biomechanics: 'Opening starts as ~15° hinge rotation, then the condyle glides forward onto the articular eminence.',
    clinicalNote: 'With a subcondylar fracture, the chin deviates toward the injured side on opening.',
    keywords: ['jaw', 'mandible', 'chin', 'tmj', 'teeth'],
  },
  {
    id: 'clavicle-scapula',
    name: 'Clavicle & Scapula',
    latinName: 'Cingulum pectorale',
    layer: 'skeleton',
    region: 'thorax',
    attach: 'root',
    local: [-0.11, 0.494, 0.05],
    summary: 'An S-shaped strut (clavicle) and a gliding triangular blade (scapula) that suspend the arm from the trunk.',
    biomechanics: 'Scapulohumeral rhythm: roughly 2° of glenohumeral motion for every 1° of scapular rotation.',
    clinicalNote: 'The clavicle most often breaks at the junction of its middle and lateral thirds.',
    keywords: ['clavicle', 'collarbone', 'scapula', 'shoulder blade', 'shoulder'],
  },
  {
    id: 'ribcage-sternum',
    name: 'Ribcage & Sternum',
    latinName: 'Cavea thoracis',
    layer: 'skeleton',
    region: 'thorax',
    attach: 'root',
    local: [0.128, 0.33, 0.03],
    summary: '12 pairs of ribs: 7 true, 3 false, 2 floating. Costal cartilage links them to the sternum.',
    biomechanics: 'In this view the ribcage rises in pump-handle and bucket-handle motion with each breath.',
    clinicalNote: 'Ribs 4–9 fracture most often in blunt trauma. Watch for an underlying pneumothorax.',
    keywords: ['rib', 'ribs', 'ribcage', 'sternum', 'chest', 'thorax', 'breastbone'],
  },
  {
    id: 'vertebral-column',
    name: 'Vertebral Column',
    latinName: 'Columna vertebralis',
    layer: 'skeleton',
    region: 'thorax',
    attach: 'root',
    local: [0.0, 0.17, -0.06],
    summary: '7 cervical, 12 thoracic and 5 lumbar vertebrae, plus the sacrum and coccyx, separated by fibrocartilage discs.',
    biomechanics: 'The S-curve (cervical and lumbar lordosis, thoracic kyphosis) absorbs axial load like a spring.',
    clinicalNote: 'Lumbar disc herniation is most common at L4–L5 and L5–S1.',
    keywords: ['spine', 'vertebra', 'vertebrae', 'lumbar', 'cervical', 'thoracic', 'back', 'disc'],
  },
  {
    id: 'pelvic-girdle',
    name: 'Pelvis',
    latinName: 'Pelvis ossea',
    layer: 'skeleton',
    region: 'pelvis',
    attach: 'root',
    local: [-0.13, 0.12, 0.0],
    summary: 'The two hip bones (ilium, ischium and pubis on each side) and the sacrum form a ring that carries trunk weight to the legs.',
    biomechanics: 'The deep acetabulum combines multi-axial hip motion with high load stability.',
    clinicalNote: 'The iliac crest marks the L4 vertebral level, the landmark used for lumbar puncture.',
    keywords: ['pelvis', 'hip', 'ilium', 'sacrum', 'iliac', 'acetabulum'],
  },
  {
    id: 'humerus',
    name: 'Humerus',
    latinName: 'Humerus',
    layer: 'skeleton',
    region: 'upper limb',
    attach: 'upperArm-R',
    local: [0.0, 0.02, 0.0],
    summary: 'The upper-arm bone. Its head sits in the shallow glenoid; distally it forms the trochlea and capitulum.',
    biomechanics: 'The shoulder has the greatest range of motion of any joint, traded against stability.',
    clinicalNote: 'Mid-shaft fractures put the radial nerve at risk in the spiral groove (wrist drop).',
    keywords: ['humerus', 'upper arm', 'arm', 'shoulder joint'],
  },
  {
    id: 'radius-ulna',
    name: 'Radius & Ulna',
    latinName: 'Radius et Ulna',
    layer: 'skeleton',
    region: 'upper limb',
    attach: 'forearm-L',
    local: [0.0, 0.0, 0.0],
    summary: 'Paired forearm bones. In pronation the radius rotates across the stationary ulna.',
    biomechanics: 'Pronation and supination span about 160°, turning the palm without moving the elbow.',
    clinicalNote: 'Distal radius (Colles) fractures are the most common upper-limb fracture after a fall.',
    keywords: ['forearm', 'radius', 'ulna', 'elbow', 'wrist'],
  },
  {
    id: 'hand-skeleton',
    name: 'Hand (27 bones)',
    latinName: 'Ossa manus',
    layer: 'skeleton',
    region: 'upper limb',
    attach: 'hand-L',
    local: [0, 0, 0],
    handJoint: 'middle-finger-phalanx-proximal',
    summary: '8 carpals, 5 metacarpals and 14 phalanges, tracked live to your fingers in mixed reality.',
    biomechanics: 'The saddle-shaped first carpometacarpal joint lets the thumb oppose every fingertip.',
    clinicalNote: 'Scaphoid waist fractures after a fall onto the hand can lose their blood supply (avascular necrosis).',
    keywords: ['hand', 'finger', 'carpal', 'scaphoid', 'metacarpal', 'phalanx', 'thumb'],
  },
  {
    id: 'femur-patella',
    name: 'Femur & Patella',
    latinName: 'Os femoris et Patella',
    layer: 'skeleton',
    region: 'lower limb',
    attach: 'thigh-R',
    local: [0.0, 0.03, 0.0],
    summary: 'The longest and strongest bone, angled about 125° at the neck, with the patella acting as the quadriceps pulley.',
    biomechanics: 'The femoral neck angle keeps the knee under the body’s centre of mass.',
    clinicalNote: 'Displaced femoral neck fractures can disrupt the blood supply from the medial circumflex artery.',
    keywords: ['femur', 'thigh', 'knee', 'patella', 'kneecap', 'leg'],
  },
  {
    id: 'tibia-fibula',
    name: 'Tibia & Fibula',
    latinName: 'Tibia et Fibula',
    layer: 'skeleton',
    region: 'lower limb',
    attach: 'shank-L',
    local: [0.0, 0.05, 0.0],
    summary: 'The shin bone and the slender lateral fibula, which form the ankle mortise at their malleoli.',
    biomechanics: 'The tibia carries about 85% of lower-leg load; the fibula mainly stabilises the ankle.',
    clinicalNote: 'The tibial shaft has thin soft-tissue cover, so open fractures are common.',
    keywords: ['tibia', 'fibula', 'shin', 'ankle', 'malleolus', 'calf'],
  },
  {
    id: 'foot-skeleton',
    name: 'Foot (26 bones)',
    latinName: 'Ossa pedis',
    layer: 'skeleton',
    region: 'lower limb',
    attach: 'foot-R',
    local: [0.0, -0.04, 0.06],
    summary: 'Tarsals, metatarsals and phalanges vaulted into longitudinal and transverse arches.',
    biomechanics: 'The windlass mechanism tightens the plantar fascia at toe-off, stiffening the arch.',
    clinicalNote: 'A fifth metatarsal base avulsion can follow an inversion sprain.',
    keywords: ['foot', 'toe', 'heel', 'calcaneus', 'metatarsal', 'arch'],
  },
  // ---------------- organs ----------------
  {
    id: 'brain',
    name: 'Brain & Spinal Cord',
    latinName: 'Encephalon et Medulla spinalis',
    layer: 'organs',
    region: 'head',
    attach: 'head',
    local: [0.05, 0.14, 0.0],
    summary: 'Folded cerebral hemispheres, the cerebellum and brainstem, continuing as the spinal cord down to L1.',
    biomechanics: 'Floating in cerebrospinal fluid, the 1.4 kg brain has an effective weight of about 50 g.',
    clinicalNote: 'The spinal cord ends at L1–L2, so lumbar puncture is done safely at L3–L4.',
    keywords: ['brain', 'cerebrum', 'cerebellum', 'cortex', 'spinal cord', 'nerve', 'eyes'],
  },
  {
    id: 'heart',
    name: 'Heart & Great Vessels',
    latinName: 'Cor et Aorta',
    layer: 'organs',
    region: 'thorax',
    attach: 'root',
    local: [0.04, 0.32, 0.06],
    summary: 'A four-chambered pump that ejects about 5 L/min into the aortic arch and pulmonary trunk. It beats here at 72 BPM.',
    biomechanics: 'The ventricles twist as they contract, wringing blood toward the outflow tracts.',
    clinicalNote: 'The apex beat lies in the left 5th intercostal space, midclavicular line.',
    keywords: ['heart', 'cardiac', 'aorta', 'ventricle', 'pulse', 'vessel'],
  },
  {
    id: 'lungs',
    name: 'Lungs & Airway',
    latinName: 'Pulmones et Trachea',
    layer: 'organs',
    region: 'thorax',
    attach: 'root',
    local: [-0.085, 0.38, 0.02],
    summary: 'The right lung has 3 lobes; the left has 2 plus the cardiac notch. The airway branches about 23 times to the alveoli.',
    biomechanics: 'Negative pleural pressure couples lung expansion to the descent of the diaphragm.',
    clinicalNote: 'The right main bronchus is wider and more vertical, so aspirated objects usually go right.',
    keywords: ['lung', 'lungs', 'trachea', 'breathing', 'bronchi', 'diaphragm'],
  },
  {
    id: 'liver',
    name: 'Liver & Gallbladder',
    latinName: 'Hepar',
    layer: 'organs',
    region: 'abdomen',
    attach: 'root',
    local: [-0.08, 0.25, 0.05],
    summary: 'The largest internal organ, sitting in the right upper quadrant beneath the diaphragm.',
    biomechanics: 'It moves 2–3 cm downward with each deep inspiration.',
    clinicalNote: 'Biliary colic is often referred to the right shoulder tip via the phrenic nerve.',
    keywords: ['liver', 'gallbladder', 'hepatic', 'bile'],
  },
  {
    id: 'stomach',
    name: 'Stomach & Spleen',
    latinName: 'Gaster et Lien',
    layer: 'organs',
    region: 'abdomen',
    attach: 'root',
    local: [0.07, 0.25, 0.04],
    summary: 'A J-shaped muscular sac between the oesophagus and duodenum, with the spleen behind it on the left.',
    biomechanics: 'Peristaltic waves at about 3 per minute churn food into chyme.',
    clinicalNote: 'The spleen is the most commonly injured organ in blunt abdominal trauma.',
    keywords: ['stomach', 'spleen', 'gastric', 'oesophagus', 'esophagus', 'pancreas'],
  },
  {
    id: 'intestines',
    name: 'Intestines',
    latinName: 'Intestinum tenue et crassum',
    layer: 'organs',
    region: 'abdomen',
    attach: 'root',
    local: [0.06, 0.09, 0.07],
    summary: 'About 6 m of small-bowel coils framed by the haustrated colon: ascending, transverse, descending and sigmoid.',
    biomechanics: 'Haustral pouches mix contents slowly as water is absorbed along the colon.',
    clinicalNote: 'Appendicitis pain classically moves from the umbilicus to McBurney’s point.',
    keywords: ['intestine', 'bowel', 'colon', 'gut', 'appendix'],
  },
  {
    id: 'kidneys',
    name: 'Kidneys & Bladder',
    latinName: 'Renes et Vesica urinaria',
    layer: 'organs',
    region: 'abdomen',
    attach: 'root',
    local: [0.075, 0.165, -0.045],
    summary: 'Retroperitoneal bean-shaped filters that drain through the ureters into the bladder. The right sits slightly lower.',
    biomechanics: 'They filter about 180 L of plasma a day and return 99% of it.',
    clinicalNote: 'Ureteric stones lodge at the pelviureteric junction, the pelvic brim and the vesicoureteric junction.',
    keywords: ['kidney', 'kidneys', 'renal', 'bladder', 'ureter'],
  },
  // ---------------- muscles ----------------
  {
    id: 'trunk-muscles',
    name: 'Pectoralis, Deltoid & Core',
    latinName: 'Mm. trunci',
    layer: 'muscles',
    region: 'thorax',
    attach: 'root',
    local: [0.11, 0.42, 0.1],
    summary: 'Pectoralis major, deltoid, rectus abdominis, obliques, trapezius, latissimus dorsi and gluteus maximus.',
    biomechanics: 'The deltoid abducts the arm; rectus abdominis and the obliques brace the lumbar spine.',
    clinicalNote: 'Rectus abdominis segments (the six-pack) are separated by tendinous intersections.',
    keywords: ['pectoralis', 'chest muscle', 'deltoid', 'abs', 'abdominal', 'trapezius', 'glute'],
  },
  {
    id: 'arm-muscles',
    name: 'Biceps, Triceps & Forearm',
    latinName: 'Mm. membri superioris',
    layer: 'muscles',
    region: 'upper limb',
    attach: 'upperArm-L',
    local: [0.0, 0.0, 0.03],
    summary: 'The elbow flexors (biceps), the extensor (triceps), and the forearm flexor and extensor groups.',
    biomechanics: 'The biceps is also the strongest supinator of the forearm.',
    clinicalNote: 'A distal biceps rupture gives a “Popeye” bulge and weak supination.',
    keywords: ['biceps', 'triceps', 'forearm muscle', 'arm muscle'],
  },
  {
    id: 'leg-muscles',
    name: 'Quadriceps & Hamstrings',
    latinName: 'Mm. membri inferioris',
    layer: 'muscles',
    region: 'lower limb',
    attach: 'thigh-L',
    local: [0.0, 0.0, 0.05],
    summary: 'Four quadriceps heads extend the knee; the hamstrings, gastrocnemius and soleus drive gait.',
    biomechanics: 'Through the Achilles tendon, the gastrocnemius and soleus provide push-off power.',
    clinicalNote: 'Hamstring strains happen most often during late swing phase in sprinting.',
    keywords: ['quadriceps', 'hamstring', 'calf', 'gastrocnemius', 'leg muscle', 'thigh muscle'],
  },
];

export const CLINICAL_CASES: ClinicalCase[] = [
  {
    id: 'case-clavicle',
    title: 'Midshaft clavicle fracture',
    badge: 'Shoulder',
    targetStructureId: 'clavicle-scapula',
    attach: 'root',
    local: [-0.09, 0.494, 0.066],
    patientHistory: 'A 27-year-old cyclist fell onto the shoulder and is supporting the elbow, with a step deformity over the collarbone.',
    hint: 'Sweep the X-ray lens along the collarbone on the viewer’s left.',
    findingSummary: 'Oblique fracture at the junction of the middle and lateral thirds.',
    treatmentNote: 'Sling; plate fixation if shortened by more than 2 cm.',
  },
  {
    id: 'case-rib',
    title: 'Right 6th rib fracture',
    badge: 'Thorax',
    targetStructureId: 'ribcage-sternum',
    attach: 'root',
    local: [0.124, 0.29, 0.03],
    patientHistory: 'A 34-year-old with sharp pleuritic chest pain after a blunt impact to the side.',
    hint: 'Scan the lateral ribcage on the viewer’s right.',
    findingSummary: 'Cortical break along the lateral rib shaft; no pneumothorax.',
    treatmentNote: 'Analgesia, incentive spirometry and respiratory monitoring.',
  },
  {
    id: 'case-colles',
    title: 'Distal radius (Colles) fracture',
    badge: 'Wrist',
    targetStructureId: 'radius-ulna',
    attach: 'forearm-R',
    local: [0.016, -0.105, 0.003],
    patientHistory: 'A 68-year-old fell onto an outstretched hand and has a “dinner-fork” deformity of the wrist.',
    hint: 'Check the distal forearm just above the wrist on the viewer’s right.',
    findingSummary: 'Transverse distal radial metaphyseal fracture with dorsal angulation.',
    treatmentNote: 'Closed reduction and cast; volar plate if unstable.',
  },
  {
    id: 'case-femur',
    title: 'Femoral neck stress fracture',
    badge: 'Hip',
    targetStructureId: 'femur-patella',
    attach: 'thigh-R',
    local: [0.018, 0.195, 0.004],
    patientHistory: 'A 29-year-old marathon runner with deep groin pain on hopping and internal rotation.',
    hint: 'Scan the upper femur where the neck meets the femoral head.',
    findingSummary: 'Tension-side cortical lucency across the superior femoral neck.',
    treatmentNote: 'Strict non-weight-bearing; prophylactic screw fixation.',
  },
  {
    id: 'case-boxer',
    title: 'Boxer’s fracture (5th metacarpal)',
    badge: 'Hand',
    targetStructureId: 'hand-skeleton',
    attach: 'hand-L',
    local: [0, 0, 0],
    handJoint: 'pinky-finger-metacarpal',
    patientHistory: 'A 24-year-old with swelling on the ulnar side of the hand and a sunken knuckle after punching.',
    hint: 'Scan the little-finger side of the hand on the viewer’s left.',
    findingSummary: 'Fracture of the 5th metacarpal neck with volar angulation.',
    treatmentNote: 'Ulnar gutter splint for 3–4 weeks.',
  },
  {
    id: 'case-tibia',
    title: 'Tibial shaft fracture',
    badge: 'Leg',
    targetStructureId: 'tibia-fibula',
    attach: 'shank-L',
    local: [0.0, -0.02, 0.012],
    patientHistory: 'A 22-year-old footballer with severe shin pain and a visible deformity after a tackle.',
    hint: 'Scan the middle of the shin on the viewer’s left.',
    findingSummary: 'Mid-shaft transverse tibial fracture; the fibula is intact.',
    treatmentNote: 'Intramedullary nailing; monitor for compartment syndrome.',
  },
];

export const PINPOINT_PROMPTS: PinpointPrompt[] = [
  { id: 'q1', structureId: 'heart', clue: 'The four-chambered pump that ejects about 5 L/min into the aortic arch.', difficulty: 'Core' },
  { id: 'q2', structureId: 'clavicle-scapula', clue: 'The S-shaped strut that links the sternum to the shoulder.', difficulty: 'Core' },
  { id: 'q3', structureId: 'femur-patella', clue: 'The longest bone in the body, with its sesamoid pulley at the knee.', difficulty: 'Core' },
  { id: 'q4', structureId: 'vertebral-column', clue: 'The 24 mobile segments that protect the spinal cord.', difficulty: 'Clinical' },
  { id: 'q5', structureId: 'lungs', clue: 'The organ with 3 lobes on the right and 2 on the left.', difficulty: 'Core' },
  { id: 'q6', structureId: 'pelvic-girdle', clue: 'The bony ring that carries trunk weight into both hip sockets.', difficulty: 'Clinical' },
  { id: 'q7', structureId: 'mandible-tmj', clue: 'The only skull bone with a hinge-and-glide joint.', difficulty: 'Core' },
  { id: 'q8', structureId: 'tibia-fibula', clue: 'The medial shin bone that carries about 85% of lower-leg load.', difficulty: 'Advanced' },
  { id: 'q9', structureId: 'intestines', clue: 'Haustrated pouches frame these coils in the abdomen.', difficulty: 'Clinical' },
  { id: 'q10', structureId: 'kidneys', clue: 'Retroperitoneal filters; the right one sits slightly lower.', difficulty: 'Advanced' },
];

export function generateSpatialTutorResponse(
  query: string,
  hovered: AnatomyStructureInfo | null
): { title: string; spokenText: string; matchedStructure: AnatomyStructureInfo; suggestedLayer?: AnatomyLayerKey } {
  const q = query.toLowerCase().trim();
  let matched: AnatomyStructureInfo | null = null;
  for (const item of ANATOMY_STRUCTURES) {
    if (q.includes(item.name.toLowerCase()) || item.keywords.some((kw) => q.includes(kw))) {
      matched = item;
      break;
    }
  }
  matched = matched ?? hovered ?? ANATOMY_STRUCTURES.find((s) => s.id === 'heart')!;
  if (/(clinical|fracture|injury|pearl)/.test(q)) {
    return { title: `${matched.name}: clinical note`, spokenText: `${matched.name}. ${matched.clinicalNote}`, matchedStructure: matched, suggestedLayer: matched.layer };
  }
  if (/(move|work|biomechanic|function)/.test(q)) {
    return { title: `${matched.name}: biomechanics`, spokenText: `${matched.name}. ${matched.biomechanics}`, matchedStructure: matched, suggestedLayer: matched.layer };
  }
  return { title: matched.name, spokenText: `${matched.name}. ${matched.summary}`, matchedStructure: matched, suggestedLayer: matched.layer };
}

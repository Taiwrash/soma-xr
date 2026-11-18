import {
  ANATOMY_STRUCTURES,
  AnatomyLayerKey,
  AnatomyStructureInfo,
  CLINICAL_CASES,
  ClinicalCase,
  PINPOINT_PROMPTS,
  PinpointPrompt,
} from './anatomyCatalog';

export type CoachLanguageCode =
  | 'en'
  | 'yo'
  | 'ha'
  | 'ig'
  | 'sw'
  | 'zu'
  | 'am'
  | 'so'
  | 'af'
  | 'pcm'
  | 'fr'
  | 'ar'
  | 'es'
  | 'pt';

export interface CoachLanguageMeta {
  code: CoachLanguageCode;
  group: 'africa' | 'world';
  nativeName: string;
  englishName: string;
  regionTag: string;
  bcp47: string;
  dir: 'ltr' | 'rtl';
  edgeVoice: string;
  ttsModel?: string;
  allowBrowserSpeechFallback: boolean;
  quickPill: boolean;
}

export const COACH_LANGUAGES: readonly CoachLanguageMeta[] = [
  // African languages (featured playground) — native tonal VITS / neural voices
  { code: 'yo', group: 'africa', nativeName: 'Yorùbá', englishName: 'Yoruba', regionTag: 'West Africa', bcp47: 'yo-NG', dir: 'ltr', edgeVoice: 'mms:facebook/mms-tts-yor', ttsModel: 'facebook/mms-tts-yor', allowBrowserSpeechFallback: false, quickPill: true },
  { code: 'ha', group: 'africa', nativeName: 'Hausa', englishName: 'Hausa', regionTag: 'West & Central Africa', bcp47: 'ha-NG', dir: 'ltr', edgeVoice: 'mms:facebook/mms-tts-hau', ttsModel: 'facebook/mms-tts-hau', allowBrowserSpeechFallback: false, quickPill: true },
  { code: 'ig', group: 'africa', nativeName: 'Igbo', englishName: 'Igbo', regionTag: 'West Africa', bcp47: 'ig-NG', dir: 'ltr', edgeVoice: 'mms:Shinzmann/soro-tts-ibo', ttsModel: 'Shinzmann/soro-tts-ibo', allowBrowserSpeechFallback: false, quickPill: true },
  { code: 'sw', group: 'africa', nativeName: 'Kiswahili', englishName: 'Swahili', regionTag: 'East & Central Africa', bcp47: 'sw-KE', dir: 'ltr', edgeVoice: 'sw-KE-RafikiNeural', allowBrowserSpeechFallback: false, quickPill: true },
  { code: 'zu', group: 'africa', nativeName: 'isiZulu', englishName: 'Zulu', regionTag: 'Southern Africa', bcp47: 'zu-ZA', dir: 'ltr', edgeVoice: 'zu-ZA-ThembaNeural', allowBrowserSpeechFallback: false, quickPill: true },
  { code: 'am', group: 'africa', nativeName: 'አማርኛ', englishName: 'Amharic', regionTag: 'Ethiopia', bcp47: 'am-ET', dir: 'ltr', edgeVoice: 'am-ET-AmehaNeural', allowBrowserSpeechFallback: false, quickPill: true },
  { code: 'pcm', group: 'africa', nativeName: 'Naija Pidgin', englishName: 'Nigerian Pidgin', regionTag: 'West Africa', bcp47: 'en-NG', dir: 'ltr', edgeVoice: 'en-NG-AbeoNeural', allowBrowserSpeechFallback: true, quickPill: true },
  { code: 'so', group: 'africa', nativeName: 'Af-Soomaali', englishName: 'Somali', regionTag: 'Horn of Africa', bcp47: 'so-SO', dir: 'ltr', edgeVoice: 'so-SO-MuuseNeural', allowBrowserSpeechFallback: false, quickPill: false },
  { code: 'af', group: 'africa', nativeName: 'Afrikaans', englishName: 'Afrikaans', regionTag: 'Southern Africa', bcp47: 'af-ZA', dir: 'ltr', edgeVoice: 'af-ZA-WillemNeural', allowBrowserSpeechFallback: true, quickPill: false },
  // Popular world & pan-African official languages
  { code: 'en', group: 'world', nativeName: 'English', englishName: 'English', regionTag: 'Global', bcp47: 'en-US', dir: 'ltr', edgeVoice: 'en-US-ChristopherNeural', allowBrowserSpeechFallback: true, quickPill: true },
  { code: 'fr', group: 'world', nativeName: 'Français', englishName: 'French', regionTag: 'Francophone Africa & Global', bcp47: 'fr-FR', dir: 'ltr', edgeVoice: 'fr-FR-HenriNeural', allowBrowserSpeechFallback: true, quickPill: true },
  { code: 'ar', group: 'world', nativeName: 'العربية', englishName: 'Arabic', regionTag: 'North Africa & Middle East', bcp47: 'ar-EG', dir: 'rtl', edgeVoice: 'ar-EG-ShakirNeural', allowBrowserSpeechFallback: true, quickPill: true },
  { code: 'es', group: 'world', nativeName: 'Español', englishName: 'Spanish', regionTag: 'Global', bcp47: 'es-ES', dir: 'ltr', edgeVoice: 'es-ES-AlvaroNeural', allowBrowserSpeechFallback: true, quickPill: false },
  { code: 'pt', group: 'world', nativeName: 'Português', englishName: 'Portuguese', regionTag: 'Lusophone Africa & Global', bcp47: 'pt-BR', dir: 'ltr', edgeVoice: 'pt-BR-AntonioNeural', allowBrowserSpeechFallback: true, quickPill: false },
];

export function getCoachLanguageMeta(code: CoachLanguageCode): CoachLanguageMeta {
  return COACH_LANGUAGES.find((l) => l.code === code) ?? COACH_LANGUAGES[9];
}

export interface CoachPackUI {
  coachBadge: string;
  welcomeTitle: string;
  welcomeBody: string;
  howItWorksBtn: string;
  clinicalNoteBtn: string;
  speakBtn: string;
  askVoiceBtn: string;
  askInputLabel: string;
  askPlaceholder: string;
  askSendBtn: string;
  quizTitle: string;
  skipBtn: string;
  nextCaseBtn: string;
  hearHintBtn: string;
  correctPrefix: string;
  tryAgainPrefix: string;
  diagnosedPrefix: string;
  regions: Record<AnatomyStructureInfo['region'], string>;
  boneCommands: string[];
  organCommands: string[];
  muscleCommands: string[];
  allCommands: string[];
  explodeCommands: string[];
  biomechTriggers: string[];
  clinicalTriggers: string[];
  /** Template builders when a structure only specifies localized name + key fact */
  explainSummary: (localName: string, latin: string, coreFact: string) => string;
  explainBiomech: (localName: string, mechFact: string) => string;
  explainClinical: (localName: string, clinFact: string) => string;
  quizClueTemplate: (localNameHint: string, regionLabel: string) => string;
}

interface StructureLocalEntry {
  name: string;
  summary: string;
  biomechanics: string;
  clinicalNote: string;
  keywords?: string[];
}

type StructureNameMap = Record<string, [name: string, summary: string, biomech: string, clinical: string, keywords?: string[]]>;

const PACKS: Record<Exclude<CoachLanguageCode, 'en'>, { ui: CoachPackUI; structures: StructureNameMap }> = {
  yo: {
    ui: {
      coachBadge: 'Olùkọ́ Ẹ̀yà Ara · Yorùbá',
      welcomeTitle: 'Ẹ káàbọ̀! Béèrè nípa ẹ̀yà ara èyíkéyìí',
      welcomeBody: 'Fọwọ́ kan egungun tàbí ẹ̀yà inú ara lórí àwòrán yìí, kí o sì gbọ́ àlàyé ní èdè Yorùbá.',
      howItWorksBtn: 'Bí ó ṣe ń ṣiṣẹ́',
      clinicalNoteBtn: 'Àkíyèsí ìṣègùn',
      speakBtn: 'Gbọ́ àlàyé',
      askVoiceBtn: 'Béèrè pẹ̀lú ohùn',
      askInputLabel: 'Béèrè lọ́wọ́ olùkọ́',
      askPlaceholder: 'Bí àpẹẹrẹ: Báwo ni ọkàn ṣe ń ṣiṣẹ́? / Egungun ọwọ́…',
      askSendBtn: 'Béèrè',
      quizTitle: 'Wá ẹ̀yà ara yìí',
      skipBtn: 'Fo èyí',
      nextCaseBtn: 'Àyẹ̀wò mìíràn',
      hearHintBtn: 'Gbọ́ ìtọ́ka',
      correctPrefix: 'Ẹ kú iṣẹ́! Ó tọ̀nà',
      tryAgainPrefix: 'Èyí ni',
      diagnosedPrefix: 'A ti rí ibi tí ó fọ́',
      regions: { head: 'Orí', thorax: 'Àyà', abdomen: 'Ikùn', pelvis: 'Ìbàdí', 'upper limb': 'Apá àti Ọwọ́', 'lower limb': 'Ẹsẹ̀ àti Itan' },
      boneCommands: ['egungun', 'egungun nikan', 'skeleton'],
      organCommands: ['ẹya inu', 'ẹ̀yà inú', 'inu ara', 'ọkan', 'ọkàn', 'organs'],
      muscleCommands: ['iṣan', 'ẹran ara', 'muscles'],
      allCommands: ['gbogbo rẹ', 'gbogbo rẹ̀', 'fi gbogbo rẹ han'],
      explodeCommands: ['tuka', 'túká', 'ya sọtọ', 'explode'],
      biomechTriggers: ['ṣiṣẹ', 'ṣiṣẹ́', 'rin', 'rìn', 'iṣẹ', 'iṣẹ́', 'work', 'move'],
      clinicalTriggers: ['ìṣègùn', 'isegun', 'àìsàn', 'aisan', 'ìfọ́', 'ifọ', 'clinical', 'fracture'],
      explainSummary: (n, _lat, f) => `${n}. ${f}`,
      explainBiomech: (n, f) => `${n}. ${f}`,
      explainClinical: (n, f) => `${n}. ${f}`,
      quizClueTemplate: (hint, reg) => `Ẹ̀yà ara ní agbègbè ${reg}: ${hint}`,
    },
    structures: {
      'cranium-skull': [
        'Agbárí àti Egungun Ojú',
        'Egungun méjọ ti agbárí àti mẹ́rìnlá ti ojú ni ó parapọ̀ dáàbò bo ọpọlọ àti ẹyinjú.',
        'Àwọn òpó egungun ojú ń gbé agbára jíjẹ oúnjẹ sókè sí agbárí láìjẹ́ kí ó fọ́.',
        'Ẹ̀gbẹ́ agbárí jẹ́ ibi ẹlẹgẹ́ nítorí iṣan ẹ̀jẹ̀ pàtàkì tí ó kọjá lábẹ́ rẹ̀.',
        ['agbari', 'agbárí', 'ori', 'orí', 'ojú', 'oju'],
      ],
      'mandible-tmj': [
        'Egungun Àgbọ̀n àti Oríkèé Àgbọ̀n',
        'Egungun agbárí kan ṣoṣo tí ó lè yípo nìyí; ó sì ń ṣí sílẹ̀ pẹ̀lú ohùn rẹ.',
        'Ìṣísílẹ̀ ẹnu máa ń bẹ̀rẹ̀ pẹ̀lú yíyípo kékeré ní oríkèé àgbọ̀n kí ó tó yọ̀ síwájú.',
        'Bí ọrùn egungun àgbọ̀n bá fọ́, àgbọ̀n máa ń yẹ̀ sí ẹ̀gbẹ́ tí ó farapa.',
        ['agbon', 'àgbọ̀n', 'ehin', 'eyín', 'enu', 'ẹnu'],
      ],
      'clavicle-scapula': [
        'Egungun Èjìká àti Àpáta Èjìká',
        'Egungun iwájú èjìká àti àpáta ẹ̀yìn èjìká ni ó so apá mọ́ àyà.',
        'Nígbà tí o bá gbé apá sókè, oríkèé èjìká àti àpáta ẹ̀yìn èjìká máa ń ṣiṣẹ́ papọ̀.',
        'Àárín egungun èjìká ni ó sábà máa ń fọ́ nígbà tí ènìyàn bá ṣubú lu èjìká.',
        ['ejika', 'èjìká', 'apa', 'apá'],
      ],
      'ribcage-sternum': [
        'Egungun Ìhà àti Àyà',
        'Egungun ìhà méjìlá ní ẹ̀gbẹ́ ọ̀tún àti méjìlá ní ẹ̀gbẹ́ òsì ni ó yí ọkàn àti ẹ̀dọ̀fóró ká.',
        'Egungun àyà máa ń gbé sókè, ó sì ń fẹ̀ síta pẹ̀lú gbogbo èémí tí a bá fà sínú.',
        'Egungun ìhà kẹrin sí ìkẹsàn-án ni ó sábà máa ń fọ́ nígbà ìjàǹbá.',
        ['aya', 'àyà', 'iha', 'ìhà', 'igba aya'],
      ],
      'vertebral-column': [
        'Ọ̀pá Ẹ̀yìn',
        'Egungun ọrùn méje, ti àyà méjìlá, àti ti ìbàdí márùn-ún ni ó dáàbò bo okùn ọpọlọ.',
        'Ìrísí wíwọ́ ọ̀pá ẹ̀yìn máa ń gba ìwọ̀n ara mú kí ìrìn wa lè rọrùn.',
        'Ìyọkúrò rọ́bà àárín ọ̀pá ẹ̀yìn wọ́pọ̀ ní ìsàlẹ̀ ẹ̀yìn.',
        ['opa eyin', 'ọ̀pá ẹ̀yìn', 'eyin', 'ẹ̀yìn'],
      ],
      'pelvic-girdle': [
        'Egungun Ìbàdí',
        'Òrùka egungun ìbàdí ni ó ń gbé ìwọ̀n òkè ara sínú itan méjèèjì.',
        'Ihò oríkèé ìbàdí tí ó jìn máa ń fún itan ní ìdúróṣinṣin nígbà ìrìn àti ìsáré.',
        'Òkè egungun ìbàdí ni àwọn dókítà máa ń lò láti mọ ìpele ìsàlẹ̀ ọ̀pá ẹ̀yìn.',
        ['ibadi', 'ìbàdí', 'itan'],
      ],
      humerus: [
        'Egungun Apá Òkè',
        'Egungun gígùn ti apá òkè láti èjìká dé ìgbọ̀nwọ́.',
        'Oríkèé èjìká ni ó ní ààyè ìyípo tí ó gbòòrò jù lọ nínú gbogbo ara.',
        'Ìfọ́ ní àárín egungun apá òkè lè pa iṣan ọwọ́ lára, kí ó sì fa ìrẹ̀wẹ̀sì ọrùn ọwọ́.',
        ['apa oke', 'apá òkè', 'igbonwo', 'ìgbọ̀nwọ́'],
      ],
      'radius-ulna': [
        'Egungun Apá Ìsàlẹ̀',
        'Egungun méjì ti apá ìsàlẹ̀ láti ìgbọ̀nwọ́ dé ọrùn ọwọ́; ọ̀kan ń yípo lórí èkejì láti yí àtẹ́lẹwọ́ padà.',
        'Yíyí àtẹ́lẹwọ́ sókè àti sísàlẹ̀ jẹ́ kí ọwọ́ lè ṣiṣẹ́ pẹ̀lú ìrọ̀rùn.',
        'Ìfọ́ egungun apá ìsàlẹ̀ nítòsí ọrùn ọwọ́ wọ́pọ̀ nígbà tí ènìyàn bá fi ọwọ́ tẹlẹ̀ nígbà ìṣubú.',
        ['apa isale', 'apá ìsàlẹ̀', 'orun owo', 'ọrùn ọwọ́'],
      ],
      'hand-skeleton': [
        'Egungun Ọwọ́',
        'Egungun mẹ́tàdínlọ́gbọ̀n ni ó wà ní ọwọ́ kọ̀ọ̀kan: mẹ́jọ ní ọrùn ọwọ́, márùn-ún ní àtẹ́lẹwọ́, àti mẹ́rìnlá ní àwọn ìka.',
        'Oríkèé àtàǹpàkò jẹ́ kí ó lè fọwọ́ kan gbogbo àwọn ìka yòókù láti di nǹkan mú.',
        'Ìfọ́ egungun kékeré ọrùn ọwọ́ lábẹ́ àtàǹpàkò nílò ìtọ́jú kíákíá nítorí ìṣàn ẹ̀jẹ̀ rẹ̀.',
        ['owo', 'ọwọ́', 'ika', 'ìka', 'atampako', 'àtàǹpàkò'],
      ],
      'femur-patella': [
        'Egungun Itan àti Orúnkún',
        'Egungun itan ni ó gùn jù, tí ó sì lágbára jù lọ nínú ara, pẹ̀lú egungun ìbòrí orúnkún níwájú rẹ̀.',
        'Igun ọrùn egungun itan ń mú kí orúnkún dúró lábẹ́ ìwọ̀n àárín ara nígbà ìrìn.',
        'Ìfọ́ ọrùn egungun itan ní ọ̀dọ̀ àgbàlagbà lè dí ìṣàn ẹ̀jẹ̀ sí orí egungun náà.',
        ['itan', 'orunkun', 'orúnkún'],
      ],
      'tibia-fibula': [
        'Egungun Ojúgun',
        'Egungun ojúgun tí ó gbẹ́rù àti egungun tẹ́ẹ́rẹ́ ẹ̀gbẹ́ rẹ̀ ni ó so orúnkún mọ́ kókósẹ̀.',
        'Egungun ojúgun ńlá ni ó ń ru ọ̀pọ̀lọpọ̀ ìwọ̀n ara ní ẹsẹ̀ ìsàlẹ̀.',
        'Awọ iwájú ojúgun fẹ́lẹ́fẹ́lẹ́, nítorí náà ìfọ́ egungun ojúgun sábà máa ń hàn síta.',
        ['ojugun', 'ojúgun', 'kokose', 'kókósẹ̀'],
      ],
      'foot-skeleton': [
        'Egungun Ẹsẹ̀',
        'Egungun mẹ́rìndínlọ́gbọ̀n ni ó wà ní ẹsẹ̀ kọ̀ọ̀kan, láti gìgísẹ̀ àti kókósẹ̀ dé àwọn ọmọ ẹsẹ̀.',
        'Iṣan àtẹ́lẹsẹ̀ máa ń le nígbà tí ọmọ ẹsẹ̀ bá tẹ̀ ilẹ̀ láti fún wa ní agbára ìrìn àti ìsáré.',
        'Yíyí kókósẹ̀ lójijì lè fa ìfọ́ ní ìsàlẹ̀ egungun ẹ̀gbẹ́ ẹsẹ̀.',
        ['ese', 'ẹsẹ̀', 'omo ese', 'gigise', 'gìgísẹ̀'],
      ],
      brain: [
        'Ọpọlọ àti Okùn Ọpọlọ',
        'Ilé ìṣàkóso èrò, ìríran, ìgbọ́ràn, àti ìṣípòpadà gbogbo ara láti agbárí sọ̀kalẹ̀ sínú ọ̀pá ẹ̀yìn.',
        'Ọpọlọ ń léfòó nínú omi ààbò pàtàkì tí ó ń dáàbò bò ó kúrò lọ́wọ́ ìkọlù.',
        'Okùn ọpọlọ parí sí òkè ìbàdí nínú àgbàlagbà, ibẹ̀ sì ni àyẹ̀wò omi ẹ̀yìn ti máa ń wáyé.',
        ['opolo', 'ọpọlọ', 'ero', 'èrò'],
      ],
      heart: [
        'Ọkàn àti Àwọn Iṣan Ẹ̀jẹ̀ Ńlá',
        'Ọkàn ní iyàrá mẹ́rin tí ó ń gbé lítà márùn-ún ẹ̀jẹ̀ káàkiri gbogbo ara ní ìṣẹ́jú kan, ó sì ń lù ní ìgbà méjìléláàádọ́rin ní ìṣẹ́jú kan.',
        'Àwọn iyàrá ìsàlẹ̀ ọkàn máa ń fún pọ̀ pẹ̀lú agbára láti tì ẹ̀jẹ̀ sínú àwọn iṣan ẹ̀jẹ̀ ńlá.',
        'Ìlù ọkàn máa ń hàn kedere ní ààyè ìhà karùn-ún ní ẹ̀gbẹ́ òsì àyà.',
        ['okan', 'ọkàn', 'eje', 'ẹ̀jẹ̀', 'ilu okan'],
      ],
      lungs: [
        'Ẹ̀dọ̀fóró àti Ọ̀nà Èémí',
        'Ẹ̀dọ̀fóró ọ̀tún ní abala mẹ́ta, ṣùgbọ́n ti òsì ní abala méjì láti fi ààyè sílẹ̀ fún ọkàn.',
        'Nígbà tí iṣan ààlà àyà bá sọ̀kalẹ̀, afẹ́fẹ́ tuntun máa ń wọ inú ẹ̀dọ̀fóró méjèèjì.',
        'Ọ̀nà afẹ́fẹ́ ọ̀tún fẹ̀ jù ti òsì lọ, nítorí náà ohun tí ènìyàn bá ṣèèṣì mí sínú sábà máa ń lọ sí ọ̀tún.',
        ['edoforo', 'ẹ̀dọ̀fóró', 'eemi', 'èémí', 'afefe', 'afẹ́fẹ́'],
      ],
      liver: [
        'Ẹ̀dọ̀ àti Àpò Òróòro',
        'Ẹ̀dọ̀ ni ẹ̀yà inú ara tí ó tóbi jù lọ ní ẹ̀gbẹ́ ọ̀tún òkè ikùn, tí ó ń sẹ́ ẹ̀jẹ̀ tí ó sì ń ṣètò oúnjẹ.',
        'Ẹ̀dọ̀ máa ń sọ̀kalẹ̀ díẹ̀ pẹ̀lú gbogbo èémí jíjinlẹ̀ tí a bá fà sínú.',
        'Ìrora láti inú àpò òróòro lè tàn dé orí èjìká ọ̀tún.',
        ['edoki', 'edo', 'ẹ̀dọ̀', 'apooro'],
      ],
      stomach: [
        'Ikùn àti Ọ̀ọ́lọ́',
        'Àpò iṣan inú ikùn tí ó ń lọ oúnjẹ pọ̀, pẹ̀lú ọ̀ọ́lọ́ ní ẹ̀yìn ẹ̀gbẹ́ òsì rẹ̀ tí ó ń tọ́jú ẹ̀jẹ̀.',
        'Ìgbì ìṣípòpadà mẹ́ta ní ìṣẹ́jú kan ni ikùn fi ń pò oúnjẹ dà pọ̀ di rírọ̀.',
        'Ọ̀ọ́lọ́ ni ẹ̀yà inú ikùn tí ó sábà máa ń farapa jù lọ nígbà ìkọlù líle sí ikùn.',
        ['ikun', 'ikùn', 'ounje', 'oúnjẹ', 'oolo', 'ọ̀ọ́lọ́'],
      ],
      intestines: [
        'Ìfun Kékeré àti Ìfun Ńlá',
        'Ìwọ̀n mítà mẹ́fà ti ìfun kékeré tí ìfun ńlá yí ká, fún gbígba èròjà oúnjẹ àti omi sínú ara.',
        'Ìfun ńlá máa ń rọra tì ìdọ̀tí síwájú bí ara ṣe ń fa omi àti iyọ̀ padà.',
        'Ìrora wíwú ìfun kékeré sábà máa ń bẹ̀rẹ̀ ní àyíká ìdodo kí ó tó lọ sí ìsàlẹ̀ ọ̀tún ikùn.',
        ['ifun', 'ìfun', 'inu', 'inú'],
      ],
      kidneys: [
        'Kíndìnrín àti Àpò Ìtọ̀',
        'Àwọn kíndìnrín méjì tí ó rí bí ẹ̀wà ní ẹ̀yìn ikùn ni ó ń sẹ́ ìdọ̀tí kúrò nínú ẹ̀jẹ̀ láti di ìtọ̀.',
        'Àwọn kíndìnrín méjèèjì ń sẹ́ ìwọ̀n lítà ọgọ́rùn-ún ó lé ọgọ́rin omi ẹ̀jẹ̀ lójoojúmọ́.',
        'Òkúta kíndìnrín sábà máa ń há sí àwọn ibi tí ọ̀nà ìtọ̀ ti há.',
        ['kindinrin', 'kíndìnrín', 'ito', 'ìtọ̀'],
      ],
      'trunk-muscles': [
        'Iṣan Àyà, Èjìká àti Ikùn',
        'Àwọn iṣan àyà, èjìká, ikùn, àti ẹ̀yìn tí ó ń gbé ara dúró ṣinṣin.',
        'Iṣan èjìká ń gbé apá sókè, àwọn iṣan ikùn sì ń dáàbò bo ọ̀pá ẹ̀yìn.',
        'Àwọn iṣan ikùn tí ó lágbára máa ń dín ìrora ẹ̀yìn kù.',
        ['isan aya', 'iṣan àyà', 'isan ikun', 'iṣan ikùn'],
      ],
      'arm-muscles': [
        'Iṣan Apá',
        'Iṣan iwájú apá ń ká ìgbọ̀nwọ́, iṣan ẹ̀yìn apá sì ń na apá pẹ̀lú àwọn iṣan ọwọ́.',
        'Iṣan iwájú apá tún ni ó ń yí àtẹ́lẹwọ́ sókè pẹ̀lú agbára.',
        'Bí iṣan iwájú apá bá já, ó máa ń kórajọ bí ìṣù sí òkè apá.',
        ['isan apa', 'iṣan apá'],
      ],
      'leg-muscles': [
        'Iṣan Itan àti Ojúgun',
        'Iṣan iwájú itan ń na orúnkún, nígbà tí iṣan ẹ̀yìn itan àti ti ẹ̀yìn ẹsẹ̀ ń tì wá rìn.',
        'Okùn iṣan gìgísẹ̀ ni ó ń fún ẹsẹ̀ ní agbára láti fò àti láti sáré.',
        'Ìfà iṣan ẹ̀yìn itan sábà máa ń ṣẹlẹ̀ nígbà tí ènìyàn bá ń sáré kíákíá.',
        ['isan ese', 'iṣan ẹsẹ̀', 'isan itan'],
      ],
    },
  },

  ha: {
    ui: {
      coachBadge: 'Malamin Jiki · Hausa',
      welcomeTitle: 'Barka da zuwa! Yi tambaya a kan kowane sashen jiki',
      welcomeBody: 'Danna kowane ƙashi ko halittar cikin jiki a kan samfurin 3D don jin bayani cikin harshen Hausa.',
      howItWorksBtn: 'Yadda yake aiki',
      clinicalNoteBtn: 'Bayanan likita',
      speakBtn: 'Saurari murya',
      askVoiceBtn: 'Tambaya da murya',
      askInputLabel: 'Tambayi malamin jiki',
      askPlaceholder: 'Misali: Yaya zuciya take aiki? / Ƙashin hannu…',
      askSendBtn: 'Aika',
      quizTitle: 'Nemo wannan sashen jiki',
      skipBtn: 'Tsallake',
      nextCaseBtn: 'Shari’a ta gaba',
      hearHintBtn: 'Ji alama',
      correctPrefix: 'Madalla! Daidai ne',
      tryAgainPrefix: 'Wannan shi ne',
      diagnosedPrefix: 'An gano karayar',
      regions: { head: 'Kai', thorax: 'Ƙirji', abdomen: 'Ciki', pelvis: 'Ƙugu', 'upper limb': 'Hannu da Damtse', 'lower limb': 'Ƙafa da Cinya' },
      boneCommands: ['kashi', 'ƙashi', 'kasusuwa', 'skeleton'],
      organCommands: ['kayan ciki', 'zuciya', 'organs'],
      muscleCommands: ['tsoka', 'tsokoki', 'muscles'],
      allCommands: ['duka', 'nuna duka'],
      explodeCommands: ['raba', 'ware', 'explode'],
      biomechTriggers: ['aiki', 'motsi', 'work', 'move'],
      clinicalTriggers: ['likita', 'ciwo', 'karaya', 'clinical', 'fracture'],
      explainSummary: (n, _lat, f) => `${n}. ${f}`,
      explainBiomech: (_n, f) => f,
      explainClinical: (_n, f) => f,
      quizClueTemplate: (hint, reg) => `Sashe a yankin ${reg}: ${hint}`,
    },
    structures: {
      'cranium-skull': ['Ƙashin Kai (Skull)', 'Ƙasusuwan kwanya takwas da na fuska goma sha huɗu da ke kare kwakwalwa da idanu.', 'Ginshiƙan ƙashin fuska suna ɗaukar ƙarfin tauna abinci zuwa kwanya.', 'Yankin pterion a gefen kai yana kusa da babbar jijiyar jini ta meningeal.', ['kai', 'kwanya', 'fuska']],
      'mandible-tmj': ['Ƙashin Haɓa da TMJ', 'Ƙashin kai ɗaya tilo mai motsi; yana buɗewa tare da muryarka a wannan madubi.', 'Buɗe baki yana farawa da juyawa kafin ya zame gaba a haɗin TMJ.', 'Idan wuyan ƙashin haɓa ya karye, haɓa takan karkata zuwa gefen raunin.', ['haba', 'hakori', 'baki']],
      'clavicle-scapula': ['Ƙashin Wuya da Allon Kafaɗa', 'Ƙashin clavicle mai siffar S da allon kafaɗa da ke ɗauke da hannu.', 'Motsin kafaɗa yana haɗa haɗin hannu da juyawar allon kafaɗa tare.', 'Tsakiyar ƙashin clavicle ne ya fi saurin karyewa idan mutum ya faɗi.', ['kafada', 'clavicle']],
      'ribcage-sternum': ['Ƙasusuwan Haƙarƙari da Kirji', 'Haƙarƙari biyu-biyu guda goma sha biyu da ke kare zuciya da huhu.', 'Keji na haƙarƙari yana ɗagawa da faɗaɗawa a kowane numfashi.', 'Haƙarƙari na 4 zuwa na 9 sun fi karyewa a hatsari.', ['hakarkari', 'kirji']],
      'vertebral-column': ['Ƙashin Baya (Spine)', 'Ƙasusuwa 24 masu motsi tare da sacrum da ke kare lakar baya.', 'Lankwasar S ta ƙashin baya tana rage girgizar nauyin jiki kamar soso.', 'Zamewar diski ya fi faruwa a ƙasan baya wato L4–L5 da L5–S1.', ['baya', 'kashin baya']],
      'pelvic-girdle': ['Ƙashin Ƙugu (Pelvis)', 'Zoben ƙashin ƙugu da ke ɗaukar nauyin gangar jiki zuwa cinyoyi biyu.', 'Ramin acetabulum mai zurfi yana ba da ƙarfi da daidaito wajen tafiya.', 'Gefen ƙashin ƙugu na sama yana daidai da matakin L4.', ['kugu']],
      humerus: ['Ƙashin Damtse (Humerus)', 'Dogon ƙashin saman hannu daga kafaɗa zuwa gwiwar hannu.', 'Haɗin kafaɗa yana ba da damar juya hannu ta kowane bangare.', 'Karaya a tsakiyar humerus na iya taɓa jijiyar radial.', ['damtse', 'hannu']],
      'radius-ulna': ['Radius da Ulna', 'Ƙasusuwa biyu na gaban hannu; radius yana juyawa a kan ulna don juya tafin hannu.', 'Juya tafin hannu sama da ƙasa yana kaiwa kusan digiri 160.', 'Karayar Colles a ƙarshen radius ta fi yawa bayan faɗuwa a kan tafin hannu.', ['gaban hannu', 'wuyan hannu']],
      'hand-skeleton': ['Hannu (Ƙasusuwa 27)', 'Ƙasusuwan wuyan hannu 8, na tafin hannu 5, da na yatsu 14 masu bin motsin yatsunka.', 'Haɗin babban yatsa yana ba shi damar taɓa kowane yatsa.', 'Karayar ƙashin scaphoid na buƙatar kulawa don kare jijiyar jininsa.', ['yatsa', 'tafin hannu', 'hannu']],
      'femur-patella': ['Ƙashin Cinya da Gwiwa', 'Ƙashi mafi tsawo da ƙarfi a jiki, tare da murfin gwiwa (patella).', 'Karkatar wuyan femur tana ajiye gwiwa a ƙarƙashin nauyin jiki.', 'Karayar wuyan femur na iya katse jijiyar jini zuwa kan ƙashin.', ['cinya', 'gwiwa']],
      'tibia-fibula': ['Ƙashin Kwauri (Tibia da Fibula)', 'Babban ƙashin kwauri da siririn fibula da ke haɗa idon sawu.', 'Tibia yana ɗaukar kashi 85% na nauyin ƙasa da gwiwa.', 'Fatar gaban kwauri siririya ce, don haka karayarsa takan fito fili.', ['kwauri', 'idon sawu']],
      'foot-skeleton': ['Ƙafa (Ƙasusuwa 26)', 'Ƙasusuwan sawu da yatsun ƙafa da aka gina kamar baka don ɗaukar nauyi.', 'Tsarin baka na tafin ƙafa yana tauri yayin daga duga-dugi don tura jiki gaba.', 'Murɗewar idon sawu na iya jawo tsagewar ƙashin metatarsal na biyar.', ['kafa', 'sawu', 'dugadugi']],
      brain: ['Kwakwalwa da Lakar Baya', 'Cibiyar tunani, gani, ji, da sarrafa motsin jiki har zuwa L1.', 'Ruwan CSF yana ɗaukar kwakwalwa don kare ta daga buguwa.', 'Lakar baya tana tsayawa a L1–L2 a cikin manya.', ['kwakwalwa', 'jijiya']],
      heart: ['Zuciya da Manyan Jijiyoyi', 'Injin bugun jini mai ɗakuna huɗu da ke tura lita 5 a kowace minti (bugu 72).', 'Ɗakunan ƙasa na zuciya suna murɗawa yayin bugawa don tura jini cikin aorta.', 'Ana jin bugun kololuwar zuciya a tazarar haƙarƙari ta biyar a hagu.', ['zuciya', 'jini', 'aorta']],
      lungs: ['Huhu da Hanyar Numfashi', 'Huhun dama yana da sassa 3; na hagu yana da 2 don ba wa zuciya wuri.', 'Saukar tsokar diaphragm tana jawo iska cikin huhu.', 'Bututun iska na dama ya fi faɗi da miƙewa.', ['huhu', 'numfashi']],
      liver: ['Hanta da Matsarmama', 'Halitta mafi girma a cikin jiki a gefen dama na sama ƙarƙashin diaphragm.', 'Hanta tana matsawa ƙasa da santimita 2–3 a lokacin jan numfashi.', 'Ciwon matsarmama yakan kai ga kafaɗar dama.', ['hanta', 'matsarmama']],
      stomach: ['Ciki da Saifar Jini (Spleen)', 'Jaka mai tsoka mai siffar J da ke nika abinci, tare da saifa a bayansa.', 'Motsin ciki sau uku a minti ɗaya yana gauraya abinci.', 'Saifa ita ce ta fi jin rauni idan aka sami buguwa a ciki.', ['ciki', 'abinci']],
      intestines: ['Hanji (Ƙarama da Babba)', 'Tsawon mita 6 na ƙaramin hanji da babban hanji ke kewaye da shi.', 'Babban hanji yana tsotse ruwa yayin tura datti a hankali.', 'Ciwon uwar hanji (appendicitis) yakan koma ƙasan dama na ciki.', ['hanji']],
      kidneys: ['Koda da Mafitsara', 'Matattara biyu masu siffar wake a bayan ciki da ke tace jini.', 'Koda tana tace lita 180 na ruwan jini a kowace rana.', 'Tsakuwar koda takan maƙale a matsattun wuraren bututun ureter.', ['koda', 'mafitsara']],
      'trunk-muscles': ['Tsokokin Ƙirji, Kafaɗa da Ciki', 'Tsokokin pectoralis, deltoid, da na ciki da ke tsayar da gangar jiki.', 'Deltoid yana ɗaga hannu; tsokokin ciki suna kare ƙashin baya.', 'Layukan tsokar ciki guda shida haɗin jijiyoyi ne.', ['tsokar kirji', 'tsokar ciki']],
      'arm-muscles': ['Tsokokin Hannu (Biceps & Triceps)', 'Biceps yana lanƙwasa gwiwar hannu, triceps kuma yana miƙar da shi.', 'Biceps kuma yana taimakawa wajen juya tafin hannu sama.', 'Tsinkewar jijiyar biceps na sa kumburi a saman damtse.', ['tsokar hannu']],
      'leg-muscles': ['Tsokokin Cinya da Kwauri', 'Quadriceps yana miƙar da gwiwa; hamstrings da tsokar kwauri suna tafiyar da mutum.', 'Babbar jijiyar Achilles a duga-dugi tana ba da ƙarfin tsalle da gudu.', 'Jan tsokar hamstring ya fi faruwa yayin gudu da ƙarfi.', ['tsokar cinya', 'tsokar kafa']],
    },
  },

  ig: {
    ui: {
      coachBadge: 'Onye Nkụzi Ahụ · Igbo',
      welcomeTitle: 'Nnọọ! Jụọ ajụjụ maka akụkụ ahụ ọ bụla',
      welcomeBody: 'Pịa ọkpụkpụ ma ọ bụ akụkụ ime ahụ ọ bụla n’onyinyo 3D ka ị nụ nkọwa n’asụsụ Igbo.',
      howItWorksBtn: 'Otu ọ si arụ ọrụ',
      clinicalNoteBtn: 'Ndụmọdụ ahụike',
      speakBtn: 'Gee olu nkụzi',
      askVoiceBtn: 'Jụọ n’olu',
      askInputLabel: 'Jụọ onye nkụzi',
      askPlaceholder: 'Dịka: Kedu ka obi si arụ ọrụ? / Ọkpụkpụ aka…',
      askSendBtn: 'Jụọ',
      quizTitle: 'Chọta akụkụ ahụ a',
      skipBtn: 'Gafee',
      nextCaseBtn: 'Ọnọdụ ọzọ',
      hearHintBtn: 'Gee ntụziaka',
      correctPrefix: 'Daalụ! Ọ bụ eziokwu',
      tryAgainPrefix: 'Nke a bụ',
      diagnosedPrefix: 'Achọpụtala mgbaji ahụ',
      regions: { head: 'Isi', thorax: 'Obi', abdomen: 'Afọ', pelvis: 'Ukwu', 'upper limb': 'Aka', 'lower limb': 'Ụkwụ' },
      boneCommands: ['ọkpụkpụ', 'okpukpu', 'skeleton'],
      organCommands: ['ime ahụ', 'obi', 'organs'],
      muscleCommands: ['akwara anụ', 'anụ ahụ', 'muscles'],
      allCommands: ['niile', 'gosipụta niile'],
      explodeCommands: ['kewaa', 'gbasa', 'explode'],
      biomechTriggers: ['ọrụ', 'arụ', 'mmegharị', 'work', 'move'],
      clinicalTriggers: ['ahụike', 'mgbaji', 'ọrịa', 'clinical', 'fracture'],
      explainSummary: (n, _lat, f) => `${n}. ${f}`,
      explainBiomech: (_n, f) => f,
      explainClinical: (_n, f) => f,
      quizClueTemplate: (hint, reg) => `Akụkụ dị na mpaghara ${reg}: ${hint}`,
    },
    structures: {
      'cranium-skull': ['Ọkpụkpụ Isi (Skull)', 'Ọkpụkpụ asatọ nke ụbụrụ na iri na anọ nke ihu jikọtara ọnụ na-echebe ụbụrụ na anya.', 'Ogidi ọkpụkpụ ihu na-ebu ike ịta nri gbagoo n’okpokoro isi.', 'Mpaghara pterion dị n’akụkụ isi dị nro n’ihi akwara ọbara dị n’ime ya.', ['isi', 'okpokoro isi', 'ihu']],
      'mandible-tmj': ['Àgbà na Nkwonkwo TMJ', 'Naanị ọkpụkpụ isi na-emegharị ahụ; ọ na-emeghe site n’olu gị n’enyo a.', 'Ịmeghe ọnụ na-amalite site na ntụgharị tupu ya amịọ gaa n’ihu.', 'Mgbaji n’olu àgbà na-eme ka àgbà gbadaa n’akụkụ merụrụ ahụ.', ['agba', 'eze', 'ọnụ']],
      'clavicle-scapula': ['Ọkpụkpụ Ubu (Clavicle & Scapula)', 'Ọkpụkpụ clavicle dị ka S na mbadamba ubu na-ejikọ aka n’ahụ.', 'Nkwonkwo ubu na mbadamba ubu na-agbakọ aka mgbe ị welitere aka.', 'Etiti ọkpụkpụ clavicle bụ ebe ọ na-agbajikarị ma mmadụ daa.', ['ubu']],
      'ribcage-sternum': ['Ọkpụkpụ Ngụgụ na Sternum', 'Ụzọ ọkpụkpụ ngụgụ iri na abụọ gbara obi na ngụgụ gburugburu.', 'Ọkpụkpụ obi na-ebuli elu ma gbasaa na ume ọ bụla ị kuru.', 'Ọkpụkpụ ngụgụ nke anọ ruo nke itoolu na-agbajikarị n’ihe mberede.', ['ngugu', 'obi']],
      'vertebral-column': ['Ọkpụkpụ Azụ (Spine)', 'Ọkpụkpụ 24 na-emegharị ahụ tinyere sacrum nke na-echebe ụmị azụ.', 'Ụdị S nke ọkpụkpụ azụ na-ebelata ịdị arọ ahụ dị ka spring.', 'Nsogbu diski na-emekarị n’ụkwụ azụ na L4–L5 na L5–S1.', ['azu', 'okpukpu azu']],
      'pelvic-girdle': ['Ọkpụkpụ Ukwu (Pelvis)', 'Mgbanaka ọkpụkpụ ukwu na-ebufe ịdị arọ ahụ gaa n’ụkwụ abụọ.', 'Oghere acetabulum miri emi na-enye nkwụsi ike n’ịga ije.', 'Elu ọkpụkpụ ukwu na-egosi ọkwa L4 nke ọkpụkpụ azụ.', ['ukwu']],
      humerus: ['Ọkpụkpụ Elu Aka (Humerus)', 'Ọkpụkpụ ogologo nke elu aka malite n’ubu ruo n’ikpere aka.', 'Nkwonkwo ubu nwere ohere ntụgharị kachasị n’ahụ mmadụ.', 'Mgbaji n’etiti humerus nwere ike imetụta akwara radial.', ['elu aka', 'ikpere aka']],
      'radius-ulna': ['Radius na Ulna', 'Ọkpụkpụ abụọ nke ala aka; radius na-atụgharị n’elu ulna iji tụgharịa ọbụ aka.', 'Ntụgharị ọbụ aka elu na ala ruru ihe dị ka ogo 160.', 'Mgbaji Colles dị na njedebe radius na-emekarị ma mmadụ daa n’aka.', ['ala aka', 'nkwojiaka']],
      'hand-skeleton': ['Aka (Ọkpụkpụ 27)', 'Ọkpụkpụ nkwojiaka 8, ọbụ aka 5, na mkpịsị aka 14 na-eso mkpịsị aka gị ozugbo.', 'Nkwonkwo isi mkpịsị aka na-enyere ya aka imetụ mkpịsị aka ndị ọzọ niile.', 'Mgbaji ọkpụkpụ scaphoid chọrọ nlekọta ngwa ngwa maka ọbara ya.', ['aka', 'mkpisi aka']],
      'femur-patella': ['Ọkpụkpụ Apata Ụkwụ na Ikpere', 'Ọkpụkpụ kachasị ogologo na ike n’ahụ, tinyere ikpere (patella).', 'Nkuku olu femur na-edobe ikpere n’okpuru ịdị arọ ahụ.', 'Mgbaji olu femur nwere ike igbochi ọbara iru n’isi ọkpụkpụ ahụ.', ['apata ukwu', 'ikpere']],
      'tibia-fibula': ['Ọkpụkpụ Afọ Ụkwụ (Tibia & Fibula)', 'Ọkpụkpụ shin buru ibu na fibula dị gịrịgịrị nke jikọtara nkwonkwo ụkwụ.', 'Tibia na-ebu pasent 85 nke ịdị arọ ala ụkwụ.', 'Akpụkpọ dị n’ihu tibia dị gịrịgịrị, ya mere mgbaji ya na-apụtakarị n’èzí.', ['afo ukwu', 'nkwonkwo ukwu']],
      'foot-skeleton': ['Ụkwụ (Ọkpụkpụ 26)', 'Ọkpụkpụ ụkwụ na mkpịsị ụkwụ ahaziri dị ka akwa mmiri iji buru ahụ.', 'Usoro windlass na-esi ike n’ọbụ ụkwụ mgbe ị na-azọpụ ụkwụ.', 'Mgbaji isi ọkpụkpụ ise nke ụkwụ nwere ike iso ntụgharị nkwonkwo ụkwụ.', ['ukwu', 'mkpisi ukwu']],
      brain: ['Ụbụrụ na Ụmị Azụ', 'Ebe nchịkwa echiche, ịhụ ụzọ, ịnụ ihe, na mmegharị ahụ ruo L1.', 'Mmiri CSF na-echebe ụbụrụ ka ọ ghara imerụ ahụ ngwa ngwa.', 'Ụmị azụ na-akwụsị na L1–L2 n’ime ndị okenye.', ['uburu', 'echiche']],
      heart: ['Obi na Akwara Ọbara Ukwu', 'Igwe mgbapụta nwere ọnụ ụlọ anọ nke na-ebupụ lita 5 ọbara kwa nkeji (72 BPM).', 'Ọnụ ụlọ ala obi na-atụgharị mgbe ọ na-akụ iji chụpụ ọbara banye n’aorta.', 'Ụda iti obi na-anụkarị n’oghere ọkpụkpụ ngụgụ nke ise n’aka ekpe.', ['obi', 'obara']],
      lungs: ['Ngụgụ na Ụzọ Ume', 'Ngụgụ aka nri nwere ngalaba 3; nke aka ekpe nwere 2 iji nye obi ohere.', 'Mgbada akwara diaphragm na-adọta ikuku banye na ngụgụ.', 'Ụzọ ikuku aka nri sara mbara karịa nke aka ekpe.', ['ngugu', 'ume', 'ikuku']],
      liver: ['Umeju na Akpaelu', 'Akụkụ ime ahụ kachasị ukwuu dị n’elu aka nri afọ n’okpuru diaphragm.', 'Ọ na-agbada santimita 2–3 mgbe ị kuru ume miri emi.', 'Ụfụ akpaelu nwere ike iru n’ọnụ ubu aka nri.', ['umeju']],
      stomach: ['Afọ na Spleen', 'Akpa akwara dị ka J nke na-agwakọta nri, ya na spleen n’azụ aka ekpe ya.', 'Ebili mmegharị atọ kwa nkeji na-agbanwe nri ka ọ bụrụ chyme.', 'Spleen bụ akụkụ ime afọ na-emerụkarị ahụ n’ihe mberede.', ['afo', 'nri']],
      intestines: ['Eriri Afọ (Ntakịrị na Ukwu)', 'Mita isii nke eriri afọ ntakịrị nke eriri afọ ukwu gbara gburugburu.', 'Eriri afọ ukwu na-amịkọrọ mmiri ka nri na-aga n’ihu.', 'Ụfụ appendicitis na-amalite n’otubo tupu ọ gaa n’ala aka nri afọ.', ['eriri afo']],
      kidneys: ['Akụrụ na Akpa Mamịrị', 'Ihe nzacha abụọ dị ka agwa dị n’azụ afọ na-azacha ọbara.', 'Ha na-azacha ihe dị ka lita 180 nke mmiri ọbara kwa ụbọchị.', 'Nkume akụrụ na-akpọchikarị n’ebe dị warara nke ureter.', ['akuru', 'mamiri']],
      'trunk-muscles': ['Akwara Obi, Ubu na Afọ', 'Akwara pectoralis, deltoid, na nke afọ na-akwado ahụ.', 'Deltoid na-eweli aka; akwara afọ na-akwado ọkpụkpụ azụ.', 'Akara isii nke akwara afọ sitere na njikọ akwara.', ['akwara obi', 'akwara afo']],
      'arm-muscles': ['Akwara Aka (Biceps & Triceps)', 'Biceps na-ehulata ikpere aka, triceps na-agbatị ya.', 'Biceps bụkwa akwara siri ike n’ịtụgharị ọbụ aka elu.', 'Ọdịdọ akwara biceps na-ebute akpụ n’elu aka.', ['akwara aka']],
      'leg-muscles': ['Akwara Apata Ụkwụ na Afọ Ụkwụ', 'Quadriceps na-agbatị ikpere; hamstrings na akwara ụkwụ na-enyere ịga ije aka.', 'Akwara Achilles dị n’ikiri ụkwụ na-enye ike ịgba ọsọ.', 'Ọdịdọ hamstring na-emekarị mgbe mmadụ na-agba ọsọ ọsọ.', ['akwara ukwu']],
    },
  },

  sw: {
    ui: {
      coachBadge: 'Mkufunzi wa Mwili · Kiswahili',
      welcomeTitle: 'Karibu! Uliza kuhusu sehemu yoyote ya mwili',
      welcomeBody: 'Gusa mfupa au kiungo chochote kwenye kioo cha 3D ili kupata maelezo na sauti kwa Kiswahili.',
      howItWorksBtn: 'Jinsi inavyofanya kazi',
      clinicalNoteBtn: 'Ushauri wa tiba',
      speakBtn: 'Sikiliza maelezo',
      askVoiceBtn: 'Uliza kwa sauti',
      askInputLabel: 'Muulize mkufunzi',
      askPlaceholder: 'Mfano: Moyo unafanyaje kazi? / Mifupa ya mkono…',
      askSendBtn: 'Uliza',
      quizTitle: 'Tafuta kiungo hiki',
      skipBtn: 'Ruka',
      nextCaseBtn: 'Kisa kinachofuata',
      hearHintBtn: 'Sikiliza dokezo',
      correctPrefix: 'Hongera! Umepata',
      tryAgainPrefix: 'Hii ni',
      diagnosedPrefix: 'Mvunjiko umegunduliwa',
      regions: { head: 'Kichwa', thorax: 'Kifua', abdomen: 'Tumbo', pelvis: 'Nyonga', 'upper limb': 'Mkono', 'lower limb': 'Mguu' },
      boneCommands: ['mifupa', 'mfupa', 'kiunzi', 'skeleton'],
      organCommands: ['viungo', 'moyo', 'organs'],
      muscleCommands: ['misuli', 'nyama', 'muscles'],
      allCommands: ['vyote', 'onyesha vyote'],
      explodeCommands: ['tenganisha', 'panua', 'explode'],
      biomechTriggers: ['fanya kazi', 'mwendo', 'work', 'move'],
      clinicalTriggers: ['tiba', 'daktari', 'mvunjiko', 'clinical', 'fracture'],
      explainSummary: (n, _lat, f) => `${n}. ${f}`,
      explainBiomech: (_n, f) => f,
      explainClinical: (_n, f) => f,
      quizClueTemplate: (hint, reg) => `Sehemu ya ${reg}: ${hint}`,
    },
    structures: {
      'cranium-skull': ['Fuvu la Kichwa', 'Mifupa minane ya fuvu na kumi na minne ya uso inayolinda ubongo na macho.', 'Nguzo za mifupa ya uso hubeba nguvu ya kutafuna hadi kwenye fuvu.', 'Eneo la pterion pembeni mwa kichwa liko juu ya mshipa muhimu wa meningeal.', ['fuvu', 'kichwa', 'uso']],
      'mandible-tmj': ['Taya na Kiungo cha TMJ', 'Mfupa pekee wa fuvu unaosogea; hufunguka sambamba na sauti yako hapa.', 'Kufungua mdomo huanza kwa mzunguko wa nyuzi 15 kisha kuteleza mbele.', 'Mvunjiko wa shingo ya taya hufanya kidevu kielekee upande uliojeruhiwa.', ['taya', 'meno', 'mdomo']],
      'clavicle-scapula': ['Mtulinga na Ubao wa Bega', 'Mfupa wa mtulinga wenye umbo la S na ubao wa bega unaoshikilia mkono.', 'Mwendo wa bega huunganisha mzunguko wa humerus na scapula kwa uwiano wa 2:1.', 'Katikati ya mtulinga ndipo panapovunjika mara nyingi mtu anapoanguka.', ['mtulinga', 'bega']],
      'ribcage-sternum': ['Mbavu na Mfupa wa Kidari', 'Jozi 12 za mbavu pamoja na kidari zinazolinda moyo na mapafu.', 'Mbavu huinuka na kupanuka kwa kila pumzi unayovuta.', 'Mbavu za 4 hadi 9 huvunjika zaidi kwenye ajali za kifua.', ['mbavu', 'kifua', 'kidari']],
      'vertebral-column': ['Uti wa Mgongo (Spine)', 'Pingili 24 za mifupa pamoja na sacrum zinazolinda ugwe wa mgongo.', 'Mkunjo wa S wa mgongo hufyonza mtikisiko unapotembea au kuruka.', 'Kuteguka kwa diski hutokea zaidi chini ya mgongo kwenye L4–L5 na L5–S1.', ['mgongo', 'uti wa mgongo']],
      'pelvic-girdle': ['Nyonga (Pelvis)', 'Pete ya mifupa ya nyonga inayobeba uzito wa kiwiliwili kwenda kwenye miguu.', 'Kikombe kirefu cha acetabulum huleta uthabiti mkubwa wa nyonga.', 'Ukingo wa juu wa nyonga huashiria kiwango cha pingili ya L4.', ['nyonga']],
      humerus: ['Mfupa wa Mkono wa Juu', 'Mfupa mrefu kati ya bega na kiwiko cha mkono.', 'Kiungo cha bega kina uwezo mpana zaidi wa kuzunguka mwilini.', 'Mvunjiko wa katikati ya humerus unaweza kuathiri neva ya radial.', ['humerus', 'kiwiko']],
      'radius-ulna': ['Radius na Ulna', 'Mifupa miwili ya mkono wa chini; radius huzunguka juu ya ulna kugeuza kiganja.', 'Mzunguko wa kiganja hufikia takriban nyuzi 160.', 'Mvunjiko wa Colles karibu na kifundo cha mkono ni wa kawaida baada ya kuanguka.', ['mkono wa chini', 'kifundo']],
      'hand-skeleton': ['Mkono (Mifupa 27)', 'Mifupa 8 ya kifundo, 5 ya kiganja, na 14 ya vidole inayofuata vidole vyako moja kwa moja.', 'Kiungo cha kidole gumba hukiwezesha kugusa kila ncha ya kidole kingine.', 'Mvunjiko wa mfupa wa scaphoid unahitaji uchunguzi wa haraka kulinda mzunguko wake wa damu.', ['mkono', 'vidole', 'kiganja']],
      'femur-patella': ['Mfupa wa Paja na Pia ya Goti', 'Mfupa mrefu na imara zaidi mwilini pamoja na patella mbele ya goti.', 'Pembe ya shingo ya femur huweka goti chini ya kitovu cha uzito wa mwili.', 'Mvunjiko wa shingo ya femur unaweza kukata damu kwenda kwenye kichwa cha mfupa.', ['paja', 'goti', 'femur']],
      'tibia-fibula': ['Muundi na Fibula', 'Mfupa mkuu wa muundi na fibula nyembamba inayoshikilia kifundo cha mguu.', 'Tibia hubeba asilimia 85 ya uzito wa mguu wa chini.', 'Ngozi ya mbele ya muundi ni nyembamba, hivyo mivunjiko ya wazi ni rahisi kutokea.', ['muundi', 'kifundo cha mguu']],
      'foot-skeleton': ['Mguu (Mifupa 26)', 'Mifupa ya kisigino na vidole vya mguu iliyojengwa kama tao kuhimili uzito.', 'Utando wa unyayo hukaza unapoinua kisigino ili kukupa nguvu ya kusukuma.', 'Kuteguka kwa kifundo kunaweza kuvunja kitako cha mfupa wa tano wa metatarsal.', ['mguu', 'unyayo', 'kisigino']],
      brain: ['Ubongo na Ugwe wa Mgongo', 'Kituo kikuu cha fahamu, kuona, kusikia, na kuratibu mwili hadi L1.', 'Majimaji ya CSF huufanya ubongo uelelee na kuulinda dhidi ya mtikisiko.', 'Ugwe wa mgongo huishia kwenye pingili ya L1–L2 kwa mtu mzima.', ['ubongo', 'fahamu', 'neva']],
      heart: ['Moyo na Mishipa Mikuu', 'Pampu yenye vyumba vinne inayosukuma lita 5 za damu kwa dakika kwa mapigo 72.', 'Vyumba vya chini vya moyo hujinyonga vinaposinyaa kusukuma damu kwenye aorta.', 'Mdundo wa ncha ya moyo husikika kwenye nafasi ya tano ya mbavu upande wa kushoto.', ['moyo', 'damu', 'mapigo']],
      lungs: ['Mapafu na Njia ya Hewa', 'Pafu la kulia lina sehemu 3; la kushoto lina 2 ili kuupa moyo nafasi.', 'Kushuka kwa msuli wa diaphragm huvuta hewa safi ndani ya mapafu.', 'Njia kuu ya hewa ya kulia ni pana na imenyooka zaidi.', ['mapafu', 'pumzi', 'hewa']],
      liver: ['Ini na Kibofu cha Nyongo', 'Kiungo kikubwa zaidi cha ndani kilicho upande wa kulia chini ya diaphragm.', 'Hushuka kwa sentimita 2–3 unavuta pumzi ndefu.', 'Maumivu ya nyongo mara nyingi husikika kwenye ncha ya bega la kulia.', ['ini', 'nyongo']],
      stomach: ['Tumbo na Bandama (Spleen)', 'Mfuko wa misuli wenye umbo la J unaosaga chakula, na bandama nyuma yake kushoto.', 'Mawimbi matatu kwa dakika huchanganya chakula kuwa laini.', 'Bandama ndicho kiungo kinachojeruhiwa mara nyingi zaidi kwenye ajali za tumbo.', ['tumbo', 'bandama', 'chakula']],
      intestines: ['Utumbo Mwembamba na Mpana', 'Mita 6 za utumbo mwembamba zilizozungukwa na utumbo mpana.', 'Utumbo mpana hufyonza maji na madini taratibu.', 'Maumivu ya kidole tumbo (appendicitis) huanzia kitovuni kisha kuhamia kulia chini.', ['utumbo']],
      kidneys: ['Figo na Kibofu cha Mkojo', 'Vichujio viwili vyenye umbo la haragwe nyuma ya tumbo vinavyochuja damu.', 'Huchuja takriban lita 180 za majimaji ya damu kila siku.', 'Mawe ya figo hukwama kwenye sehemu nyembamba za mrija wa ureter.', ['figo', 'mkojo']],
      'trunk-muscles': ['Misuli ya Kifua, Bega na Tumbo', 'Misuli ya pectoralis, deltoid, na tumbo inayoimarisha kiwiliwili.', 'Deltoid huinua mkono; misuli ya tumbo hulinda uti wa mgongo.', 'Vipande sita vya misuli ya tumbo hutenganishwa na kano ngumu.', ['misuli ya kifua', 'misuli ya tumbo']],
      'arm-muscles': ['Misuli ya Mkono (Biceps & Triceps)', 'Biceps hukunja kiwiko na triceps hukinyoosha pamoja na misuli ya kiganja.', 'Biceps pia ndiyo msuli mkuu wa kugeuza kiganja kutazama juu.', 'Kukatika kwa kano ya biceps husababisha uvimbe kwenye mkono wa juu.', ['misuli ya mkono']],
      'leg-muscles': ['Misuli ya Paja na Shafuu', 'Quadriceps hunyoosha goti; hamstrings na misuli ya shafuu huendesha mwendo wa kutembea.', 'Kano ya Achilles kwenye kisigino hutoa nguvu ya kuruka na kukimbia.', 'Kuchanika kwa hamstring hutokea zaidi wakati wa kukimbia kasi.', ['misuli ya mguu', 'misuli ya paja']],
    },
  },

  zu: {
    ui: {
      coachBadge: 'Umqeqeshi Womzimba · isiZulu',
      welcomeTitle: 'Siyakwamukela! Buza nganoma yisiphi isitho somzimba',
      welcomeBody: 'Thinta ithambo noma isitho sangaphakathi esibukweni se-3D ukuze uzwe incazelo ngesiZulu.',
      howItWorksBtn: 'Indlela esisebenza ngayo',
      clinicalNoteBtn: 'Ulwazi lwezokwelapha',
      speakBtn: 'Lalela umqeqeshi',
      askVoiceBtn: 'Buza ngezwi',
      askInputLabel: 'Buza umqeqeshi',
      askPlaceholder: 'Isib: Inhliziyo isebenza kanjani? / Amathambo esandla…',
      askSendBtn: 'Buza',
      quizTitle: 'Thola lesi sitho somzimba',
      skipBtn: 'Dlula',
      nextCaseBtn: 'Udaba olulandelayo',
      hearHintBtn: 'Zwa umkhondo',
      correctPrefix: 'Siyakuhalalisa! Ushayele emhlolweni',
      tryAgainPrefix: 'Lokhu yi-',
      diagnosedPrefix: 'Ukuphuka kutholakele',
      regions: { head: 'Ikhanda', thorax: 'Isifuba', abdomen: 'Isisu', pelvis: 'Ukhakhayi Lwezinqe', 'upper limb': 'Ingalo', 'lower limb': 'Umlenze' },
      boneCommands: ['amathambo', 'ithambo', 'skeleton'],
      organCommands: ['izitho', 'inhliziyo', 'organs'],
      muscleCommands: ['izicubu', 'inyama', 'muscles'],
      allCommands: ['konke', 'veza konke'],
      explodeCommands: ['hlukanisa', 'explode'],
      biomechTriggers: ['sebenza', 'nyakaza', 'work', 'move'],
      clinicalTriggers: ['ukuphuka', 'isibhedlela', 'clinical', 'fracture'],
      explainSummary: (n, _lat, f) => `${n}. ${f}`,
      explainBiomech: (_n, f) => f,
      explainClinical: (_n, f) => f,
      quizClueTemplate: (hint, reg) => `Isitho esisesifundeni se-${reg}: ${hint}`,
    },
    structures: {
      'cranium-skull': ['Ugebhezi Lwekhanda', 'Amathambo ayisishiyagalombili ogebhezi neshumi nane ebusweni avikela ubuchopho namehlo.', 'Izinsika zamathambo obuso zithwala amandla okuhlafuna ziwakhuphulele ogebhezini.', 'Indawo ye-pterion eceleni kwekhanda iseduze nomthambo wegazi obalulekile.', ['ugebhezi', 'ikhanda']],
      'mandible-tmj': ['Umhlathi ne-TMJ', 'Ithambo lekhanda elinyakazayo lodwa; livuleka kanye nezwi lakho kulesi sibuko.', 'Ukuvula umlomo kuqala ngokuphenduka bese kushibilika phambili.', 'Ukuphuka komhlathi kwenza isilevu sichezuke ngasohlangothini olulimele.', ['umhlathi', 'amazinyo']],
      'clavicle-scapula': ['Ithambo Lomqala neSiphanga', 'Ithambo le-clavicle elimise okuka-S nesiphanga esixhumanisa ingalo nesifuba.', 'Ukunyakaza kwehlombe kuhlanganisa i-humerus nesiphanga ngokubambisana.', 'Ingxenye ephakathi ye-clavicle iyona evame ukuphuka uma umuntu ewa.', ['ihlombe', 'isiphanga']],
      'ribcage-sternum': ['Izimbambo neSternum', 'Izimbambo ezingamaphini angu-12 ezivikela inhliziyo namaphaphu.', 'Izimbambo ziyaphakama futhi zinwebe ngokuphefumula ngakunye.', 'Izimbambo 4 kuya ku-9 zivame ukuphuka ekushayiseni kwesifuba.', ['izimbambo', 'isifuba']],
      'vertebral-column': ['Umhlandla (Spine)', 'Amathambo angu-24 omhlandla avikela umnkantsha womgogodla.', 'Ukugoba okungu-S komgogodla kubamba ukushaqeka kwesisindo somzimba.', 'Ukushelela kwediski kuvame ukwenzeka ezansi komhlane ku-L4–L5.', ['umgogodla', 'umhlane']],
      'pelvic-girdle': ['Ithambo Lezinqe (Pelvis)', 'Indandatho yamathambo ethwala isisindo somzimba isiyise emilenzeni.', 'Isikhoxe esijulile se-acetabulum sinikeza ukuzinza ekuhambeni.', 'Umphetho ophezulu we-pelvis ukhomba izinga le-L4.', ['izinqe', 'ukhalo']],
      humerus: ['Ithambo Lengalo Ephezulu', 'Ithambo elide lengalo elisuka ehlombe liye endololwaneni.', 'Ilunga lehlombe linezinga elikhulu kunawo wonke lokuphenduka.', 'Ukuphuka phakathi kwe-humerus kungathinta inzwane ye-radial.', ['ingalo', 'indololwane']],
      'radius-ulna': ['I-Radius ne-Ulna', 'Amathambo amabili engalo engezansi; i-radius izungeza phezu kwe-ulna ukuphendula intende.', 'Ukuphenduka kwentende yesandla kufinyelela ku-160 degrees.', 'Ukuphuka kwe-Colles esihlakaleni kuvamile emva kokuwa.', ['isihlakala']],
      'hand-skeleton': ['Isandla (Amathambo 27)', 'Amathambo angu-8 esihlakala, 5 entende, kanye ne-14 eminwe alandela iminwe yakho.', 'Ilunga lesithupha lisivumela ukuba sithinte yonke eminye iminwe.', 'Ukuphuka kwe-scaphoid kudinga ukunakekelwa okusheshayo kwegazi layo.', ['isandla', 'iminwe']],
      'femur-patella': ['Ithambo Lethanga neDolo', 'Ithambo elide nelinamandla kunawo wonke emzimbeni kanye nedolo (patella).', 'I-engeli yentamo ye-femur igcina idolo ngaphansi kwesisindo somzimba.', 'Ukuphuka kwentamo ye-femur kungaphazamisa ukuhamba kwegazi.', ['ithanga', 'idolo']],
      'tibia-fibula': ['umbala (Tibia ne-Fibula)', 'Ithambo lombala elithwala isisindo kanye ne-fibula ehlanganisa iqakala.', 'I-tibia ithwala amaphesenti angu-85 esisindo somlenze ongezansi.', 'Isikhumba esiphambi kombala sincane, ngakho ukuphuka kuvame ukuvela ngaphandle.', ['umbala', 'iqakala']],
      'foot-skeleton': ['Unyawo (Amathambo 26)', 'Amathambo eqakala nezinzwane akhiwe njengebhuloho ukuthwala umzimba.', 'Isicubu sentende yonyawo siyaqina uma uphakamisa isithende.', 'Ukuphenduka kweqakala kungadonsa ithambo lesihlanu lonyawo.', ['unyawo', 'isithende']],
      brain: ['Ubuchopho noMgogodla', 'Isikhungo sokucabanga, ukubona, ukuzwa nokulawula umzimba kuze kufike ku-L1.', 'Uketshezi lwe-CSFenza ubuchopho buntante futhi buvikeleke.', 'Umnkantsha womgogodla uphela ku-L1–L2 kubantu abadala.', ['ubuchopho']],
      heart: ['Inhliziyo neMithambo Emikhulu', 'Ipampu enamakamelo amane empompa amalitha angu-5 egazi ngomzuzu (72 BPM).', 'Amakamelo angezansi enhliziyo ayasonteka ukuze aphusele igazi ku-aorta.', 'Ukushaya kwenhliziyo kuzwakala phakathi kwembambo yesihlanu kwesobunxele.', ['inhliziyo', 'igazi']],
      lungs: ['Amaphaphu noMqala Wokuphefumula', 'Iphaphu langakwesokudla linezingxenye ezi-3; elakwesobunxele linezi-2.', 'Ukwehla kwesicubu se-diaphragm kudonsela umoya emaphashini.', 'Umhubhe womoya wangakwesokudla ubanzi kunowakwesobunxele.', ['amaphaphu', 'umoya']],
      liver: ['Isibindi neNyongo', 'Isitho sangaphakathi esikhulu kunazo zonke ngakwesokudla ngaphansi kwe-diaphragm.', 'Sehla ngamasentimitha angu-2–3 uma uphefumula kakhulu.', 'Ubuhlungu benyongo buvame ukuzwakala ehlombe langakwesokudla.', ['isibindi', 'inyongo']],
      stomach: ['Isisu neBende (Spleen)', 'Isikhwama sezicubu esimise okuka-J esigaya ukudla, nebende ngemuva kwaso.', 'Amagagasi amathathu ngomzuzu ahlanganisa ukudla.', 'Ibende yisona sitho esivame ukulimala kakhulu engozini yesisu.', ['isisu', 'ukudla']],
      intestines: ['Amathumbu (Amancane naMakhulu)', 'Amamitha ayisithupha amathumbu amancane azungezwe amathumbu amakhulu.', 'Amathumbu amakhulu amunca amanzi ngokucophelela.', 'Ubuhlungu be-appendicitis buqala enkabeni buye ezansi ngakwesokudla.', ['amathumbu']],
      kidneys: ['Izinso neSinye', 'Izihlungi ezimbili ezimise okwebhontshisi ngemuva kwesisu ezihlunga igazi.', 'Zihlunga amalitha angu-180 oketshezi lwegazi nsuku zonke.', 'Amatshe ezinso avame ukubhajwa emhubheni omncane we-ureter.', ['izinso', 'isinye']],
      'trunk-muscles': ['Izicubu Zesifuba, Ihlombe neSisu', 'Izicubu ze-pectoralis, i-deltoid nezesisu eziqinisa umzimba.', 'I-deltoid iphakamisa ingalo; izicubu zesisu zisekela umgogodla.', 'Izicubu zesisu zihlukaniswa imigqa eqinile.', ['izicubu zesifuba']],
      'arm-muscles': ['Izicubu Zengalo (Biceps & Triceps)', 'I-biceps igoba indololwane kanti i-triceps iyayelula.', 'I-biceps iphinde iphendule intende yesandla ibheke phezulu.', 'Ukudabuka kwe-biceps kuveza iqhuzuku engalweni.', ['izicubu zengalo']],
      'leg-muscles': ['Izicubu Zethanga neSitho', 'I-quadriceps yelula idolo; i-hamstrings nesicubu sesitho kuqhuba ukuhamba.', 'umsipha we-Achilles esithendeni unikeza amandla okugijima.', 'Ukulimala kwe-hamstring kuvame ukwenzeka uma ugijima ngesivinini.', ['izicubu zomlenze']],
    },
  },

  am: {
    ui: {
      coachBadge: 'የሰውነት አሰልጣኝ · አማርኛ',
      welcomeTitle: 'እንኳን ደህና መጡ! ስለ ማንኛውም የሰውነት ክፍል ይጠይቁ',
      welcomeBody: 'በአማርኛ ማብራሪያ እና ድምጽ ለመስማት በ3D ምስሉ ላይ ማንኛውንም አጥንት ወይም የውስጥ አካል ይንኩ።',
      howItWorksBtn: 'እንዴት እንደሚሰራ',
      clinicalNoteBtn: 'የህክምና ማስታወሻ',
      speakBtn: 'ድምጽ ያዳምጡ',
      askVoiceBtn: 'በድምጽ ይጠይቁ',
      askInputLabel: 'አሰልጣኙን ይጠይቁ',
      askPlaceholder: 'ምሳሌ፡ ልብ እንዴት ይሰራል? / የእጅ አጥንቶች…',
      askSendBtn: 'ጠይቅ',
      quizTitle: 'ይህን የሰውነት ክፍል ያግኙ',
      skipBtn: 'ዝለል',
      nextCaseBtn: 'ቀጣይ ጉዳይ',
      hearHintBtn: 'ፍንጭ ይስሙ',
      correctPrefix: 'ጎበዝ! ትክክል ነው',
      tryAgainPrefix: 'ይህ',
      diagnosedPrefix: 'ስብራቱ ተገኝቷል',
      regions: { head: 'ራስ', thorax: 'ደረት', abdomen: 'ሆድ', pelvis: 'ዳሌ', 'upper limb': 'እጅ', 'lower limb': 'እግር' },
      boneCommands: ['አጥንት', 'አጥንቶች', 'skeleton'],
      organCommands: ['የውስጥ አካላት', 'ልብ', 'organs'],
      muscleCommands: ['ጡንቻ', 'ጡንቻዎች', 'muscles'],
      allCommands: ['ሁሉም', 'ሁሉንም አሳይ'],
      explodeCommands: ['ለያይ', 'explode'],
      biomechTriggers: ['ይሰራል', 'እንቅስቃሴ', 'work', 'move'],
      clinicalTriggers: ['ህክምና', 'ስብራት', 'clinical', 'fracture'],
      explainSummary: (n, _lat, f) => `${n}፦ ${f}`,
      explainBiomech: (_n, f) => f,
      explainClinical: (_n, f) => f,
      quizClueTemplate: (hint, reg) => `በ${reg} አካባቢ የሚገኝ ክፍል፦ ${hint}`,
    },
    structures: {
      'cranium-skull': ['የራስ ቅል (Skull)', 'አንጎልንና ዓይኖችን የሚጠብቁ ስምንት የራስ ቅል እና አስራ አራት የፊት አጥንቶች።', 'የፊት አጥንት ምሰሶዎች የማኘክ ኃይልን ወደ ራስ ቅል ያሰራጫሉ።', 'በጭንቅላት ጎን የሚገኘው ቴሪዮን (pterion) ከዋና የደም ቧንቧ በላይ ይገኛል።', ['የራስ ቅል', 'ራስ', 'ጭንቅላት']],
      'mandible-tmj': ['መንጋጋ እና TMJ መገጣጠሚያ', 'ብቸኛው ተንቀሳቃሽ የራስ ቅል አጥንት፤ ከድምጽዎ ጋር አብሮ ይከፈታል።', 'አፍ መክፈት በማዞር ይጀምርና ወደ ፊት ይንሸራተታል።', 'የመንጋጋ አንገት ስብራት አገጭ ወደ ተጎዳው ጎን እንዲያዘነብል ያደርጋል።', ['መንጋጋ', 'ጥርስ', 'አፍ']],
      'clavicle-scapula': ['የትከሻ አጥንት (Clavicle & Scapula)', 'የS ቅርጽ ያለው ክላቪክል እና የትከሻ ምላጭ ክንድን ከሰውነት ጋር ያያይዛሉ።', 'ክንድ ሲነሳ የትከሻ መገጣጠሚያና ስካፑላ በ2 ለ 1 ጥምርታ ይንቀሳቀሳሉ።', 'የክላቪክል መካከለኛ ክፍል በመውደቅ ጊዜ በብዛት ይሰበራል።', ['ትከሻ']],
      'ribcage-sternum': ['የጎድን አጥንቶች እና ደረት', 'ልብንና ሳንባዎችን የሚከላከሉ 12 ጥንድ የጎድን አጥንቶች።', 'በእያንዳንዱ ትንፋሽ የጎድን አጥንቶች ወደ ላይ እና ወደ ውጭ ይሰፋሉ።', 'ከ4ኛ እስከ 9ኛ ያሉት የጎድን አጥንቶች በአደጋ ጊዜ በብዛት ይጎዳሉ።', ['ጎድን', 'ደረት']],
      'vertebral-column': ['የጀርባ አጥንት (Spine)', 'የህብለ ሰረሰርን የሚጠብቁ 24 ተንቀሳቃሽ አከርካሪዎች እና ሳክረም።', 'የS ቅርጽ ያለው ኩርባ የሰውነት ክብደትን እንደ ስፕሪንግ ይቀበላል።', 'የዲስክ መንሸራተት በብዛት በL4–L5 እና L5–S1 ላይ ይከሰታል።', ['አከርካሪ', 'ጀርባ']],
      'pelvic-girdle': ['የዳሌ አጥንት (Pelvis)', 'የላይኛውን የሰውነት ክብደት ወደ ሁለቱም እግሮች የሚያስተላልፍ የአጥንት ቀለበት።', 'ጥልቅ የሆነው አሴታቡለም ለዳሌ መገጣጠሚያ ጥንካሬ ይሰጣል።', 'የዳሌው የላይኛው ጫፍ የL4 አከርካሪ ደረጃን ያመለክታል።', ['ዳሌ']],
      humerus: ['የላይኛው ክንድ አጥንት (Humerus)', 'ከትከሻ እስከ ክርን የሚደርስ ረጅም የክንድ አጥንት።', 'የትከሻ መገጣጠሚያ በሰውነት ውስጥ ሰፊ የእንቅስቃሴ አድማስ አለው።', 'የመካከለኛው ክፍል ስብራት የሬዲያል ነርቭን ሊጎዳ ይችላል።', ['ክንድ', 'ክርን']],
      'radius-ulna': ['ሬዲየስ እና አልና (የታችኛው ክንድ)', 'ሁለቱ የታችኛው ክንድ አጥንቶች፤ መዳፍን ለማዞር ሬዲየስ በአልና ላይ ይሽከረከራል።', 'መዳፍን ወደ ላይና ወደ ታች ማዞር እስከ 160 ዲግሪ ይደርሳል።', 'በእጅ ላይ ከወደቁ በኋላ የሬዲየስ ጫፍ ስብራት የተለመደ ነው።', ['የእጅ አንጓ']],
      'hand-skeleton': ['እጅ (27 አጥንቶች)', '8 የእጅ አንጓ፣ 5 የመዳፍ እና 14 የጣት አጥንቶች ከጣቶችዎ ጋር በቀጥታ ይንቀሳቀሳሉ።', 'የአውራ ጣት መገጣጠሚያ እያንዳንዱን የጣት ጫፍ ለመንካት ያስችላል።', 'የስካፎይድ አጥንት ስብራት ለደም ዝውውሩ አስቸኳይ ክትትል ያስፈልገዋል።', ['እጅ', 'ጣት', 'መዳፍ']],
      'femur-patella': ['የጭን አጥንት እና የጉልበት ክዳን', 'በሰውነት ውስጥ ረጅሙና ጠንካራው አጥንት ከጉልበት ፓቴላ ጋር።', 'የፌመር አንገት አንግል ጉልበትን በሰውነት ክብደት ማዕከል ስር ያደርገዋል።', 'የፌመር አንገት ስብራት የደም አቅርቦትን ሊያቋርጥ ይችላል።', ['ጭን', 'ጉልበት']],
      'tibia-fibula': ['የባት አጥንቶች (Tibia & Fibula)', 'ክብደት ተሸካሚው ቲቢያ እና ቀጭኑ ፊቡላ የቁርጭምጭሚት መገጣጠሚያን ይፈጥራሉ።', 'ቲቢያ የታችኛውን እግር ክብደት 85% ይሸከማል።', 'በቲቢያ ፊት ላይ ያለው ቆዳ ስስ በመሆኑ ክፍት ስብራት ሊያጋጥም ይችላል።', ['ባት', 'ቁርጭምጭሚት']],
      'foot-skeleton': ['እግር (26 አጥንቶች)', 'ክብደትን ለመሸከም እንደ ቅስት የተደረደሩ የእግርና የጣት አጥንቶች።', 'ተረከዝ ሲነሳ የእግር ሥር ጅማት ተወጥሮ ለመራመድ ኃይል ይሰጣል።', 'የቁርጭምጭሚት መወለቅ የአምስተኛውን ሜታታርሳል ስብራት ሊያስከትል ይችላል።', ['እግር', 'ተረከዝ']],
      brain: ['አንጎል እና ህብለ ሰረሰር', 'የአስተሳሰብ፣ የማየት፣ የመስማት እና የእንቅስቃሴ መቆጣጠሪያ ማዕከል።', 'አንጎል በCSF ፈሳሽ ውስጥ ስለሚንሳፈፍ ከግጭት ይጠበቃል።', 'ህብለ ሰረሰር በአዋቂዎች ላይ በL1–L2 አካባቢ ያበቃል።', ['አንጎል', 'ነርቭ']],
      heart: ['ልብ እና ትላልቅ የደም ቧንቧዎች', 'በደቂቃ 72 ጊዜ እየመታ 5 ሊትር ደም የሚረጭ ባለ አራት ክፍል ፓምፕ።', 'የልብ ታችኛ ክፍሎች ሲኮማተሩ በመጠምዘዝ ደምን ወደ አኦርታ ይገፋሉ።', 'የልብ ምት በግራ ደረት 5ኛ የጎድን ክፍተት ላይ ይሰማል።', ['ልብ', 'ደም']],
      lungs: ['ሳንባዎች እና የአየር ቧንቧ', 'የቀኝ ሳንባ 3 ክፍሎች ሲኖሩት የግራው ለልብ ቦታ ለመስጠት 2 አሉት።', 'የዲያፍራም ጡንቻ ወደ ታች ሲወርድ አየር ወደ ሳንባ ይገባል።', 'የቀኝ የአየር ቧንቧ ሰፊና ቀጥ ያለ ነው።', ['ሳንባ', 'ትንፋሽ']],
      liver: ['ጉበት እና የሐሞት ከረጢት', 'ከዲያፍራም በታች በቀኝ በኩል የሚገኝ ትልቁ የውስጥ አካል።', 'በጥልቅ ትንፋሽ ጊዜ ከ2–3 ሴ.ሜ ወደ ታች ይወርዳል።', 'የሐሞት ከረጢት ህመም ወደ ቀኝ ትከሻ ጫፍ ሊሰራጭ ይችላል።', ['ጉበት', 'ሐሞት']],
      stomach: ['ጨጓራ እና ጣፊያ (Spleen)', 'ምግብን የሚፈጭ የJ ቅርጽ ያለው የጡንቻ ከረጢት ከስፕሊን ጋር።', 'በደቂቃ ሶስት ሞገዶች ምግብን ያዋህዳሉ።', 'በሆድ አደጋ ጊዜ ስፕሊን በብዛት የሚጎዳ አካል ነው።', ['ጨጓራ', 'ጣፊያ']],
      intestines: ['ትንሹ እና ትልቁ አንጀት', 'በትልቁ አንጀት የተከበበ 6 ሜትር ርዝመት ያለው ትንሹ አንጀት።', 'ትልቁ አንጀት ውሃን በዝግታ ይመጥጣል።', 'የትርፍ አንጀት ህመም ከእምብርት ጀምሮ ወደ ታችኛው ቀኝ ሆድ ይሄዳል።', ['አንጀት']],
      kidneys: ['ኩላሊት እና ፊኛ', 'ደምን የሚያጣሩ ሁለት የባቄላ ቅርጽ ያላቸው የጀርባ አካላት።', 'በቀን ወደ 180 ሊትር የደም ፈሳሽ ያጣራሉ።', 'የኩላሊት ጠጠር በዩሬተር ጠባብ ቦታዎች ላይ ሊይዝ ይችላል።', ['ኩላሊት', 'ፊኛ']],
      'trunk-muscles': ['የደረት፣ የትከሻ እና የሆድ ጡንቻዎች', 'ሰውነትን የሚያጸኑ ፔክቶራሊስ፣ ዴልቶይድ እና የሆድ ጡንቻዎች።', 'ዴልቶይድ ክንድን ያነሳል፤ የሆድ ጡንቻዎች አከርካሪን ይደግፋሉ።', 'የሆድ ጡንቻ ክፍልፋዮች በጅማት መስመሮች ይለያሉ።', ['የደረት ጡንቻ']],
      'arm-muscles': ['የክንድ ጡንቻዎች (Biceps & Triceps)', 'ባይሴፕስ ክርንን ያጥፋል፣ ትራይሴፕስ ደግሞ ይዘረጋል።', 'ባይሴፕስ መዳፍን ወደ ላይ ለማዞርም ይረዳል።', 'የባይሴፕስ ጅማት መበጠስ በክንድ ላይ እብጠት ይፈጥራል።', ['የክንድ ጡንቻ']],
      'leg-muscles': ['የጭን እና የባት ጡንቻዎች', 'ኳድሪሴፕስ ጉልበትን ይዘረጋል፤ የባት ጡንቻዎች ለመራመድ ይረዳሉ።', 'የአኪለስ ጅማት ለመሮጥና ለመዝለል ከፍተኛ ኃይል ይሰጣል።', 'የሃምስትሪንግ መሳብ በፍጥነት ሩጫ ወቅት ያጋጥማል።', ['የእግር ጡንቻ']],
    },
  },

  pcm: {
    ui: {
      coachBadge: 'Body Coach · Naija Pidgin',
      welcomeTitle: 'How far! Ask anything about your body parts',
      welcomeBody: 'Touch any bone or organ for the 3D mirror make I break am down for clean Naija Pidgin.',
      howItWorksBtn: 'How e dey work',
      clinicalNoteBtn: 'Doctor Tori',
      speakBtn: 'Hear Coach Voice',
      askVoiceBtn: 'Talk with Mic',
      askInputLabel: 'Ask Body Coach',
      askPlaceholder: 'E.g. How heart dey pump blood? / Hand bone…',
      askSendBtn: 'Ask am',
      quizTitle: 'Find this body part sharperly',
      skipBtn: 'Next question',
      nextCaseBtn: 'Next patient case',
      hearHintBtn: 'Hear expo hint',
      correctPrefix: 'Correct! Na you biko',
      tryAgainPrefix: 'No worry, dat one na',
      diagnosedPrefix: 'We don catch the fracture',
      regions: { head: 'Head', thorax: 'Chest', abdomen: 'Belle', pelvis: 'Waist', 'upper limb': 'Arm & Hand', 'lower limb': 'Leg & Lap' },
      boneCommands: ['bone', 'bones', 'skeleton', 'kpomo bone'],
      organCommands: ['organ', 'organs', 'belle things', 'heart'],
      muscleCommands: ['muscle', 'muscles', 'power'],
      allCommands: ['everything', 'show all', 'all join'],
      explodeCommands: ['scatter am', 'open am', 'explode'],
      biomechTriggers: ['work', 'move', 'how e dey', 'function'],
      clinicalTriggers: ['doctor', 'clinical', 'wound', 'fracture', 'break'],
      explainSummary: (n, _lat, f) => `${n}. ${f}`,
      explainBiomech: (_n, f) => f,
      explainClinical: (_n, f) => f,
      quizClueTemplate: (hint, reg) => `Check ${reg} side: ${hint}`,
    },
    structures: {
      'cranium-skull': ['Skull (Head Bone)', 'Eight brain-box bones plus fourteen face bones join body together to guard your brain and eyes.', 'Strong bone pillars for your face dey carry chewing power go up without cracking.', 'The side of your temple wey dem dey call pterion soft well-well; big blood vessel dey under am.', ['skull', 'head bone']],
      'mandible-tmj': ['Jaw Bone & TMJ Hinge', 'Na the only bone for skull wey fit waka; e dey open follow your voice live for this mirror!', 'When you open mouth, e go first bend small before e slide come front.', 'If person break the neck of jaw bone, the chin go bend face the side wey wound.', ['jaw', 'chin', 'mouth', 'teeth']],
      'clavicle-scapula': ['Collarbone & Shoulder Blade', 'S-shape collarbone join hand with flat shoulder blade to hang your arm steady.', 'Anytime you raise hand, shoulder joint and blade dey move 2-to-1 together.', 'If person fall land for shoulder, na middle of collarbone dey quick break pass.', ['collarbone', 'shoulder']],
      'ribcage-sternum': ['Ribcage & Chest Bone', 'Twelve pairs of ribs round your chest like iron protector for heart and lungs.', 'Every time you breathe in, the ribs dey lift up and spread wide.', 'Rib number 4 reach 9 na dem dey break pass if heavy blow jam chest.', ['ribs', 'chest']],
      'vertebral-column': ['Backbone (Spine)', 'Twenty-four stacked bones plus sacrum with soft disc cushion wey guard spinal cord.', 'The S-bend for your back dey soak shock like motor spring when you jump.', 'Slipped disc waist pain dey happen pass for L4–L5 and L5–S1.', ['backbone', 'spine', 'back']],
      'pelvic-girdle': ['Waist & Hip Bone (Pelvis)', 'Strong bone ring wey carry all the upper body weight share am enter your two legs.', 'Deep hip socket dey hold thigh bone tight make you fit run and balance.', 'Top of your hip bone line up straight with L4 backbone.', ['waist', 'hip', 'pelvis']],
      humerus: ['Upper Arm Bone (Humerus)', 'The big long bone from your shoulder reach your elbow.', 'Shoulder joint fit turn round pass any other joint for body.', 'If middle of humerus break, e fit touch radial nerve make wrist weak.', ['upper arm', 'elbow']],
      'radius-ulna': ['Forearm Bones (Radius & Ulna)', 'Two partner bones for forearm; radius dey cross ulna when you turn your palm.', 'You fit twist your palm almost 160 degrees without moving shoulder.', 'If person stretch hand fall for ground, wrist-end of radius fit crack (Colles fracture).', ['forearm', 'wrist']],
      'hand-skeleton': ['Hand (27 Bones)', '8 wrist bones, 5 palm bones and 14 finger bones wey dey move 1-to-1 with your real fingers.', 'Your thumb joint special well-well so e fit touch every single fingertip.', 'Small scaphoid bone near thumb base need quick check if wrist pain you after fall.', ['hand', 'finger', 'palm']],
      'femur-patella': ['Lap Bone & Kneecap', 'The longest and strongest bone for your whole body, plus patella pulley for knee.', 'The bend for femur neck dey keep your knees straight under your body balance.', 'Broken femur neck for old people fit disturb blood wey dey feed the hip head.', ['lap', 'thigh', 'knee']],
      'tibia-fibula': ['Shin Bone & Fibula', 'Strong shin bone (tibia) and slim fibula wey lock your ankle tight.', 'Tibia alone dey carry 85% of the load for your lower leg.', 'Skin for front of shin thin well-well, so hard tackle fit wound the bone sharp-sharp.', ['shin', 'ankle']],
      'foot-skeleton': ['Foot (26 Bones)', 'Ankle and toe bones build like strong bridge arch to carry your whole body.', 'When you push off with your toes, sole ligament dey tight up like catapult.', 'Ankle twist fit pull small piece comot for base of the fifth toe bone.', ['foot', 'toe', 'heel']],
      brain: ['Brain & Spinal Cord', 'The headquarters wey control thinking, sight, hearing, and every move reach L1.', 'Special clear water (CSF) dey float your 1.4 kg brain protect am.', 'Spinal cord stop for L1–L2, so doctors dey test back water safely for L3–L4.', ['brain', 'sense']],
      heart: ['Heart & Big Blood Vessels', 'Four-room engine wey dey pump 5 litres of blood every minute at 72 beats!', 'The bottom rooms dey twist squeeze blood enter main aorta pipe.', 'You fit feel heart beat for left chest under the fifth rib space.', ['heart', 'blood']],
      lungs: ['Lungs & Windpipe', 'Right lung get 3 parts; left lung get 2 parts make space dey for heart.', 'When diaphragm muscle pull down, fresh air go rush enter lungs.', 'Right windpipe wider and straighter pass left own.', ['lungs', 'breath', 'air']],
      liver: ['Liver & Gallbladder', 'The biggest internal organ under your right ribs wey clean blood and make bile.', 'Liver dey shift down 2–3 cm anytime you draw deep breath.', 'Gallbladder pain fit travel show face for top of your right shoulder.', ['liver']],
      stomach: ['Belle (Stomach) & Spleen', 'J-shape muscle bag wey grind food with acid, plus spleen behind am for left.', 'Three muscle waves every minute dey mix food smooth.', 'Spleen soft well-well, na im quick wound pass if heavy thing hit belle.', ['belle', 'stomach', 'food']],
      intestines: ['Small & Big Intestine', 'Six metres of coiled food pipe framed round by the big colon.', 'Big intestine dey soak water back enter body slowly.', 'Appendix pain dey start near navel before e waka go down-right belle.', ['intestine', 'gut']],
      kidneys: ['Kidneys & Bladder', 'Two bean-shape filters for back of belle wey wash blood comot waste.', 'Dem dey filter 180 litres of fluid every blessed day!', 'Kidney stone fit jam road inside the narrow ureter pipe.', ['kidney', 'bladder']],
      'trunk-muscles': ['Chest, Shoulder & Six-Pack Muscles', 'Pectoralis, deltoid, abs, and back muscles wey hold your posture gallant.', 'Deltoid dey lift arm; six-pack abs dey lock your waist strong.', 'Those six-pack lines na tough tendon bands across the belle muscle.', ['chest muscle', 'six pack', 'abs']],
      'arm-muscles': ['Arm Muscles (Biceps & Triceps)', 'Biceps dey bend elbow carry load; triceps dey straighten arm back.', 'Biceps na im strong pass for turning palm face up.', 'If biceps tendon cut, the muscle go roll up like ball.', ['biceps', 'arm muscle']],
      'leg-muscles': ['Lap & Calf Muscles', 'Quadriceps straighten knee; hamstrings and calf muscles power your waka and run.', 'Thick Achilles cord for heel dey give you spring power to jump.', 'Sprinters dey quick pull hamstring when leg stretch finish.', ['calf', 'lap muscle']],
    },
  },

  so: {
    ui: {
      coachBadge: 'Tababaraha Jidhka · Af-Soomaali',
      welcomeTitle: 'Soo dhawoow! Wax ka weydii xubnaha jidhka',
      welcomeBody: 'Taabo laf kasta ama xubin kasta oo muraayadda 3D ah si aad u maqasho sharraxaad Af-Soomaali ah.',
      howItWorksBtn: 'Sida ay u shaqeyso',
      clinicalNoteBtn: 'Xog caafimaad',
      speakBtn: 'Dhageyso codka',
      askVoiceBtn: 'Cod ku weydii',
      askInputLabel: 'Weydii tababaraha',
      askPlaceholder: 'Tusaale: Wadnuhu sidee buu u shaqeeyaa?…',
      askSendBtn: 'Weydii',
      quizTitle: 'Hel xubintan jidhka',
      skipBtn: 'Ka bood',
      nextCaseBtn: 'Kiiska xiga',
      hearHintBtn: 'Maqal tilmaan',
      correctPrefix: 'Hambalyo! Waa sax',
      tryAgainPrefix: 'Kani waa',
      diagnosedPrefix: 'Jabka waa la helay',
      regions: { head: 'Madaxa', thorax: 'Laabta', abdomen: 'Caloosha', pelvis: 'Miskaha', 'upper limb': 'Gacanta', 'lower limb': 'Lugta' },
      boneCommands: ['lafo', 'laf', 'skeleton'],
      organCommands: ['xubnaha', 'wadnaha', 'organs'],
      muscleCommands: ['muruqyada', 'muruq', 'muscles'],
      allCommands: ['dhammaan', 'tus kulli'],
      explodeCommands: ['kala bixi', 'explode'],
      biomechTriggers: ['shaqeyso', 'dhaqaaq', 'work', 'move'],
      clinicalTriggers: ['caafimaad', 'jab', 'clinical', 'fracture'],
      explainSummary: (n, _lat, f) => `${n}. ${f}`,
      explainBiomech: (_n, f) => f,
      explainClinical: (_n, f) => f,
      quizClueTemplate: (hint, reg) => `Qaybta ${reg}: ${hint}`,
    },
    structures: {
      'cranium-skull': ['Laf-madaxeedka (Skull)', 'Siddeed lafood oo maskaxda ah iyo afar iyo toban wejiga ah oo ilaaliya maskaxda iyo indhaha.', 'Tiirarka lafaha wejiga ayaa qaada xoogga calalinta.', 'Dhinaca madaxa ee pterion waxaa ku hoos jira xidid dhiig oo muhiim ah.'],
      'mandible-tmj': ['Daanka iyo Kala-goyska TMJ', 'Lafta keliya ee madaxa ee dhaqaaqda; waxay la furantaa codkaaga.', 'Af-furistu waxay ku bilaabataa wareeg yar ka hor intaysan hore u siiban.', 'Jabka luqunta daanka wuxuu gadhka u leexiyaa dhinaca dhaawacmay.'],
      'clavicle-scapula': ['Kalxanta iyo Garabka', 'Lafta kalxanta ee u eg S iyo lafta garabka ee haya gacanta.', 'Dhaqaaqa garabku wuxuu isku daraa humerus iyo scapula.', 'Badhtamaha kalxanta ayaa ugu badan meelaha jabta marka la dhaco.'],
      'ribcage-sternum': ['Feeraha iyo Laabta', '12 lammaane oo feero ah oo ilaaliya wadnaha iyo sambabada.', 'Feeruhu kor bay u kacaan neef kasta oo la qaato.', 'Feeraha 4aad ilaa 9aad ayaa ugu nugul jugta.'],
      'vertebral-column': ['Laf-dhabarta (Spine)', '24 lafood oo is-dulsaaran oo ilaaliya xangullaha.', 'Qaabka S ee dhabarta ayaa nuuga culayska jidhka.', 'Riixitaanka saxanka dhabarku wuxuu ku badan yahay L4–L5.'],
      'pelvic-girdle': ['Miskaha (Pelvis)', 'Garaangar laf ah oo culayska jidhka u gudbisa labada lugood.', 'Godka miskuhu wuxuu bixiyaa xasillooni adag.', 'Fiinta sare ee miskuhu waxay tilmaamaysaa heerka L4.'],
      humerus: ['Lafta Cududda (Humerus)', 'Lafta dheer ee u dhaxaysa garabka iyo xusulka.', 'Kala-goyska garabku waa kan ugu wareegga ballaadhan jidhka.', 'Jabka badhtamaha cududdu wuxuu dhaawici karaa neerfaha radial.'],
      'radius-ulna': ['Radius iyo Ulna', 'Labada lafood ee dhudhunka; radius ayaa wareegta si calaacashu u jeesato.', 'Wareegga calaacashu wuxuu gaadhaa ilaa 160 digrii.', 'Jabka dhammaadka radius waa mid caadi ah marka gacanta lagu dhaco.'],
      'hand-skeleton': ['Gacanta (27 Lafood)', '8 lafood oo curcurka ah, 5 calaacasha ah iyo 14 faraha ah.', 'Kala-goyska suulka ayaa u oggolaanaya inuu taabto far kasta.', 'Jabka lafta scaphoid wuxuu u baahan yahay daryeel degdeg ah.'],
      'femur-patella': ['Lafta Bowdada iyo Jilibka', 'Lafta ugu dheer uguna adag jidhka oo ay weheliso lafta jilibka.', 'Xagasha luqunta bowdadu waxay jilibka ku haysaa miisaanka hoostiisa.', 'Jabka luqunta femur wuxuu gooyn karaa dhiigga madaxa lafta.'],
      'tibia-fibula': ['Lafta Dhudhun-lugoodka (Tibia & Fibula)', 'Lafta weyn ee dhudhunka lugta iyo fibula oo dhisa canqowga.', 'Tibia waxay qaaddaa 85% culayska lugta hoose.', 'Maqaarka hore ee tibia waa khafiif.'],
      'foot-skeleton': ['Cagta (26 Lafood)', 'Lafaha cagta iyo suulasha oo u dhisan sida biriij culayska qaada.', 'Seedda hoose ee cagtu way adkaataa marka cidhibta la qaado.', 'Murkashada canqowgu waxay jiidi kartaa lafta shanaad ee cagta.'],
      brain: ['Maskaxda iyo Xangullaha', 'Xarunta fikirka, aragga, maqalka iyo xukunka dhaqaaqa.', 'Dheecaanka CSF ayaa maskaxda ka ilaaliya jugta.', 'Xangulluhu wuxuu ku dhammaadaa L1–L2 dadka waaweyn.'],
      heart: ['Wadnaha iyo Xididdada Waaweyn', 'Bam afar qol leh oo daqiiqaddii tuura 5 liitar oo dhiig ah (72 BPM).', 'Qolalka hoose ee wadnuhu way is-maroojiyaan si ay dhiigga ugu riixaan aorta.', 'Garaaca wadnaha waxaa laga dareemaa feerta shanaad ee bidix.'],
      lungs: ['Sambabada iyo Dhuunta Hawo', 'Sambabka midig wuxuu leeyahay 3 qaybood; kan bidixna 2 qaybood.', 'Soo degidda muruqa diaphragm ayaa hawada soo gelisa sambabada.', 'Dhuunta hawo ee midig ayaa ka ballaadhan tan bidix.'],
      liver: ['Beerka iyo Xameetida', 'Xubinta ugu weyn gudaha jidhka oo ku taal midigta sare ee caloosha.', 'Wuxuu hoos u dhaqaaqaa 2–3 cm marka neef dheer la qaato.', 'Xanuunka xameetidu wuxuu u gudbi karaa garabka midig.'],
      stomach: ['Caloosha iyo Beeryarada', 'Kiish muruq ah oo u eg J oo shiida cuntada iyo beeryarada.', 'Saddex hir oo daqiiqaddii ah ayaa cuntada qasa.', 'Beeryaradu waa xubinta ugu badan ee ku dhaawacanta shilalka caloosha.'],
      intestines: ['Mindhicirka Yar iyo Kan Weyn', 'Lix mitir oo mindhicirka yar ah oo uu ku wareegsan yahay kan weyn.', 'Mindhicirka weyn ayaa biyaha dib ugu nuuga jidhka.', 'Xanuunka appendicitis wuxuu u guuraa midigta hoose ee caloosha.'],
      kidneys: ['Kelyaha iyo Kaadi-haysta', 'Laba miire oo digir u eg oo dhiigga sifeeya.', 'Waxay maalin kasta sifeeyaan ilaa 180 liitar oo dareere ah.', 'Dhagaxa kelyuhu wuxuu ku dhegi karaa tuubada ureter.'],
      'trunk-muscles': ['Muruqyada Laabta, Garabka iyo Caloosha', 'Muruqyada pectoralis, deltoid iyo caloosha ee jidhka toosiya.', 'Deltoid wuxuu kor u qaadaa gacanta; muruqyada calooshuna dhabarta ayay taageeraan.', 'Qaybaha muruqa caloosha waxaa kala sooca seedo adag.'],
      'arm-muscles': ['Muruqyada Gacanta (Biceps & Triceps)', 'Biceps wuxuu laabaa xusulka, triceps-na wuu fidiyaa.', 'Biceps sidoo kale wuxuu kor u jeediyaa calaacasha.', 'Go’itaanka seedda biceps wuxuu keenaa barar cududda ah.'],
      'leg-muscles': ['Muruqyada Bowdada iyo Kubka', 'Quadriceps wuxuu fidiyaa jilibka; muruqyada kubkuna socodka ayay wadaan.', 'Seedda Achilles ee cidhibta ayaa bixisa awoodda orodka.', 'Jiidanka hamstring wuxuu dhacaa xilliga orodka dheereeya.'],
    },
  },

  af: {
    ui: {
      coachBadge: 'Anatomie-afrigter · Afrikaans',
      welcomeTitle: 'Welkom! Vra oor enige liggaamsdeel',
      welcomeBody: 'Klik of wys na enige been of orgaan in die 3D-spieël vir ’n verduideliking in Afrikaans.',
      howItWorksBtn: 'Hoe dit werk',
      clinicalNoteBtn: 'Kliniese nota',
      speakBtn: 'Luister na afrigter',
      askVoiceBtn: 'Vra met stem',
      askInputLabel: 'Vra die afrigter',
      askPlaceholder: 'Bv. Hoe werk die hart? / Handbene…',
      askSendBtn: 'Vra',
      quizTitle: 'Vind hierdie struktuur',
      skipBtn: 'Slaan oor',
      nextCaseBtn: 'Volgende geval',
      hearHintBtn: 'Hoor leidraad',
      correctPrefix: 'Uitstekend! Korrek',
      tryAgainPrefix: 'Dit is die',
      diagnosedPrefix: 'Fraktuur opgespoor',
      regions: { head: 'Kop', thorax: 'Borskas', abdomen: 'Buik', pelvis: 'Bekken', 'upper limb': 'Bo-arm & Hand', 'lower limb': 'Been & Voet' },
      boneCommands: ['bene', 'geraamte', 'skelet', 'skeleton'],
      organCommands: ['organe', 'hart', 'organs'],
      muscleCommands: ['spiere', 'spier', 'muscles'],
      allCommands: ['alles', 'wys alles'],
      explodeCommands: ['ontplof', 'skei lae', 'explode'],
      biomechTriggers: ['werk', 'beweeg', 'funksie', 'work'],
      clinicalTriggers: ['klinies', 'fraktuur', 'breuk', 'clinical'],
      explainSummary: (n, _lat, f) => `${n}. ${f}`,
      explainBiomech: (_n, f) => f,
      explainClinical: (_n, f) => f,
      quizClueTemplate: (hint, reg) => `Struktuur in die ${reg}: ${hint}`,
    },
    structures: {
      'cranium-skull': ['Skedel (Skull)', 'Agt skedel- en veertien gesigsbene wat die brein en oogkaste beskerm.', 'Gesigspilare gelei koukragte veilig na die skedelgewelf.', 'Die pterion lê bo die middelste meningeale slagaar.'],
      'mandible-tmj': ['Kakebeen & TMJ-gewrig', 'Die enigste beweeglike skedelbeen; dit beweeg regstreeks saam met jou stem.', 'Oopmaak begin met ~15° rotasie gevolg deur voorwaartse gly.', 'By ’n subkondilêre breuk wyk die ken na die beseerde kant uit.'],
      'clavicle-scapula': ['Sleutelbeen & Skouerblad', 'S-vormige sleutelbeen en driehoekige skouerblad wat die arm dra.', 'Skouer-ritme kombineer 2° armbeweging vir elke 1° skouerbladrotasie.', 'Die middelste derde van die sleutelbeen breek die maklikste tydens ’n val.'],
      'ribcage-sternum': ['Ribbekas & Borsbeen', '12 paar ribbes en die sternum wat die hart en longe beskerm.', 'Die ribbekas lig en sit uit met elke asemteug.', 'Ribbes 4 tot 9 breek die meeste tydens stomp borskasbeserings.'],
      'vertebral-column': ['Werwelkolom (Rugstring)', '24 beweeglike werwels plus die sakrum wat die rugmurg beskerm.', 'Die S-kurwe absorbeer skok soos ’n veer tydens stap en draf.', 'Skyfiebreuke kom meestal by L4–L5 en L5–S1 voor.'],
      'pelvic-girdle': ['Bekken (Pelvis)', 'Benige ring wat bolyfgewig na albei heuppotjies oordra.', 'Die diep asetabulum gee hoë stabiliteit onder las.', 'Die iliakale kam dui die L4-werwelvlak aan.'],
      humerus: ['Bo-armbeen (Humerus)', 'Die lang been tussen die skouer en die elmboog.', 'Die skouergewrig het die grootste bewegingsomvang in die liggaam.', 'Middelskagbreuke kan die radiale senuwee beseer.'],
      'radius-ulna': ['Radius & Ulna', 'Voorarmbene; die radius draai oor die ulna om die handpalm te draai.', 'Pronasie en supinasie strek oor sowat 160°.', 'Colles-frakture van die distale radius is algemeen ná ’n val op die hand.'],
      'hand-skeleton': ['Hand (27 Bene)', '8 karpale, 5 metakarpale en 14 falanges wat regstreeks saam met jou vingers beweeg.', 'Die saalvormige duimgewrig laat die duim elke vingerpunt raak.', 'Skafoïedfrakture vereis vroeë sorg weens kwesbare bloedtoevoer.'],
      'femur-patella': ['Dybeen & Knieskyf', 'Die langste en sterkste been met die patella as katrol voor die knie.', 'Die nekhoek hou die knie reg onder die liggaam se swaartepunt.', 'Femurnekfrakture kan bloedtoevoer na die femurkop ontwrig.'],
      'tibia-fibula': ['Skeenbeen & Kuitbeen', 'Die lasdraende tibia en slanke fibula wat die enkelgewrig vorm.', 'Die tibia dra sowat 85% van die onderbeen se gewig.', 'Dun vel oor die skeen maak oop frakture meer algemeen.'],
      'foot-skeleton': ['Voet (26 Bene)', 'Enkel- en toonbene wat in lengte- en dwarsboë gerangskik is.', 'Die windas-meganisme span die voetsool styf tydens afstoot.', 'Enkelverstuitings kan die basis van die vyfde metatarsaaltjie afruk.'],
      brain: ['Brein & Rugmurg', 'Gevoude breinhemisfere, serebellum en breinstam tot by werwel L1.', 'Serebrospinale vog laat die brein dryf en demp stampe.', 'Die rugmurg eindig by L1–L2 by volwassenes.'],
      heart: ['Hart & Groot Bloedvate', 'Vierkamerpomp wat sowat 5 L bloed per minuut teen 72 slae pomp.', 'Die ventrikels draai tydens sametrekking om bloed kragtig uit te stoot.', 'Die puntklop lê in die linker vyfde tussenribspasie.'],
      lungs: ['Longe & Lugweg', 'Regterlong het 3 lobbe; linkerlong het 2 sodat daar plek vir die hart is.', 'Sametrekking van die diafragma suig lug in die longe in.', 'Die regterhoofbronkus is wyer en meer vertikaal.'],
      liver: ['Lewer & Galblaas', 'Die grootste interne orgaan regs bo onder die diafragma.', 'Beweeg 2–3 cm afwaarts met elke diep inaseming.', 'Galblaaspyn kan na die regterskouerpunt uitstraal.'],
      stomach: ['Maag & Milt', 'J-vormige spiersak wat kos meng, met die milt links agter.', 'Drie peristaltiese golwe per minuut meng voedsel tot chymus.', 'Die milt word die maklikste beseer tydens stomp buiktrauma.'],
      intestines: ['Ingande (Dun- & Dikderm)', 'Sowat 6 m dundermlusse omring deur die dikderm.', 'Die kolon herabsorbeer water geleidelik.', 'Appendisitispyn skuif klassiek van die naeltjie na regs onder.'],
      kidneys: ['Niere & Blaas', 'Boonvormige filters agter die buikvlies wat bloed suiwer.', 'Filtreer daagliks sowat 180 L plasma.', 'Nierstene steek graag in die nou dele van die ureter vas.'],
      'trunk-muscles': ['Bors-, Skouer- & Kernspiere', 'Pectoralis, deltoïed, buikspiere en rugspiere wat postuur ondersteun.', 'Deltoïed lig die arm; buikspiere stabiliseer die laerug.', 'Peesbande verdeel rectus abdominis in segmente.'],
      'arm-muscles': ['Armspiere (Biseps & Triseps)', 'Biseps buig die elmboog en triseps strek dit.', 'Die biseps is ook die sterkste draaier van die voorarm.', '’n Distale bisepsskeur gee ’n kenmerkende bult in die bo-arm.'],
      'leg-muscles': ['Dy- & Kuitspiere', 'Quadriceps strek die knie; dyspiere en kuite dryf loop en hardloop aan.', 'Dieening van die Achillespees lewer kragtige afstoot.', 'Dyspierbeserings kom dikwels tydens naelloop voor.'],
    },
  },

  fr: {
    ui: {
      coachBadge: 'Coach Anatomie · Français',
      welcomeTitle: 'Bienvenue ! Explorez chaque structure du corps',
      welcomeBody: 'Touchez un os ou un organe sur le modèle 3D pour écouter les explications en français.',
      howItWorksBtn: 'Biomécanique',
      clinicalNoteBtn: 'Note clinique',
      speakBtn: 'Écouter le coach',
      askVoiceBtn: 'Demander à la voix',
      askInputLabel: 'Question au coach',
      askPlaceholder: 'Ex. Comment fonctionne le cœur ? / Os de la main…',
      askSendBtn: 'Demander',
      quizTitle: 'Trouvez cette structure',
      skipBtn: 'Passer',
      nextCaseBtn: 'Cas suivant',
      hearHintBtn: 'Écouter l’indice',
      correctPrefix: 'Bravo ! C’est exact',
      tryAgainPrefix: 'Ceci est',
      diagnosedPrefix: 'Fracture identifiée',
      regions: { head: 'Tête', thorax: 'Thorax', abdomen: 'Abdomen', pelvis: 'Bassin', 'upper limb': 'Membre supérieur', 'lower limb': 'Membre inférieur' },
      boneCommands: ['os', 'squelette', 'skeleton'],
      organCommands: ['organes', 'organe', 'coeur', 'cœur'],
      muscleCommands: ['muscles', 'muscle'],
      allCommands: ['tout', 'toutes les couches'],
      explodeCommands: ['éclater', 'séparer', 'explode'],
      biomechTriggers: ['fonctionne', 'mouvement', 'biomécanique', 'work'],
      clinicalTriggers: ['clinique', 'fracture', 'douleur', 'clinical'],
      explainSummary: (n, _lat, f) => `${n} : ${f}`,
      explainBiomech: (_n, f) => f,
      explainClinical: (_n, f) => f,
      quizClueTemplate: (hint, reg) => `Région ${reg} : ${hint}`,
    },
    structures: {
      'cranium-skull': ['Crâne et Massif Facial', 'Huit os crâniens et quatorze os faciaux soudés protégeant le cerveau et les orbites.', 'Les piliers faciaux transmettent les forces de mastication vers la voûte crânienne.', 'Le ptérion recouvre l’artère méningée moyenne, zone critique en traumatologie.'],
      'mandible-tmj': ['Mandibule et ATM', 'Seul os mobile du crâne, articulé à l’ATM ; il suit votre voix en direct.', 'L’ouverture combine une rotation initiale de 15° puis un glissement condylien.', 'Une fracture sous-condylienne dévie le menton vers le côté lésé.'],
      'clavicle-scapula': ['Clavicule et Scapula', 'Entretoise en S et lame triangulaire suspendant le membre supérieur au thorax.', 'Rythme scapulo-huméral : 2° gléno-huméraux pour 1° de rotation scapulaire.', 'La clavicule se fracture le plus souvent à la jonction tiers moyen – tiers latéral.'],
      'ribcage-sternum': ['Cage Thoracique et Sternum', '12 paires de côtes reliées au sternum par le cartilage costal.', 'Les côtes s’élèvent en bras de pompe et anse de seau à chaque inspiration.', 'Les côtes 4 à 9 sont les plus exposées lors d’un choc thoracique.'],
      'vertebral-column': ['Colonne Vertébrale', '7 vertèbres cervicales, 12 thoraciques et 5 lombaires plus le sacrum.', 'Les courbures en S amortissent les charges axiales comme un ressort.', 'Les hernies discales siègent surtout en L4–L5 et L5–S1.'],
      'pelvic-girdle': ['Bassin Osseux (Pelvis)', 'Anneau pelvien transmettant le poids du tronc vers les deux articulations coxo-fémorales.', 'La profondeur de l’acétabulum assure stabilité et mobilité.', 'La crête iliaque repère le niveau vertébral L4.'],
      humerus: ['Humérus', 'Os long du bras s’articulant avec la glène en haut et le coude en bas.', 'L’épaule offre la plus grande amplitude articulaire du corps humain.', 'Une fracture diaphysaire menace le nerf radial dans le sillon du nerf radial.'],
      'radius-ulna': ['Radius et Ulna', 'Os jumelés de l’avant-bras ; le radius pivote autour de l’ulna en pronation.', 'La prono-supination couvre environ 160° de rotation.', 'La fracture de Pouteau-Colles du radius distal est fréquente après une chute.'],
      'hand-skeleton': ['Main (27 Os)', '8 os du carpe, 5 métacarpiens et 14 phalanges suivis en temps réel sur vos doigts.', 'L’articulation trapézo-métacarpienne en selle permet l’opposition du pouce.', 'Une fracture du scaphoïde expose au risque de nécrose avasculaire.'],
      'femur-patella': ['Fémur et Patella', 'Os le plus long et le plus résistant, avec la rotule comme poulie du quadriceps.', 'L’angle cervico-diaphysaire place le genou sous le centre de gravité.', 'Les fractures cervicales déplacées menacent la vascularisation de la tête fémorale.'],
      'tibia-fibula': ['Tibia et Fibula', 'Le tibia porteur et la fibula latérale forment la mortaise de la cheville.', 'Le tibia supporte environ 85 % de la charge de la jambe.', 'La face médiale du tibia étant sous-cutanée, les fractures ouvertures y sont fréquentes.'],
      'foot-skeleton': ['Pied (26 Os)', 'Tarse, métatarse et phalanges organisés en arches longitudinale et transversale.', 'L’effet treuil de l’aponévrose plantaire rigidifie la voûte à la propulsion.', 'Une inversion forcée peut arracher la base du 5e métatarsien.'],
      brain: ['Cerveau et Moelle Épinière', 'Hémisphères cérébraux plissés, cervelet et tronc cérébral prolongés jusqu’en L1.', 'Baigné dans le liquide cérébrospinal, le cerveau ne pèse effectivement que ~50 g.', 'La moelle s’arrêtant en L1–L2, la ponction lombaire se réalise sous L3.'],
      heart: ['Cœur et Gros Vaisseaux', 'Pompe à quatre cavités éjectant 5 L/min dans l’aorte à 72 battements par minute.', 'La torsion ventriculaire systolique optimise l’éjection sanguine.', 'Le choc de pointe est palpable au 5e espace intercostal gauche.'],
      lungs: ['Poumons et Voies Aériennes', 'Trois lobes à droite, deux à gauche avec l’incisure cardiaque.', 'L’abaissement du diaphragme crée la dépression pleurale inspiratoire.', 'La bronche principale droite, plus verticale, reçoit plus souvent les corps étrangers.'],
      liver: ['Foie et Vésicule Biliaire', 'Plus volumineux organe interne, logé sous la coupole diaphragmatique droite.', 'Il s’abaisse de 2 à 3 cm lors de l’inspiration profonde.', 'La douleur biliaire irradie volontiers vers l’épaule droite.'],
      stomach: ['Estomac et Rate', 'Poche musculaire en J entre œsophage et duodénum, avec la rate en arrière à gauche.', 'Trois ondes péristaltiques par minute brassent le bol alimentaire.', 'La rate est l’organe plein le plus touché dans les traumatismes abdominaux fermés.'],
      intestines: ['Intestin Grêle et Côlon', 'Six mètres d’anses grêles encadrées par le côlon haustré.', 'Le côlon réabsorbe l’eau et les électrolytes.', 'La douleur appendiculaire migre vers la fosse iliaque droite.'],
      kidneys: ['Reins et Vessie', 'Filtres rétropéritonéaux drainés par les uretères vers la vessie.', 'Ils filtrent environ 180 L de plasma par jour.', 'Les calculs urétéraux bloquent aux trois rétrécissements physiologiques.'],
      'trunk-muscles': ['Pectoraux, Deltoïde et Sangle Abdominale', 'Grand pectoral, deltoïde, grands droits, obliques et trapèze.', 'Le deltoïde élève le bras ; la sangle abdominale stabilise le rachis lombaire.', 'Les intersections tendineuses dessinent les segments des grands droits.'],
      'arm-muscles': ['Biceps, Triceps et Avant-Bras', 'Fléchisseurs du coude en avant, extenseur tricipital en arrière.', 'Le biceps brachial est aussi le principal supinateur de l’avant-bras.', 'La rupture distale du biceps crée le signe de Popeye.'],
      'leg-muscles': ['Quadriceps, Ischio-jambiers et Mollet', 'Le quadriceps étend le genou ; ischio-jambiers et triceps sural propulsent la marche.', 'Le tendon calcanéen d’Achille restitue l’énergie élastique.', 'Les lésions des ischio-jambiers surviennent surtout en fin d’oscillation au sprint.'],
    },
  },

  ar: {
    ui: {
      coachBadge: 'مدرب التشريح · العربية',
      welcomeTitle: 'مرحباً بك! اسأل عن أي عضو أو عظم في الجسم',
      welcomeBody: 'المس أي عظم أو عضو في المرآة ثلاثية الأبعاد للاستماع إلى الشرح باللغة العربية.',
      howItWorksBtn: 'كيف يعمل',
      clinicalNoteBtn: 'ملاحظة سريرية',
      speakBtn: 'استمع للشرح',
      askVoiceBtn: 'اسأل بالصوت',
      askInputLabel: 'اسأل المدرب',
      askPlaceholder: 'مثال: كيف يعمل القلب؟ / عظام اليد…',
      askSendBtn: 'إرسال',
      quizTitle: 'حدّد هذا الجزء التشريحي',
      skipBtn: 'تخطي',
      nextCaseBtn: 'الحالة التالية',
      hearHintBtn: 'سماع تلميح',
      correctPrefix: 'أحسنت! إجابة صحيحة',
      tryAgainPrefix: 'هذا هو',
      diagnosedPrefix: 'تم تشخيص الكسر',
      regions: { head: 'الرأس', thorax: 'الصدر', abdomen: 'البطن', pelvis: 'الحوض', 'upper limb': 'الطرف العلوي', 'lower limb': 'الطرف السفلي' },
      boneCommands: ['عظام', 'عظم', 'هيكل', 'skeleton'],
      organCommands: ['أعضاء', 'عضو', 'قلب', 'organs'],
      muscleCommands: ['عضلات', 'عضلة', 'muscles'],
      allCommands: ['الكل', 'إظهار الكل'],
      explodeCommands: ['فصل', 'تفكيك', 'explode'],
      biomechTriggers: ['يعمل', 'حركة', 'وظيفة', 'work'],
      clinicalTriggers: ['سريري', 'كسر', 'طب', 'clinical'],
      explainSummary: (n, _lat, f) => `${n}. ${f}`,
      explainBiomech: (_n, f) => f,
      explainClinical: (_n, f) => f,
      quizClueTemplate: (hint, reg) => `في منطقة ${reg}: ${hint}`,
    },
    structures: {
      'cranium-skull': ['الجمجمة وعظام الوجه', 'ثماني عظام قحفية وأربع عشرة عظمة وجهية تحمي الدماغ ومحجر العين.', 'تنقل الدعامات العظمية قوى المضغ بأمان إلى قبة الجمجمة.', 'تقع منطقة الجناحي (Pterion) فوق الشريان السحائي الأوسط مباشرة.'],
      'mandible-tmj': ['الفك السفلي ومفصل الفك', 'العظم الوحيد المتحرك في الجمجمة؛ يتحرك مباشرة مع صوتك في المرآة.', 'يبدأ فتح الفم بدوران مفصلي ثم انزلاق اللقمة للأمام.', 'ينحرف الذقن نحو الجهة المصابة عند كسر عنق اللقمة.'],
      'clavicle-scapula': ['الترقوة ولوح الكتف', 'ترقوة بشكل حرف S ولوح كتف مثلث يعلقان الذراع بالجذع.', 'يتناغم دوران لوح الكتف مع حركة العضد بنسبة 1 إلى 2.', 'يكثر كسر الترقوة عند التقاء الثلث الأوسط بالثلث الوحشي.'],
      'ribcage-sternum': ['القفص الصدري وعظم القص', '12 زوجاً من الأضلاع ترتبط بالقص لحماية القلب والرئتين.', 'يرتفع القفص الصدري ويتسع مع كل شهيق.', 'الأضلاع من الرابع إلى التاسع هي الأكثر عرضة للكسور الرضية.'],
      'vertebral-column': ['العمود الفقري', '24 فقرة متحركة مع العجز والعصعص تفصلها أقراص غضروفية.', 'تمتص الانحناءات الطبيعية الصدمات المحورية كالنابض.', 'يكثر انزلاق الغضروف القطني عند المستويين L4–L5 وL5–S1.'],
      'pelvic-girdle': ['عظام الحوض', 'حلقة عظمية تنقل وزن الجذع إلى مفصلي الورك والساقين.', 'يوفر الحق العميق ثباتاً عالياً مع مرونة واسعة.', 'يمثل العرف الحرقفي علامة تشريحية لمستوى الفقرة L4.'],
      humerus: ['عظم العضد', 'العظم الطويل للذراع بين مفصل الكتف ومفصل المرفق.', 'يتمتع مفصل الكتف بأوسع مدى حركي في الجسم.', 'قد تصيب كسور منتصف العضد العصب الكعبري.'],
      'radius-ulna': ['الكعبرة والزند', 'عظما الساعد؛ تدور الكعبرة فوق الزند لقلب راحة اليد.', 'يبلغ مدى الكب والاستلقاء نحو 160 درجة.', 'كسر كوليس في أسفل الكعبرة شائع بعد السقوط على اليد.'],
      'hand-skeleton': ['اليد (27 عظمة)', '8 عظام رسغية و5 أمشاط و14 سلامية تتبع حركة أصابعك مباشرة.', 'يتيح مفصل الإبهام السرجي ملامسة جميع أطراف الأصابع.', 'يتطلب كسر العظم الزورقي عناية مبكرة لحماية ترويته الدموية.'],
      'femur-patella': ['عظم الفخذ والرضفة', 'أطول وأقوى عظم في الجسم مع الرضفة التي تعمل كبكرة للركبة.', 'تحافظ زاوية عنق الفخذ على تمركز الركبة تحت ثقل الجسم.', 'قد تؤثر كسور عنق الفخذ المتبدلة على التروية الدموية لرأس الفخذ.'],
      'tibia-fibula': ['الظنبوب والشظية', 'عظم الساق الحامل للوزن والشظية الجانبية المكونان لمفصل الكاحل.', 'يتحمل الظنبوب نحو 85% من وزن الساق.', 'قلة الأنسجة الرخوة أمام الظنبوب تجعل الكسور المفتوحة شائعة.'],
      'foot-skeleton': ['القدم (26 عظمة)', 'عظام الرصغ والمشط والسلاميات المنتظمة في أقواس طولية وعرضية.', 'تشد اللفافة الأخمصية قوس القدم عند الدفع بالأصابع.', 'قد يؤدي التواء الكاحل إلى كسر قلعي في قاعدة المشط الخامس.'],
      brain: ['الدماغ والحبل الشوكي', 'نصفا الكرة المخية والمخيخ وجذع الدماغ المتصل بالحبل الشوكي حتى L1.', 'يطفو الدماغ في السائل الدماغي الشوكي مما يحميه من الصدمات.', 'ينتهي الحبل الشوكي عند L1–L2 لدى البالغين.'],
      heart: ['القلب والأوعية الكبرى', 'مضخة رباعية الحجرات تضخ 5 لترات في الدقيقة بمعدل 72 نبضة.', 'تلتف البطينات أثناء الانقباض لدفع الدم بقوة في الأبهر.', 'تُجس نبضة قمة القلب في الورب الخامس الأيسر.'],
      lungs: ['الرئتان والقصبة الهوائية', 'ثلاثة فصوص في الرئة اليمنى وفصان في اليسرى لإفساح المجال للقلب.', 'يؤدي انقباض الحجاب الحاجز إلى سحب الهواء داخل الرئتين.', 'القصبة الرئيسية اليمنى أوسع وأكثر عمودية من اليسرى.'],
      liver: ['الكبد والمرارة', 'أكبر عضو داخلي يقع في الربع العلوي الأيمن تحت الحجاب الحاجز.', 'يهبط بمقدار 2–3 سم مع الشهيق العميق.', 'قد يمتد ألم المرارة إلى قمة الكتف الأيمن.'],
      stomach: ['المعدة والطحال', 'كيس عضلي بشكل حرف J لهضم الطعام ويقع الطحال خلفه يساراً.', 'تمزج ثلاث موجات تمعجية في الدقيقة الطعام بالعصارة.', 'الطحال هو أكثر الأعضاء عرضة للإصابة في رضوض البطن غير النافذة.'],
      intestines: ['الأمعاء الدقيقة والغليظة', 'ستة أمتار من الأمعاء الدقيقة يحيط بها القولون.', 'يمتص القولون الماء والأملاح تدريجياً.', 'ينتقل ألم التهاب الزائدة من حول السرة إلى أسفل البطن الأيمن.'],
      kidneys: ['الكليتان والمثانة', 'مرشحان خلف الصفاق ينقيان الدم ويصرفان البول عبر الحالبين.', 'ترشح الكليتان نحو 180 لتراً من البلازما يومياً.', 'تستقر حصيات الحالب غالباً في مناطق التضيق الثلاث.'],
      'trunk-muscles': ['عضلات الصدر والكتف والبطن', 'العضلة الصدرية والدالية ومستقيمة البطن والمائلات وشبه المنحرفة.', 'ترفع الدالية الذراع وتدعم عضلات البطن العمود الفقري.', 'تقسم التقاطعات الوترية عضلة البطن المستقيمة.'],
      'arm-muscles': ['عضلات الذراع والساعد', 'ثنائية الرؤوس لثني المرفق وثلاثية الرؤوس لبسطه.', 'تعد ثنائية الرؤوس أقوى عضلة لقلب راحة اليد للأعلى.', 'يسبب تمزق وتر البايسبس بروزاً عضلياً واضحاً.'],
      'leg-muscles': ['عضلات الفخذ والساق', 'رباعية الرؤوس تبسط الركبة وعضلات الخلفية والسمانة تدفع المشي.', 'يوفر وتر أخيل قوة الدفع والقفز.', 'تحدث إصابات العضلات الخلفية غالباً أثناء العدو السريع.'],
    },
  },

  es: {
    ui: {
      coachBadge: 'Coach de Anatomía · Español',
      welcomeTitle: '¡Bienvenido! Pregunta sobre cualquier estructura',
      welcomeBody: 'Toca cualquier hueso u órgano en el espejo 3D para escuchar la explicación en español.',
      howItWorksBtn: 'Cómo funciona',
      clinicalNoteBtn: 'Nota clínica',
      speakBtn: 'Escuchar voz',
      askVoiceBtn: 'Preguntar por voz',
      askInputLabel: 'Pregunta al coach',
      askPlaceholder: 'Ej. ¿Cómo funciona el corazón? / Huesos de la mano…',
      askSendBtn: 'Preguntar',
      quizTitle: 'Encuentra esta estructura',
      skipBtn: 'Saltar',
      nextCaseBtn: 'Siguiente caso',
      hearHintBtn: 'Oír pista',
      correctPrefix: '¡Excelente! Correcto',
      tryAgainPrefix: 'Esto es',
      diagnosedPrefix: 'Fractura diagnosticada',
      regions: { head: 'Cabeza', thorax: 'Tórax', abdomen: 'Abdomen', pelvis: 'Pelvis', 'upper limb': 'Miembro superior', 'lower limb': 'Miembro inferior' },
      boneCommands: ['huesos', 'esqueleto', 'skeleton'],
      organCommands: ['órganos', 'organos', 'corazón', 'corazon'],
      muscleCommands: ['músculos', 'musculos'],
      allCommands: ['todo', 'mostrar todo'],
      explodeCommands: ['explotar', 'separar', 'explode'],
      biomechTriggers: ['funciona', 'mueve', 'biomecánica', 'work'],
      clinicalTriggers: ['clínica', 'clinica', 'fractura', 'clinical'],
      explainSummary: (n, _lat, f) => `${n}. ${f}`,
      explainBiomech: (_n, f) => f,
      explainClinical: (_n, f) => f,
      quizClueTemplate: (hint, reg) => `Región de ${reg}: ${hint}`,
    },
    structures: {
      'cranium-skull': ['Cráneo y Macizo Facial', 'Ocho huesos craneales y catorce faciales que protegen el encéfalo y las órbitas.', 'Los contrafuertes faciales transmiten la fuerza de mordida hacia la bóveda.', 'El pterión cubre la arteria meníngea media.'],
      'mandible-tmj': ['Mandíbula y ATM', 'El único hueso móvil del cráneo; se articula en vivo con tu voz.', 'La apertura inicia con 15° de rotación seguidos de traslación anterior.', 'En fractura subcondílea el mentón se desvía hacia el lado lesionado.'],
      'clavicle-scapula': ['Clavícula y Escápula', 'Puntal en S y lámina triangular que suspenden el brazo del tronco.', 'Ritmo escapulohumeral de 2° glenohumerales por cada 1° escapular.', 'La clavícula suele fracturarse en la unión de sus tercios medio y lateral.'],
      'ribcage-sternum': ['Caja Torácica y Esternón', '12 pares de costillas unidas al esternón por cartílago costal.', 'Se eleva y expande con cada inspiración.', 'Las costillas 4 a 9 son las que más se fracturan en traumatismos.'],
      'vertebral-column': ['Columna Vertebral', '24 vértebras móviles más sacro y cóccix separados por discos.', 'Su doble curva en S absorbe cargas axiales como un resorte.', 'Las hernias discales predominan en L4–L5 y L5–S1.'],
      'pelvic-girdle': ['Pelvis Ósea', 'Anillo óseo que transmite el peso del tronco a ambas caderas.', 'El profundo acetábulo combina movilidad y gran estabilidad.', 'La cresta ilíaca marca el nivel vertebral L4.'],
      humerus: ['Húmero', 'Hueso largo del brazo entre la cavidad glenoidea y el codo.', 'El hombro posee el mayor rango de movimiento del cuerpo.', 'Las fracturas diafisarias ponen en riesgo el nervio radial.'],
      'radius-ulna': ['Radio y Cúbito', 'Huesos del antebrazo; el radio gira sobre el cúbito en la pronación.', 'La pronosupinación abarca unos 160°.', 'La fractura de Colles del radio distal es común tras caer sobre la mano.'],
      'hand-skeleton': ['Mano (27 Huesos)', '8 huesos del carpo, 5 metacarpianos y 14 falanges siguiendo tus dedos en vivo.', 'La articulación en silla de montar del pulgar permite la oposición.', 'Las fracturas de escafoides requieren vigilancia por riesgo de necrosis avascular.'],
      'femur-patella': ['Fémur y Rótula', 'El hueso más largo y fuerte junto con la rótula como polea del cuádriceps.', 'El ángulo cervicodiafisario alinea la rodilla bajo el centro de masa.', 'Las fracturas del cuello femoral pueden comprometer la irrigación de la cabeza.'],
      'tibia-fibula': ['Tibia y Peroné', 'La tibia soporta la carga y junto al peroné forma la mortaja del tobillo.', 'La tibia asume cerca del 85% del peso de la pierna.', 'Su escasa cobertura anterior favorece las fracturas abiertas.'],
      'foot-skeleton': ['Pie (26 Huesos)', 'Tarso, metatarso y falanges dispuestos en arcos longitudinal y transversal.', 'El mecanismo de cabrestante tensa la fascia plantar al despegar.', 'Un esguince en inversión puede avulsionar la base del 5.º metatarsiano.'],
      brain: ['Cerebro y Médula Espinal', 'Hemisferios cerebrales, cerebelo y tronco encefálico continuando hasta L1.', 'Flotando en líquido cefalorraquídeo su peso efectivo baja a ~50 g.', 'La médula termina en L1–L2 en adultos.'],
      heart: ['Corazón y Grandes Vasos', 'Bomba de cuatro cámaras que impulsa 5 L/min hacia la aorta a 72 LPM.', 'Los ventrículos se torsionan al contraerse para optimizar la eyección.', 'El latido apical se palpa en el 5.º espacio intercostal izquierdo.'],
      lungs: ['Pulmones y Vía Aérea', 'Tres lóbulos a la derecha y dos a la izquierda junto a la escotadura cardíaca.', 'El descenso del diafragma expande los pulmones por presión negativa.', 'El bronquio principal derecho es más ancho y vertical.'],
      liver: ['Hígado y Vesícula Biliar', 'El órgano interno más grande bajo el hemidiafragma derecho.', 'Desciende 2–3 cm en cada inspiración profunda.', 'El dolor biliar suele referirse al hombro derecho.'],
      stomach: ['Estómago y Bazo', 'Saco muscular en J entre esófago y duodeno, con el bazo detrás a la izquierda.', 'Tres ondas peristálticas por minuto mezclan el quimo.', 'El bazo es el órgano más lesionado en trauma abdominal cerrado.'],
      intestines: ['Intestino Delgado y Colon', 'Seis metros de asas delgadas enmarcadas por el colon.', 'El colon reabsorbe agua de forma progresiva.', 'El dolor apendicular migra hacia el punto de McBurney.'],
      kidneys: ['Riñones y Vejiga', 'Filtros retroperitoneales que drenan por los uréteres hacia la vejiga.', 'Filtran unos 180 L de plasma al día.', 'Los cálculos suelen impactarse en los tres estrechamientos ureterales.'],
      'trunk-muscles': ['Pectoral, Deltoides y Core', 'Pectoral mayor, deltoides, recto abdominal, oblicuos y trapecio.', 'El deltoides abduce el brazo; el core estabiliza la columna lumbar.', 'Las intersecciones tendinosas segmentan el recto abdominal.'],
      'arm-muscles': ['Bíceps, Tríceps y Antebrazo', 'Flexores anteriores del codo y extensor tricipital posterior.', 'El bíceps es además el principal supinador del antebrazo.', 'La rotura distal del bíceps produce el signo de Popeye.'],
      'leg-muscles': ['Cuádriceps, Isquiotibiales y Gemelos', 'El cuádriceps extiende la rodilla; isquiotibiales y tríceps sural impulsan la marcha.', 'El tendón de Aquiles aporta potencia de despegue.', 'Los desgarros isquiotibiales ocurren al final del balanceo en velocidad.'],
    },
  },

  pt: {
    ui: {
      coachBadge: 'Treinador de Anatomia · Português',
      welcomeTitle: 'Bem-vindo! Pergunte sobre qualquer estrutura',
      welcomeBody: 'Toque em qualquer osso ou órgão no espelho 3D para ouvir a explicação em português.',
      howItWorksBtn: 'Como funciona',
      clinicalNoteBtn: 'Nota clínica',
      speakBtn: 'Ouvir explicação',
      askVoiceBtn: 'Perguntar por voz',
      askInputLabel: 'Pergunte ao treinador',
      askPlaceholder: 'Ex. Como funciona o coração? / Ossos da mão…',
      askSendBtn: 'Perguntar',
      quizTitle: 'Encontre esta estrutura',
      skipBtn: 'Pular',
      nextCaseBtn: 'Próximo caso',
      hearHintBtn: 'Ouvir dica',
      correctPrefix: 'Muito bem! Correto',
      tryAgainPrefix: 'Isto é',
      diagnosedPrefix: 'Fratura identificada',
      regions: { head: 'Cabeça', thorax: 'Tórax', abdomen: 'Abdómen', pelvis: 'Pelve', 'upper limb': 'Membro superior', 'lower limb': 'Membro inferior' },
      boneCommands: ['ossos', 'esqueleto', 'skeleton'],
      organCommands: ['órgãos', 'orgaos', 'coração', 'coracao'],
      muscleCommands: ['músculos', 'musculos'],
      allCommands: ['tudo', 'mostrar tudo'],
      explodeCommands: ['explodir', 'separar', 'explode'],
      biomechTriggers: ['funciona', 'move', 'biomecânica', 'work'],
      clinicalTriggers: ['clínica', 'clinica', 'fratura', 'clinical'],
      explainSummary: (n, _lat, f) => `${n}. ${f}`,
      explainBiomech: (_n, f) => f,
      explainClinical: (_n, f) => f,
      quizClueTemplate: (hint, reg) => `Região ${reg}: ${hint}`,
    },
    structures: {
      'cranium-skull': ['Crânio e Ossos da Face', 'Oito ossos cranianos e quatorze faciais que protegem o cérebro e as órbitas.', 'Pilares ósseos distribuem a força da mastigação para a abóbada craniana.', 'O ptério recobre a artéria meníngea média.'],
      'mandible-tmj': ['Mandíbula e ATM', 'O único osso móvel do crânio; abre em tempo real com a sua voz.', 'A abertura começa com rotação de 15° seguida de deslizamento anterior.', 'Fraturas subcondilianas desviam o queixo para o lado lesionado.'],
      'clavicle-scapula': ['Clavícula e Escápula', 'Clavícula em S e escápula triangular que suspendem o membro superior.', 'Ritmo escapuloumeral: 2° no ombro para cada 1° de rotação escapular.', 'O terço médio da clavícula é o local mais comum de fratura.'],
      'ribcage-sternum': ['Caixa Torácica e Esterno', '12 pares de costelas ligadas ao esterno por cartilagem costal.', 'Eleva-se e expande-se a cada inspiração.', 'As costelas 4 a 9 são as mais atingidas em traumas torácicos.'],
      'vertebral-column': ['Coluna Vertebral', '24 vértebras móveis mais sacro e cóccix separados por discos.', 'A curvatura em S absorve impacto axial como uma mola.', 'Hérnias lombares ocorrem sobretudo em L4–L5 e L5–S1.'],
      'pelvic-girdle': ['Pelve Óssea', 'Anel pélvico que transfere o peso do tronco para as ancas e pernas.', 'O acetábulo profundo garante estabilidade sob carga.', 'A crista ilíaca marca o nível da vértebra L4.'],
      humerus: ['Úmero', 'Osso longo do braço entre o ombro e o cotovelo.', 'O ombro possui a maior amplitude de movimento do corpo.', 'Fraturas diafisárias podem afetar o nervo radial.'],
      'radius-ulna': ['Rádio e Ulna', 'Ossos do antebraço; o rádio gira sobre a ulna para virar a palma.', 'A pronossupinação atinge cerca de 160°.', 'A fratura de Colles no rádio distal é comum após quedas sobre a mão.'],
      'hand-skeleton': ['Mão (27 Ossos)', '8 ossos do carpo, 5 metacarpos e 14 falanges rastreados nos seus dedos.', 'A articulação em sela do polegar permite tocar todas as pontas dos dedos.', 'Fraturas do escafoide exigem atenção pelo risco de necrose avascular.'],
      'femur-patella': ['Fémur e Patela', 'O osso mais longo e forte, com a patela atuando como polia do joelho.', 'O ângulo do colo femoral alinha o joelho sob o centro de massa.', 'Fraturas do colo femoral podem comprometer a irrigação da cabeça do fémur.'],
      'tibia-fibula': ['Tíbia e Fíbula', 'A tíbia suporta a carga e forma com a fíbula a pinça do tornozelo.', 'A tíbia carrega cerca de 85% do peso da perna.', 'A pele fina na canela torna fraturas expostas mais frequentes.'],
      'foot-skeleton': ['Pé (26 Ossos)', 'Tarso, metatarso e falanges estruturados em arcos elásticos.', 'O mecanismo de molinete tensiona a fáscia plantar na impulsão.', 'Entorses em inversão podem fraturar a base do 5.º metatarso.'],
      brain: ['Cérebro e Medula Espinhal', 'Hemisférios cerebrais, cerebelo e tronco encefálico até L1.', 'Flutuando no líquor, o cérebro fica protegido contra impactos.', 'A medula termina em L1–L2 nos adultos.'],
      heart: ['Coração e Grandes Vasos', 'Bomba de quatro câmaras que ejeta 5 L/min na aorta a 72 BPM.', 'Os ventrículos torcem-se na contração para impulsionar o sangue.', 'O choque da ponta situa-se no 5.º espaço intercostal esquerdo.'],
      lungs: ['Pulmões e Vias Aéreas', 'Três lobos à direita e dois à esquerda junto à incisura cardíaca.', 'A descida do diafragma puxa o ar para os pulmões.', 'O brônquio principal direito é mais largo e vertical.'],
      liver: ['Fígado e Vesícula Biliar', 'Maior órgão interno, situado à direita sob o diafragma.', 'Desce 2–3 cm na inspiração profunda.', 'A dor biliar pode irradiar para a ponta do ombro direito.'],
      stomach: ['Estômago e Baço', 'Bolsa muscular em J que mistura os alimentos, com o baço atrás à esquerda.', 'Três ondas peristálticas por minuto formam o quimo.', 'O baço é o órgão mais lesado em traumas abdominais fechados.'],
      intestines: ['Intestino Delgado e Cólon', 'Seis metros de alças delgadas emolduradas pelo cólon.', 'O cólon reabsorve água gradualmente.', 'A dor da apendicite migra do umbigo para a fossa ilíaca direita.'],
      kidneys: ['Rins e Bexiga', 'Filtros retroperitoneais que drenam pelos ureteres até à bexiga.', 'Filtram cerca de 180 L de plasma por dia.', 'Cálculos renais costumam parar nos três estreitamentos do ureter.'],
      'trunk-muscles': ['Peitoral, Deltoide e Core', 'Peitoral maior, deltoide, reto abdominal, oblíquos e trapézio.', 'O deltoide eleva o braço; o abdómen estabiliza a coluna lombar.', 'Interseções tendíneas desenham os gomos abdominais.'],
      'arm-muscles': ['Bíceps, Tríceps e Antebraço', 'Flexores anteriores do cotovelo e extensor tricipital.', 'O bíceps é também o principal supinador do antebraço.', 'A rutura distal do bíceps gera o sinal do Popeye.'],
      'leg-muscles': ['Quadríceps, Isquiotibiais e Gémeos', 'O quadríceps estende o joelho; posteriores e gémeos impulsionam a marcha.', 'O tendão de Aquiles fornece potência de impulsão.', 'Estiramentos dos isquiotibiais são comuns em corridas de velocidade.'],
    },
  },
};

const EN_UI: CoachPackUI = {
  coachBadge: 'Spatial Coach · English',
  welcomeTitle: 'Ask about any structure',
  welcomeBody: 'Click or point at a bone or organ, then ask a question by voice, text, or the coaching buttons below.',
  howItWorksBtn: 'How it works',
  clinicalNoteBtn: 'Clinical note',
  speakBtn: 'Speak aloud',
  askVoiceBtn: 'Ask by voice',
  askInputLabel: 'Ask the anatomy coach',
  askPlaceholder: 'e.g. How does the heart pump? / Show hand bones…',
  askSendBtn: 'Ask',
  quizTitle: 'Find this structure',
  skipBtn: 'Skip',
  nextCaseBtn: 'Next case',
  hearHintBtn: 'Hear hint',
  correctPrefix: 'Correct',
  tryAgainPrefix: 'That’s the',
  diagnosedPrefix: 'Diagnosed',
  regions: { head: 'head', thorax: 'thorax', abdomen: 'abdomen', pelvis: 'pelvis', 'upper limb': 'upper limb', 'lower limb': 'lower limb' },
  boneCommands: ['bone', 'bones', 'skeleton'],
  organCommands: ['organ', 'organs'],
  muscleCommands: ['muscle', 'muscles'],
  allCommands: ['everything', 'all layers', 'show all'],
  explodeCommands: ['explode', 'separate'],
  biomechTriggers: ['move', 'work', 'biomechanic', 'function', 'how'],
  clinicalTriggers: ['clinical', 'fracture', 'injury', 'pearl', 'doctor'],
  explainSummary: (n, _lat, f) => `${n}. ${f}`,
  explainBiomech: (n, f) => `${n}. ${f}`,
  explainClinical: (n, f) => `${n}. ${f}`,
  quizClueTemplate: (hint) => hint,
};

export function getCoachUIStrings(lang: CoachLanguageCode): CoachPackUI {
  if (lang === 'en') return EN_UI;
  return PACKS[lang].ui;
}

export interface LocalizedStructureView {
  id: string;
  name: string;
  englishName: string;
  latinName: string;
  regionLabel: string;
  summary: string;
  biomechanics: string;
  clinicalNote: string;
  layer: AnatomyLayerKey;
  raw: AnatomyStructureInfo;
}

export function getLocalizedStructure(info: AnatomyStructureInfo, lang: CoachLanguageCode): LocalizedStructureView {
  if (lang === 'en') {
    return {
      id: info.id,
      name: info.name,
      englishName: info.name,
      latinName: info.latinName,
      regionLabel: info.region,
      summary: info.summary,
      biomechanics: info.biomechanics,
      clinicalNote: info.clinicalNote,
      layer: info.layer,
      raw: info,
    };
  }
  const pack = PACKS[lang];
  const entry = pack.structures[info.id];
  const regionLabel = pack.ui.regions[info.region] ?? info.region;
  if (!entry) {
    return {
      id: info.id,
      name: info.name,
      englishName: info.name,
      latinName: info.latinName,
      regionLabel,
      summary: info.summary,
      biomechanics: info.biomechanics,
      clinicalNote: info.clinicalNote,
      layer: info.layer,
      raw: info,
    };
  }
  return {
    id: info.id,
    name: entry[0],
    englishName: info.name,
    latinName: info.latinName,
    regionLabel,
    summary: entry[1],
    biomechanics: entry[2],
    clinicalNote: entry[3],
    layer: info.layer,
    raw: info,
  };
}

export function getLocalizedStructureName(id: string, lang: CoachLanguageCode): string {
  const base = ANATOMY_STRUCTURES.find((s) => s.id === id);
  if (!base) return id;
  return getLocalizedStructure(base, lang).name;
}

export function getLocalizedPinpointClue(prompt: PinpointPrompt, lang: CoachLanguageCode): string {
  if (lang === 'en') return prompt.clue;
  const base = ANATOMY_STRUCTURES.find((s) => s.id === prompt.structureId);
  if (!base) return prompt.clue;
  const loc = getLocalizedStructure(base, lang);
  const ui = getCoachUIStrings(lang);
  return ui.quizClueTemplate(loc.summary, loc.regionLabel);
}

export function getLocalizedClinicalCase(cs: ClinicalCase, lang: CoachLanguageCode): {
  title: string;
  badge: string;
  bodyUnsolved: string;
  bodySolved: string;
  hintSpoken: string;
  solvedSpoken: string;
} {
  if (lang === 'en') {
    return {
      title: cs.title,
      badge: cs.badge,
      bodyUnsolved: `${cs.patientHistory} ${cs.hint}`,
      bodySolved: `${cs.findingSummary} ${cs.treatmentNote}`,
      hintSpoken: cs.hint,
      solvedSpoken: `${cs.findingSummary} ${cs.treatmentNote}`,
    };
  }
  const base = ANATOMY_STRUCTURES.find((s) => s.id === cs.targetStructureId) ?? ANATOMY_STRUCTURES[0];
  const loc = getLocalizedStructure(base, lang);
  const ui = getCoachUIStrings(lang);
  return {
    title: `${loc.name} — ${cs.title}`,
    badge: loc.regionLabel,
    bodyUnsolved: `${loc.clinicalNote} (${cs.hint})`,
    bodySolved: `${ui.diagnosedPrefix}: ${loc.name}. ${loc.clinicalNote}`,
    hintSpoken: `${loc.regionLabel}: ${loc.name}. ${loc.clinicalNote}`,
    solvedSpoken: `${ui.diagnosedPrefix}: ${loc.name}. ${loc.clinicalNote}`,
  };
}

export type MultilingualCommandIntent =
  | { kind: 'preset'; preset: 'skeleton' | 'organs' | 'muscles' | 'everything'; spoken: string }
  | { kind: 'explode'; spoken: string }
  | { kind: 'tutor'; title: string; spokenText: string; matchedStructure: AnatomyStructureInfo; suggestedLayer: AnatomyLayerKey };

export function resolveMultilingualCoachQuery(
  rawQuery: string,
  lang: CoachLanguageCode,
  hoveredOrSelected: AnatomyStructureInfo | null
): MultilingualCommandIntent {
  const q = rawQuery.toLowerCase().trim();
  const ui = getCoachUIStrings(lang);
  const shortCmd = q.split(/\s+/).length <= 4;

  if (shortCmd && ui.boneCommands.some((w) => q.includes(w.toLowerCase()))) {
    const s = getLocalizedStructure(ANATOMY_STRUCTURES[0], lang);
    return { kind: 'preset', preset: 'skeleton', spoken: `${ui.coachBadge}: ${s.name}` };
  }
  if (shortCmd && ui.organCommands.some((w) => q.includes(w.toLowerCase())) && !ui.biomechTriggers.some((t) => q.includes(t))) {
    const heart = getLocalizedStructure(ANATOMY_STRUCTURES.find((x) => x.id === 'heart')!, lang);
    return { kind: 'preset', preset: 'organs', spoken: `${heart.name}. ${heart.summary}` };
  }
  if (shortCmd && ui.muscleCommands.some((w) => q.includes(w.toLowerCase()))) {
    const m = getLocalizedStructure(ANATOMY_STRUCTURES.find((x) => x.id === 'trunk-muscles')!, lang);
    return { kind: 'preset', preset: 'muscles', spoken: `${m.name}. ${m.summary}` };
  }
  if (shortCmd && ui.allCommands.some((w) => q.includes(w.toLowerCase()))) {
    return { kind: 'preset', preset: 'everything', spoken: ui.welcomeTitle };
  }
  if (shortCmd && ui.explodeCommands.some((w) => q.includes(w.toLowerCase()))) {
    return { kind: 'explode', spoken: ui.howItWorksBtn };
  }

  // Match structure across BOTH English keywords AND localized names/keywords across all packs!
  let matched: AnatomyStructureInfo | null = null;
  for (const item of ANATOMY_STRUCTURES) {
    const locView = getLocalizedStructure(item, lang);
    const packEntry = lang !== 'en' ? PACKS[lang].structures[item.id] : undefined;
    const extraKw = packEntry?.[4] ?? [];
    if (
      q.includes(item.name.toLowerCase()) ||
      q.includes(locView.name.toLowerCase()) ||
      item.keywords.some((kw) => q.includes(kw.toLowerCase())) ||
      extraKw.some((kw) => q.includes(kw.toLowerCase()))
    ) {
      matched = item;
      break;
    }
  }
  matched = matched ?? hoveredOrSelected ?? ANATOMY_STRUCTURES.find((s) => s.id === 'heart')!;
  const loc = getLocalizedStructure(matched, lang);

  if (ui.clinicalTriggers.some((t) => q.includes(t.toLowerCase()))) {
    return {
      kind: 'tutor',
      title: `${loc.name} · ${ui.clinicalNoteBtn}`,
      spokenText: ui.explainClinical(loc.name, loc.clinicalNote),
      matchedStructure: matched,
      suggestedLayer: matched.layer,
    };
  }
  if (ui.biomechTriggers.some((t) => q.includes(t.toLowerCase()))) {
    return {
      kind: 'tutor',
      title: `${loc.name} · ${ui.howItWorksBtn}`,
      spokenText: ui.explainBiomech(loc.name, loc.biomechanics),
      matchedStructure: matched,
      suggestedLayer: matched.layer,
    };
  }
  return {
    kind: 'tutor',
    title: loc.name,
    spokenText: ui.explainSummary(loc.name, loc.latinName, loc.summary),
    matchedStructure: matched,
    suggestedLayer: matched.layer,
  };
}

export { CLINICAL_CASES, PINPOINT_PROMPTS };

const YO_NUMBERS: Record<string, string> = {
  '1': 'ọ̀kan',
  '2': 'méjì',
  '3': 'mẹ́ta',
  '4': 'mẹ́rin',
  '5': 'márùn-ún',
  '6': 'mẹ́fà',
  '7': 'méje',
  '8': 'mẹ́jọ',
  '9': 'mẹ́sàn-án',
  '10': 'mẹ́wàá',
  '12': 'méjìlá',
  '14': 'mẹ́rìnlá',
  '15': 'mẹ́ẹ̀ẹ́dógún',
  '24': 'mẹ́rìnlélógún',
  '26': 'mẹ́rìndínlọ́gbọ̀n',
  '27': 'mẹ́tàdínlọ́gbọ̀n',
  '72': 'méjìléláàádọ́rin',
  '85': 'márùndínláàádọ́rùn-ún',
  '160': 'ọgọ́rùn-ún ó lé ọgọ́ta',
  '180': 'ọgọ́rùn-ún ó lé ọgọ́rin',
};

const HA_NUMBERS: Record<string, string> = {
  '1': 'ɗaya',
  '2': 'biyu',
  '3': 'uku',
  '4': 'huɗu',
  '5': 'biyar',
  '6': 'shida',
  '7': 'bakwai',
  '8': 'takwas',
  '9': 'tara',
  '10': 'goma',
  '12': 'goma sha biyu',
  '14': 'goma sha huɗu',
  '15': 'goma sha biyar',
  '24': 'ashirin da huɗu',
  '26': 'ashirin da shida',
  '27': 'ashirin da bakwai',
  '72': "saba'in da biyu",
  '85': 'tamanin da biyar',
  '160': 'ɗari da sittin',
  '180': 'ɗari da tamanin',
};

const IG_NUMBERS: Record<string, string> = {
  '1': 'otu',
  '2': 'abụọ',
  '3': 'atọ',
  '4': 'anọ',
  '5': 'ise',
  '6': 'isii',
  '7': 'asaa',
  '8': 'asatọ',
  '9': 'itoolu',
  '10': 'iri',
  '12': 'iri na abụọ',
  '14': 'iri na anọ',
  '15': 'iri na ise',
  '24': 'iri abụọ na anọ',
  '26': 'iri abụọ na isii',
  '27': 'iri abụọ na asaa',
  '72': 'iri asaa na abụọ',
  '85': 'iri asatọ na ise',
  '160': 'narị na iri isii',
  '180': 'narị na iri asatọ',
};

/**
 * Normalizes UI text into pure, natural spoken text for each language's native TTS model
 * (stripping English/Latin parentheticals and expanding digits/units into native words).
 */
export function cleanSpokenTextForLanguage(raw: string, lang: CoachLanguageCode): string {
  let s = raw.trim();
  if (!s) return s;

  if (lang !== 'en' && lang !== 'pcm') {
    // Strip pure English/Latin parenthetical glosses such as "(Skull)", "(Spine)", "(Tibia & Fibula)",
    // while converting numeric parentheticals like "(Ƙasusuwa 27)" into natural comma clauses.
    s = s.replace(/\(([^)]+)\)/g, (_m, inner: string) => {
      if (/\d/.test(inner)) return `, ${inner},`;
      return '';
    });
  }

  s = s.replace(/·/g, ', ');

  if (lang === 'yo') {
    s = s
      .replace(/\b3D\b/gi, 'onípele mẹ́ta')
      .replace(/\bTMJ\b/g, 'oríkèé àgbọ̀n')
      .replace(/\bCSF\b/g, 'omi ààbò ọpọlọ')
      .replace(/\bBPM\b/gi, 'ìlù ní ìṣẹ́jú kan')
      .replace(/L\d[–-]L\d/g, 'ìsàlẹ̀ ọ̀pá ẹ̀yìn')
      .replace(/\bL\d\b/g, 'ọ̀pá ẹ̀yìn')
      .replace(/(\d+)\s*%/g, (_m, d: string) => `ìdá ${YO_NUMBERS[d] ?? d} nínú ọgọ́rùn-ún`)
      .replace(/(\d+)\s*°/g, (_m, d: string) => `ìwọ̀n ${YO_NUMBERS[d] ?? d}`)
      .replace(/\b(\d+)\b/g, (_m, d: string) => YO_NUMBERS[d] ?? d);
  } else if (lang === 'ha') {
    s = s
      .replace(/\b3D\b/gi, 'mai girma uku')
      .replace(/\bTMJ\b/g, 'haɗin haɓa')
      .replace(/\bCSF\b/g, 'ruwan kwakwalwa')
      .replace(/\bBPM\b/gi, 'bugu a minti ɗaya')
      .replace(/L\d[–-]L\d/g, 'ƙasan ƙashin baya')
      .replace(/\bL\d\b/g, 'ƙashin baya')
      .replace(/2[–-]3/g, 'biyu zuwa uku')
      .replace(/(\d+)\s*%/g, (_m, d: string) => `${HA_NUMBERS[d] ?? d}`)
      .replace(/(\d+)\s*°/g, (_m, d: string) => `digiri ${HA_NUMBERS[d] ?? d}`)
      .replace(/\b(\d+)\b/g, (_m, d: string) => HA_NUMBERS[d] ?? d);
  } else if (lang === 'ig') {
    s = s
      .replace(/\b3D\b/gi, 'ụdị atọ')
      .replace(/\bTMJ\b/g, 'nkwonkwo àgbà')
      .replace(/\bCSF\b/g, 'mmiri ụbụrụ')
      .replace(/\bBPM\b/gi, 'iti kwa nkeji')
      .replace(/L\d[–-]L\d/g, 'ala ọkpụkpụ azụ')
      .replace(/\bL\d\b/g, 'ọkpụkpụ azụ')
      .replace(/2[–-]3/g, 'abụọ ruo atọ')
      .replace(/(\d+)\s*%/g, (_m, d: string) => `pasent ${IG_NUMBERS[d] ?? d}`)
      .replace(/(\d+)\s*°/g, (_m, d: string) => `ogo ${IG_NUMBERS[d] ?? d}`)
      .replace(/\b(\d+)\b/g, (_m, d: string) => IG_NUMBERS[d] ?? d);
  }

  return s.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
}

/** Deterministic 32-bit FNV-1a hex hash used for instant pre-bundled native audio lookup. */
export function coachAudioClipHash(lang: CoachLanguageCode, cleanedText: string): string {
  const input = `${lang}|${cleanedText.normalize('NFC')}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

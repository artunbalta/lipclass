export type SlideTemplateId =
  | 'none'
  | 'timeline'
  | 'concept_map'
  | 'equation_derivation'
  | 'problem_solution'
  | 'comparison'
  | 'experiment';

export interface SlideTemplate {
  id: SlideTemplateId;
  name: string;
  emoji: string;
  description: string;
  promptInstructions: string;
}

export const SLIDE_TEMPLATES: SlideTemplate[] = [
  {
    id: 'none',
    name: 'Genel',
    emoji: '📄',
    description: 'Standart slayt düzeni',
    promptInstructions: '',
  },
  {
    id: 'timeline',
    name: 'Tarih Şeridi',
    emoji: '📅',
    description: 'Kronolojik olaylar ve gelişmeler',
    promptInstructions:
      'Structure the slides as a chronological timeline. Each slide should cover one distinct time period or event. Include dates/years prominently in slide titles. Use bullet points to highlight key events within each period. The narrative should flow from earliest to latest, emphasizing cause-and-effect relationships between events.',
  },
  {
    id: 'concept_map',
    name: 'Kavram Haritası',
    emoji: '🗺️',
    description: 'Kavramlar arası ilişkiler ve bağlantılar',
    promptInstructions:
      'Organize the slides as a concept map exploration. Start with the central concept, then dedicate each subsequent slide to a key related concept and its connections. Explicitly state relationships between concepts (e.g., "leads to", "is part of", "causes", "contrasts with"). Use Mermaid diagrams where appropriate to visualize concept relationships.',
  },
  {
    id: 'equation_derivation',
    name: 'Denklem Türetme',
    emoji: '∑',
    description: 'Adım adım matematiksel türetme',
    promptInstructions:
      'Structure the content as a step-by-step mathematical derivation. Each slide should present exactly one logical step in the derivation. Show all intermediate algebraic manipulations using KaTeX notation. State assumptions clearly at the beginning. Explain the reasoning behind each step in simple language. End with the final derived equation and its physical/mathematical significance.',
  },
  {
    id: 'problem_solution',
    name: 'Problem Çözümü',
    emoji: '🔍',
    description: 'Problem analizi ve çözüm adımları',
    promptInstructions:
      'Frame each slide around problem-solving methodology. Slide 1 should clearly state the problem and what is given. Subsequent slides should follow: Understand → Plan → Execute → Verify. Show worked examples with KaTeX for any mathematical steps. Highlight common mistakes to avoid. Include at least one practice problem with full solution walkthrough.',
  },
  {
    id: 'comparison',
    name: 'Karşılaştırma',
    emoji: '⚖️',
    description: 'İki veya daha fazla kavramı karşılaştırma',
    promptInstructions:
      'Structure the presentation as a systematic comparison. Start with an overview slide listing what will be compared. Dedicate alternating slides to each item being compared, using the same criteria in the same order for each. Include a summary comparison table (using Mermaid or bullet points) near the end. Clearly state when items are similar, when they differ, and in what contexts each is preferred.',
  },
  {
    id: 'experiment',
    name: 'Deney/Lab',
    emoji: '🧪',
    description: 'Deney tasarımı ve bilimsel yöntem',
    promptInstructions:
      'Organize the slides following the scientific method and lab report structure: (1) Hypothesis & Background Theory, (2) Materials & Equipment, (3) Procedure steps, (4) Expected Observations & Data Collection, (5) Analysis & Calculations, (6) Results & Conclusion. Include safety warnings where relevant. Use numbered lists for procedures. Show any relevant formulas with KaTeX.',
  },
];

export function getTemplate(id: SlideTemplateId): SlideTemplate {
  return SLIDE_TEMPLATES.find((t) => t.id === id) ?? SLIDE_TEMPLATES[0];
}

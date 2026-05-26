// Manim animation pipeline. Pure code move from /api/generate-video/route.ts.
//
// IMPORTANT: User has explicitly asked to NOT change Manim behavior. The system
// prompt below is identical to the original and must be edited only intentionally.

import { falRequest } from './fal-client';

const MANIM_SYSTEM_PROMPT = `You are a Manim animation expert creating short educational animations for high-school and university students. Aim for the visual clarity of 3Blue1Brown — when the slide describes any physical, geometric, or temporal phenomenon, prefer DYNAMIC, MOTION-DRIVEN visualizations over static text+formula layouts.

Given a lecture slide, choose the animation style that best visualises the core idea — formulas, diagrams, graphs, force sketches, geometric constructions, simulations, particle motion, transformations, etc.

STRICT OUTPUT RULES:
1. Output ONLY valid Python code — no markdown fences, no explanation.
2. The class MUST be named exactly \`SlideScene\`.
3. Always start with: from manim import *
   When you need math: also include \`import numpy as np\` on the next line.
4. Output exactly the word SKIP (nothing else) for:
   - Pure intro / welcome slides (slide 1) with no formulas or diagrams
   - Pure summary slides that only list bullet text
   - Slides whose entire content is already plain prose with nothing to visualise
5. Animation total duration: 10–20 seconds. Use self.wait() for pacing.
6. LaTeX inside MathTex: escape backslashes once — \\\\frac, \\\\sqrt, \\\\vec, \\\\cdot, \\\\Delta, etc.
   Do NOT use $ delimiters inside MathTex().
7. Animate the 1–3 most important ideas. Do not try to show everything.
8. PREFER MOTION OVER STATIC: if the topic involves anything that moves, transforms, oscillates, builds up, or interacts (projectile, wave, orbit, pendulum, bond formation, current flow, vector field, Fourier, particle collision, growth/decay, geometric construction step-by-step), use ValueTracker + always_redraw + MoveAlongPath + TracedPath to animate it live, not as a static snapshot.

COLOR CONVENTIONS:
  WHITE   — body text, labels
  YELLOW  — formulas, equations, key values
  BLUE    — axes, reference lines, water/electricity
  GREEN   — results, final answers, positive forces
  RED     — warnings, opposing forces, negative
  ORANGE  — objects (blocks, balls, particles)

━━━ ANIMATION TYPE SELECTION ━━━

Read the slide content and pick ONE primary type:

TYPE A — FORMULA DERIVATION
  When: slide is dominated by equations, proofs, algebraic manipulation.
  How: Write each MathTex step top-to-bottom, use Transform to evolve expressions.

TYPE B — FUNCTION / GRAPH
  When: slide discusses a function, curve, distribution, or numeric relationship.
  How: Axes() + axes.plot(lambda x: ...) + get_graph_label(). Animate with Create().

TYPE C — PHYSICS / FORCE DIAGRAM
  When: slide mentions forces, vectors, motion, fields, circuits, torque, pressure.
  How: Draw the physical object (Rectangle/Circle/Dot), then GrowArrow() for each
  force/vector with a MathTex label. Add ground lines, walls, springs with Line().
  Animate forces appearing one by one with narration-friendly pacing.

TYPE D — GEOMETRIC CONSTRUCTION
  When: slide covers geometry, angles, area, proofs, trigonometry, coordinate geometry.
  How: Draw shapes (Polygon, Circle, Line), animate angle arcs with Arc(),
  label sides/angles with MathTex, use Indicate() or Circumscribe() to highlight.

TYPE E — CONCEPT / PROCESS DIAGRAM
  When: slide explains a process, cycle, relationship between concepts, algorithm steps.
  How: Use labeled boxes (RoundedRectangle + Text), connect them with Arrow(),
  animate boxes and arrows appearing sequentially.

TYPE F — STEP-BY-STEP PROBLEM SOLUTION
  When: slide shows a worked example with numbered steps.
  How: Each step is a MathTex or Text line appearing with FadeIn(shift=DOWN*0.3).

TYPE G — DYNAMIC SIMULATION (PRIORITISE THIS WHEN APPLICABLE)
  When: slide describes motion, trajectory, oscillation, wave propagation,
  orbital motion, projectile, pendulum, falling object, particle interaction,
  current/charge flow, chemical bond formation/breaking, collision, growth/decay,
  rotation, or any phenomenon that unfolds over time.
  How: Use ValueTracker for time/parameter; always_redraw for objects whose
  position depends on it; TracedPath to leave a visible trail; MoveAlongPath
  to send a Dot along a parametric curve. The animation should *show the
  phenomenon happening*, not just label it.

TYPE H — CREATIVE / EPICYCLE / FOURIER-STYLE VISUALIZATION
  When: slide is about Fourier series, complex exponentials, rotating reference
  frames, Lissajous curves, harmonic motion, or any topic where stacked /
  composed rotations reveal structure (e.g. drawing a shape from circles).
  How: Build nested rotating arms with always_redraw + ValueTracker, attach a
  TracedPath to the tip so the curve is *drawn live* during the animation.

━━━ EXAMPLES ━━━

EXAMPLE A — formula derivation (kinetic energy):
from manim import *

class SlideScene(Scene):
    def construct(self):
        title = Text("Kinetic Energy", font_size=36, color=WHITE).to_edge(UP)
        self.play(Write(title))

        step1 = MathTex(r"W = F \\cdot d", font_size=52, color=YELLOW)
        self.play(Write(step1))
        self.wait(0.8)

        step2 = MathTex(r"W = ma \\cdot d = m \\cdot \\frac{v^2}{2}", font_size=52, color=YELLOW)
        self.play(TransformMatchingTex(step1, step2))
        self.wait(0.8)

        step3 = MathTex(r"E_k = \\frac{1}{2}mv^2", font_size=64, color=GREEN)
        self.play(TransformMatchingTex(step2, step3))
        self.wait(2)

EXAMPLE B — graph (quadratic):
from manim import *

class SlideScene(Scene):
    def construct(self):
        title = Text("Quadratic Function", font_size=36, color=WHITE).to_edge(UP)
        self.play(Write(title))

        axes = Axes(x_range=[-3, 3, 1], y_range=[-1, 5, 1],
                    axis_config={"color": BLUE})
        graph = axes.plot(lambda x: x**2, color=YELLOW)
        label = axes.get_graph_label(graph, label=r"f(x)=x^2", color=YELLOW)

        self.play(Create(axes))
        self.play(Create(graph), Write(label))
        self.wait(2)

EXAMPLE C — physics diagram (Newton's second law, free body diagram):
from manim import *

class SlideScene(Scene):
    def construct(self):
        title = Text("Newton's Second Law", font_size=34, color=WHITE).to_edge(UP)
        self.play(Write(title))

        # Ground and block
        ground = Line(LEFT * 3.5, RIGHT * 3.5, color=WHITE).shift(DOWN * 1.5)
        block = Rectangle(width=1.2, height=1.2, color=ORANGE, fill_opacity=0.8)
        block.move_to(ORIGIN)
        self.play(Create(ground), FadeIn(block))

        # Applied force (right)
        f_arrow = Arrow(block.get_right(), block.get_right() + RIGHT * 2,
                        color=GREEN, buff=0)
        f_label = MathTex(r"F", color=GREEN, font_size=40).next_to(f_arrow, UP)
        self.play(GrowArrow(f_arrow), Write(f_label))

        # Friction (left)
        fr_arrow = Arrow(block.get_left(), block.get_left() + LEFT * 1.2,
                         color=RED, buff=0)
        fr_label = MathTex(r"f", color=RED, font_size=40).next_to(fr_arrow, UP)
        self.play(GrowArrow(fr_arrow), Write(fr_label))

        # Weight (down) and Normal (up)
        w_arrow = Arrow(block.get_center(), block.get_center() + DOWN * 1.4,
                        color=YELLOW, buff=0)
        w_label = MathTex(r"mg", color=YELLOW, font_size=36).next_to(w_arrow, RIGHT)
        n_arrow = Arrow(block.get_bottom(), block.get_bottom() + UP * 1.4,
                        color=BLUE, buff=0)
        n_label = MathTex(r"N", color=BLUE, font_size=36).next_to(n_arrow, RIGHT)
        self.play(GrowArrow(w_arrow), Write(w_label),
                  GrowArrow(n_arrow), Write(n_label))

        # Result formula
        result = MathTex(r"F_{net} = ma", font_size=48, color=GREEN)
        result.to_edge(DOWN, buff=0.4)
        self.play(Write(result))
        self.wait(2)

EXAMPLE D — geometric construction (Pythagorean theorem):
from manim import *

class SlideScene(Scene):
    def construct(self):
        title = Text("Pythagorean Theorem", font_size=34, color=WHITE).to_edge(UP)
        self.play(Write(title))

        # Right triangle
        A, B, C = LEFT * 2 + DOWN, LEFT * 2 + UP * 1.5, RIGHT * 1.5 + DOWN
        triangle = Polygon(A, B, C, color=WHITE)
        right_angle = RightAngle(Line(A, B), Line(A, C), length=0.25, color=WHITE)

        a_label = MathTex(r"a", color=YELLOW).move_to(midpoint(A, B) + LEFT * 0.3)
        b_label = MathTex(r"b", color=YELLOW).move_to(midpoint(A, C) + DOWN * 0.3)
        c_label = MathTex(r"c", color=GREEN).move_to(midpoint(B, C) + RIGHT * 0.4)

        self.play(Create(triangle), Create(right_angle))
        self.play(Write(a_label), Write(b_label), Write(c_label))

        formula = MathTex(r"a^2 + b^2 = c^2", font_size=56, color=GREEN)
        formula.to_edge(DOWN, buff=0.6)
        self.play(Write(formula))
        self.wait(2)

EXAMPLE E — concept diagram (photosynthesis steps):
from manim import *

class SlideScene(Scene):
    def construct(self):
        title = Text("Photosynthesis", font_size=34, color=WHITE).to_edge(UP)
        self.play(Write(title))

        boxes = VGroup()
        labels = ["Light\\nAbsorption", "Water\\nSplitting", "CO₂\\nFixation", "Glucose"]
        colors = [YELLOW, BLUE, GREEN, ORANGE]
        for i, (lbl, col) in enumerate(zip(labels, colors)):
            box = RoundedRectangle(width=2, height=1, corner_radius=0.2,
                                   color=col, fill_opacity=0.25)
            text = Text(lbl, font_size=22, color=col)
            text.move_to(box)
            boxes.add(VGroup(box, text))
        boxes.arrange(RIGHT, buff=0.5).shift(DOWN * 0.3)

        arrows = VGroup(*[
            Arrow(boxes[i].get_right(), boxes[i+1].get_left(), buff=0.05, color=WHITE)
            for i in range(len(boxes)-1)
        ])

        for box in boxes:
            self.play(FadeIn(box, shift=UP * 0.2), run_time=0.5)
        for arrow in arrows:
            self.play(GrowArrow(arrow), run_time=0.4)
        self.wait(2)

EXAMPLE G — dynamic simulation (projectile motion, ball flies along the curve):
from manim import *
import numpy as np

class SlideScene(Scene):
    def construct(self):
        title = Text("Projectile Motion", font_size=34, color=WHITE).to_edge(UP)
        self.play(Write(title))

        axes = Axes(
            x_range=[0, 8, 1], y_range=[0, 4, 1],
            x_length=8, y_length=3.4,
            axis_config={"color": BLUE, "include_tip": False},
        ).to_edge(DOWN, buff=0.6)
        self.play(Create(axes))

        v0, theta_deg = 8.5, 55
        theta = np.deg2rad(theta_deg)
        g = 9.8

        def y(x):
            return x * np.tan(theta) - g * x ** 2 / (2 * v0 ** 2 * np.cos(theta) ** 2)

        # Find x where y returns to 0 (range)
        x_max = (v0 ** 2) * np.sin(2 * theta) / g

        traj = axes.plot(y, x_range=[0, x_max], color=YELLOW)
        ball = Dot(color=ORANGE, radius=0.13).move_to(axes.c2p(0, 0))
        self.play(Create(ball))

        # Animate ball along curve while drawing the trajectory
        self.play(
            MoveAlongPath(ball, traj),
            Create(traj),
            run_time=3.5,
            rate_func=linear,
        )

        formula = MathTex(
            r"y = x\\tan\\theta - \\frac{g\\,x^2}{2 v_0^2 \\cos^2\\theta}",
            font_size=34, color=GREEN
        ).to_edge(DOWN, buff=0.05)
        self.play(Write(formula))
        self.wait(1.5)

EXAMPLE H — creative / Fourier-style (two epicycles draw a curve live):
from manim import *
import numpy as np

class SlideScene(Scene):
    def construct(self):
        title = Text("Fourier Epicycles", font_size=34, color=WHITE).to_edge(UP)
        self.play(Write(title))

        center = LEFT * 1.5 + DOWN * 0.3
        r1, r2 = 1.4, 0.7
        omega1, omega2 = 1, 3  # second wheel spins 3x faster

        c1 = Circle(radius=r1, color=BLUE, stroke_opacity=0.6).move_to(center)
        self.play(Create(c1))

        t = ValueTracker(0)

        def arm1_end():
            phi = t.get_value()
            return center + r1 * np.array([np.cos(omega1 * phi), np.sin(omega1 * phi), 0])

        def tip():
            phi = t.get_value()
            return arm1_end() + r2 * np.array([np.cos(omega2 * phi), np.sin(omega2 * phi), 0])

        c2 = always_redraw(lambda: Circle(radius=r2, color=YELLOW, stroke_opacity=0.6).move_to(arm1_end()))
        line1 = always_redraw(lambda: Line(center, arm1_end(), color=BLUE))
        line2 = always_redraw(lambda: Line(arm1_end(), tip(), color=YELLOW))
        tip_dot = always_redraw(lambda: Dot(tip(), color=GREEN, radius=0.1))
        path = TracedPath(tip, stroke_color=GREEN, stroke_width=3)

        self.add(c2, line1, line2, tip_dot, path)
        self.play(t.animate.set_value(2 * PI), run_time=6, rate_func=linear)
        self.wait(1)
`;

/**
 * LLM-generate Manim Python code for a slide.
 * Returns either valid Python source (starting with "from manim import *")
 * or the string "SKIP" when the slide doesn't warrant animation.
 */
export async function generateManimCode(
  slide: { slideNumber: number; title: string; content: string; bulletPoints: string[] },
  topic: string,
  language: string
): Promise<string> {
  const userPrompt = `Topic: ${topic}
Slide ${slide.slideNumber}/10: "${slide.title}"

Content:
${slide.content}

Bullet points:
${slide.bulletPoints.map((b, i) => `${i + 1}. ${b}`).join('\n')}

Language hint: ${language === 'tr' ? 'Turkish content — use English labels in Manim (LaTeX renders in English regardless)' : 'English content'}

Generate the Manim SlideScene now:`;

  const response = await falRequest<{ output: string }>('fal-ai/any-llm', {
    prompt: userPrompt,
    system_prompt: MANIM_SYSTEM_PROMPT,
    model: 'google/gemini-2.5-flash',
    max_tokens: 5000,
    temperature: 0.3,
  });

  const raw = (response.output || '').trim();

  // Strip markdown code fences if LLM wrapped the output anyway
  if (raw.includes('```')) {
    const match = raw.match(/```(?:python)?\s*\n?([\s\S]*?)\n?```/);
    if (match?.[1]) return match[1].trim();
  }

  return raw;
}

/**
 * Send Manim code to the Modal endpoint for rendering.
 * Returns the public Supabase Storage URL of the rendered MP4, or null on failure.
 */
export async function renderManimAnimation(
  manimCode: string,
  slideNumber: number,
  videoId: string
): Promise<string | null> {
  const modalUrl = process.env.MODAL_MANIM_URL;
  if (!modalUrl) {
    console.log('[Manim] MODAL_MANIM_URL not set — skipping animation render');
    return null;
  }

  if (!manimCode || manimCode.trim().toUpperCase() === 'SKIP') {
    return null;
  }

  try {
    const res = await fetch(modalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manim_code: manimCode, slide_number: slideNumber, video_id: videoId }),
      signal: AbortSignal.timeout(280_000), // 280s — just under Vercel's 300s function limit
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Manim] Modal returned ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }

    const data = await res.json() as { animation_url?: string | null; skipped?: boolean; error?: string | null };

    if (data.error) {
      console.error(`[Manim] Render error for slide ${slideNumber}:`, data.error);
      return null;
    }

    return data.animation_url ?? null;
  } catch (err) {
    console.error(`[Manim] fetch error for slide ${slideNumber}:`, err);
    return null;
  }
}

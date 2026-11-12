# Design quality and accessibility

This guide helps an agent specify a distinctive, usable interface instead of filling a page with fashionable but unsupported decoration. It is a design brief and review standard; it does not itself render or certify a frontend.

## Start from evidence and intent

- Inspect the existing brand, color/type/spacing tokens, components, icons, content, and screenshots before proposing changes. Preserve working conventions unless the user asks for a redesign.
- Map the primary user tasks to screens and information hierarchy. State the product-specific design intent in one sentence, then explain how the layout and visual choices support those tasks.
- Avoid vague direction such as “modern”, “clean”, or “make it pop” on its own. Turn it into observable choices and a reason tied to the product, users, evidence, or an explicitly approved preference.
- Mark every new exact value and stylistic choice `Proposed` until approved. Record evidence and rationale so another designer or agent can tell why the decision exists.

## Anti-generic visual guardrails

- Do not default to purple/blue gradients, glass panels, glow, decorative blobs, animated backgrounds, or a stock dashboard/card grid. Use these only when an observed brand or a clear product-specific rationale supports them.
- Avoid card soup, nested containers, oversized rounding, unnecessary shadows, pill-shaped controls everywhere, equal visual weight for every action, and large empty hero areas in task-focused products. Prefer the simplest hierarchy that helps users finish the task.
- Do not add decorative icons, emoji in place of an icon system, arbitrary illustrations, fake logos, fabricated charts, or sample metrics that look like real customer data.
- Use an existing icon set when present. Keep icon size, stroke/fill, and alignment consistent. An icon-only action needs an accessible name and must use a well-understood symbol; otherwise use a visible text label. Hide purely decorative icons from assistive technology.
- Use authentic product language and evidence-backed content. Label synthetic names, records, and metrics as fixture data; never invent proof of traction, quality, or business performance.
- Every prominent visual treatment should have a job: communicate hierarchy, state, grouping, brand, or feedback. Remove elements whose only rationale is that they make the screen look “AI-generated but polished.”

## Specify a coherent visual system

For an applicable UI, document a token table with `token`, exact value, status (`Observed`, `User-specified`, `Approved`, or `Proposed`), and source/rationale. Define semantic roles rather than a bag of unrelated swatches:

- **Color:** page/surface, primary text, muted text, borders, primary action, secondary accent, focus, and success/warning/error roles. Specify foreground/background pairs and verify their contrast; do not claim compliance from intent alone. Reserve accents for meaningful hierarchy or state.
- **Typography:** font family and fallback, role-based type scale, weight, line-height, and expected line length. Keep hierarchy and body readability consistent.
- **Space and shape:** a small spacing scale, layout grid/container widths, breakpoints, radii, and elevation rules. Explain density choices for the target workflow.
- **Motion and theme:** durations/easing only where motion communicates state; define reduced-motion behavior. State light/dark/system behavior only when required or observed.

Document page structure, responsive behavior, component reuse, icon source, and rules for primary/secondary/destructive actions. Do not prescribe the same layout for screens with different jobs.

## Screen states and accessibility

For each primary screen or flow, document loading, empty, populated, success, error/recovery, disabled, and destructive-confirmation states as applicable. Include keyboard operation, visible focus, semantic names, screen-reader feedback, reduced motion, zoom/reflow, and accessible error association. Define interaction feedback and transitions only when they help the task.

## Visual review gate

When implementation or a visual prototype is in scope, inspect a rendered result at representative narrow and wide viewports. Review hierarchy, alignment, spacing rhythm, color roles, icon consistency, text wrapping, state coverage, and accessibility behavior. Compare it with the written intent and fix mismatches before claiming visual verification. If no renderer, screenshot, or implementation was available, record that review as `Not run`; a good specification is not proof of a good-looking interface.

Use this compact review before handoff:

- Can a user identify the screen's purpose and primary action quickly?
- Does each color, icon, card, shadow, and animation communicate something specific?
- Are spacing, type, component states, and icon rules consistent across screens?
- Does the layout adapt to narrow and wide screens without losing content or actions?
- Are contrast, keyboard focus, screen-reader names, reduced motion, and error recovery addressed and actually checked where possible?
- Are any examples, charts, or logos synthetic and clearly labeled?

For backend/CLI projects, do not invent visual screens. Explain why visual UI is not applicable and document the real operator/developer interaction instead.

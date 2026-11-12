# UX interaction patterns

Use this guide when a target has user-facing tasks or forms. Follow an existing, consistent product pattern when evidence supports it; the user’s stated preference takes priority over generic defaults.

## Form placement: page first, no popup by default

- Put a primary or multi-field create/edit task on a normal page or route by default. Give it a clear title, context, save/cancel actions, and a navigable URL when the product supports routes.
- For a short task tied closely to the current item, prefer an inline section. A side drawer is an option only for a compact, bounded task when retaining context materially helps; define a full-page/mobile fallback and accessible focus behavior.
- Do not put a primary, long, multi-step, or validation-heavy form in a modal dialog, popover, or new browser window by default. Do not open a browser popup for an in-product form. Use a modal for a brief confirmation or focused choice, not as a shortcut for ordinary page design.
- Use a modal form only if the user explicitly asks for one or a documented product constraint makes it necessary. State the reason and cover focus entry/return, keyboard containment, close/cancel behavior, unsaved changes, error announcement, and narrow-screen behavior.
- An external identity/payment flow may use a separate window only when the provider requires it; explain the context, prevent opener abuse, and provide a same-window/fallback path where supported.

## Forms that feel clear and natural

- Ask only for fields needed for the task. Use visible labels, concise instructions, sensible grouping, and examples only when they explain valid input; do not use placeholder text as the sole label.
- Choose controls that match the information and workflow; do not turn every value into a dropdown or every group into a card. Preserve entered values on validation or recoverable errors.
- Validate at the right time. Explain errors beside their fields, provide a summary/focus path when there are multiple errors, retain the user's input, and confirm success in the page context. Client-side checks improve feedback but do not replace server-side validation.
- Keep the primary action visually clear and stable. Use plain action labels (“Save changes”, “Create ticket”) rather than vague labels (“Submit”, “OK”) when context can be named. Explain destructive or irreversible effects before confirmation.
- Make back/cancel behavior predictable. Warn before losing meaningful unsaved work; do not interrupt every navigation with a confirmation.

## Navigation, overlays, and states

Use overlays only when they preserve a clear task relationship. Avoid stacking overlays, hidden actions, surprise focus jumps, and interactions that depend on hover alone. Every screen needs the relevant loading, empty, populated, success, error/recovery, and disabled states. Document keyboard and screen-reader behavior for each interaction pattern.

When a modal is justified, follow the WAI-ARIA dialog pattern: move focus into it, keep keyboard focus managed while it is modal, provide a visible close/cancel path, and return focus logically when it closes. Do not claim a dialog is accessible just because it has an ARIA role. Forms need visible labels and accessible validation feedback.

## Validation and review

For an implemented UI, inspect the actual flow—not only the static mockup—using keyboard and pointer input at representative wide and narrow viewports. Verify validation, error recovery, cancellation, browser back, focus, and that no standard form unexpectedly opens as a popup. Mark unrun checks `Not run`.

Reference material:

- [W3C WAI Forms Tutorial](https://www.w3.org/WAI/tutorials/forms/).
- [W3C WAI Form Validation](https://www.w3.org/WAI/tutorials/forms/validation/).
- [WAI-ARIA Authoring Practices: Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

Sources checked 2026-10-29; verify accessibility details against the current target platform and implementation.

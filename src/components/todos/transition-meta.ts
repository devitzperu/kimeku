export type TransitionAction = "start" | "pause" | "complete" | "reopen"

export const TRANSITION_META: Record<
  TransitionAction,
  { title: string; confirmLabel: string; description?: string }
> = {
  start: {
    title: "Iniciar actividad",
    confirmLabel: "Iniciar",
    description: "Registra el inicio de esta actividad. El motivo es opcional.",
  },
  pause: {
    title: "Pausar actividad",
    confirmLabel: "Pausar",
    description: "Pausa la actividad en curso. El motivo es opcional.",
  },
  complete: {
    title: "Completar actividad",
    confirmLabel: "Completar",
    description: "Marca la actividad como finalizada. El motivo es opcional.",
  },
  reopen: {
    title: "Reabrir actividad",
    confirmLabel: "Reabrir",
    description: "Vuelve a abrir esta actividad. El motivo es opcional.",
  },
}

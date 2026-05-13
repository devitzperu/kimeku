import { TodoList } from "@/components/todos/todo-list"
import type { TodoItemView } from "@/components/todos/todo-item"

interface TeamGroup {
  user: { id: string; name: string }
  todos: TodoItemView[]
}

export function TeamTodoView({ groups }: { groups: TeamGroup[] }) {
  if (groups.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">
        Sin actividades registradas en el equipo.
      </p>
    )
  }
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.user.id} className="space-y-2">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
            {g.user.name}
          </h3>
          <TodoList todos={g.todos} readOnly />
        </section>
      ))}
    </div>
  )
}

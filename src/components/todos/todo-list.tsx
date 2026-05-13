import { TodoItem, type TodoItemView } from "@/components/todos/todo-item"

interface TodoListProps {
  todos: TodoItemView[]
  readOnly?: boolean
}

export function TodoList({ todos, readOnly }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">
        Sin actividades en el rango.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      {todos.map((t, i) => (
        <TodoItem key={`${t.id}-${i}`} todo={t} readOnly={readOnly} />
      ))}
    </div>
  )
}

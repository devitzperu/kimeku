export default function TodosLayout({
  children,
  drawer,
}: {
  children: React.ReactNode
  drawer: React.ReactNode
}) {
  return (
    <>
      {children}
      {drawer}
    </>
  )
}

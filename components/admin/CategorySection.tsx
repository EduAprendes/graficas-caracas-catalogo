export default function CategorySection({
  id,
  head,
  children,
}: {
  id: number;
  head: React.ReactNode;
  children: React.ReactNode;
}) {
  const inputId = `category-toggle-${id}`;

  return (
    <section className="admin-category">
      <input type="checkbox" id={inputId} className="admin-category-toggle-checkbox" />
      <div className="admin-category-toggle-row">
        <div className="admin-category-toggle-head">{head}</div>
        <label htmlFor={inputId} className="admin-category-toggle" aria-hidden="true" />
      </div>
      <div className="admin-category-body">{children}</div>
    </section>
  );
}

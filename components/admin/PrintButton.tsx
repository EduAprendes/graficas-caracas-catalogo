"use client";

export default function PrintButton() {
  return (
    <button type="button" className="admin-edit-btn no-print" onClick={() => window.print()}>
      Imprimir
    </button>
  );
}

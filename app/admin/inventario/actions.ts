"use server";

import { redirect } from "next/navigation";
import { deleteCategory } from "../actions";

// Desde la página de una categoría: al borrarla ya no hay nada que mostrar, así que se vuelve
// a la lista de categorías.
export async function deleteCategoryAndReturn(categoryId: number) {
  await deleteCategory(categoryId);
  redirect("/admin/inventario");
}

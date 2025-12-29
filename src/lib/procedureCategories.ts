const titleCase = (s: string) =>
  s
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const getProcedureCategoryLabel = (category?: string | null) => {
  if (!category) return "Uncategorized";
  // fallback: "custom_category_name" -> "Custom Category Name"
  const cleaned = category.replace(/[_-]+/g, " ").trim();
  return cleaned ? titleCase(cleaned) : "Uncategorized";
};

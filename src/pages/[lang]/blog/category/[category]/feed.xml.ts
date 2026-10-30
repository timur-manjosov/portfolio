import type { APIContext } from "astro";
import { LANGS, type Lang } from "../../../../../i18n/ui";
import { allPosts } from "../../../../../lib/content";
import { blogFeed } from "../../../../../lib/feed";
import { allCategories, categoryUrl } from "../../../../../lib/taxonomy";

export async function getStaticPaths() {
  const categories = await allCategories();
  return LANGS.flatMap((lang) =>
    categories.map((c) => ({ params: { lang, category: c.id }, props: { category: c } })),
  );
}

export async function GET({ params, props }: APIContext) {
  const lang = params.lang as Lang;
  const { category } = props as { category: Awaited<ReturnType<typeof allCategories>>[number] };
  const posts = (await allPosts()).filter((p) => p.entry.data.category.id === category.id);
  return blogFeed({
    lang,
    title: `Timur Manjosov – ${category.data.label[lang]}`,
    description: category.data.description[lang],
    selfPath: `${categoryUrl(lang, category.id)}feed.xml`,
    posts,
    categoryLabel: () => category.data.label[lang],
  });
}

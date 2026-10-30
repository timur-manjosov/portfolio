import type { APIContext } from "astro";
import { LANGS, type Lang, ui } from "../../i18n/ui";
import { allPosts } from "../../lib/content";
import { blogFeed } from "../../lib/feed";
import { categoryMap } from "../../lib/taxonomy";

export function getStaticPaths() {
  return LANGS.map((lang) => ({ params: { lang } }));
}

export async function GET({ params }: APIContext) {
  const lang = params.lang as Lang;
  const cats = await categoryMap();
  return blogFeed({
    lang,
    title: `Timur Manjosov – ${ui[lang]["blog.title"]}`,
    description: ui[lang]["blog.description"],
    selfPath: `/${lang}/feed.xml`,
    posts: await allPosts(),
    categoryLabel: (id) => cats.get(id)?.data.label[lang] ?? id,
  });
}

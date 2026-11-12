import { Link } from "react-router-dom";
import { SEO_CITIES, SEO_CATEGORIES } from "@/lib/seoCatalog";

export default function DirectoryLinks() {
  return <footer className="border-t border-border mt-6 px-4 py-6 space-y-4">
    <section aria-labelledby="city-directory-heading">
      <h2 id="city-directory-heading" className="text-base font-semibold mb-2">美国城市 · US Cities</h2>
      <nav aria-label="城市生活目录" className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {SEO_CITIES.map(c => <Link key={c.slug} className="text-primary underline underline-offset-4" to={`/cities/${c.slug}`}>{c.zh} · {c.en}</Link>)}
      </nav>
    </section>
    <section aria-labelledby="category-directory-heading">
      <h2 id="category-directory-heading" className="text-base font-semibold mb-2">分类信息 · Classifieds</h2>
      <nav aria-label="分类信息目录" className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {SEO_CATEGORIES.map(c => <Link key={c.slug} className="text-primary underline underline-offset-4" to={`/categories/${c.slug}`}>{c.zh}</Link>)}
      </nav>
    </section>
    <nav aria-label="网站信息" className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <Link to="/privacy-policy">隐私政策</Link><Link to="/terms-of-service">服务条款</Link>
    </nav>
  </footer>;
}
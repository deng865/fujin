import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { canonicalUrl, routeSeo } from "@/lib/seoCatalog";

export default function SeoHead({ title, description, schema, noindex }: { title?: string; description?: string; schema?: object; noindex?: boolean }) {
  const { pathname } = useLocation();
  const seo = routeSeo(pathname);
  return <Helmet>
    <title>{title || seo.title}</title>
    <meta name="description" content={description || seo.description} />
    <link rel="canonical" href={canonicalUrl(pathname)} />
    <meta name="robots" content={(noindex ?? seo.noindex) ? "noindex, follow" : "index, follow, max-image-preview:large"} />
    <meta property="og:title" content={title || seo.title} />
    <meta property="og:description" content={description || seo.description} />
    <meta property="og:url" content={canonicalUrl(pathname)} />
    <meta property="og:type" content="website" />
    <meta name="twitter:title" content={title || seo.title} />
    <meta name="twitter:description" content={description || seo.description} />
    {schema && <script type="application/ld+json">{JSON.stringify(schema).replace(/</g, "\\u003c")}</script>}
  </Helmet>;
}
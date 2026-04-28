import { Helmet } from 'react-helmet-async'
import {
  DEFAULT_OG_IMAGE,
  PageSeo,
  SITE_NAME,
  TWITTER_HANDLE,
  canonicalUrl,
} from '@/lib/seo'

interface SeoProps extends PageSeo {
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

export function Seo({ title, description, path, image, type = 'website', jsonLd }: SeoProps) {
  const url = canonicalUrl(path)
  const ogImage = image ?? DEFAULT_OG_IMAGE
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  )
}

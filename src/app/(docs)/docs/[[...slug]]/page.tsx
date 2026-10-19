import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TableOfContents } from "@/components/docs/TableOfContents";
import { CarGallery } from "@/components/docs/CarGallery";
import { mdxComponents } from "@/components/mdx/mdx-components";
import { buildIndex } from "@/lib/vault/indexer";
import { readDoc, listDocImages } from "@/lib/vault/reader";
import { compileMarkdown } from "@/lib/vault/mdx-compiler";
import { extractHeadings } from "@/lib/vault/toc";
import { DocComments } from "@/components/docs/comments/DocComments";

type DocPageProps = { params: Promise<{ slug?: string[] }> };

function docTitle(frontmatter: Record<string, unknown>): string | undefined {
  const title = frontmatter.title || frontmatter.name;
  return title ? String(title) : undefined;
}

// Pre-render every vault page at build time so they are served as static HTML.
// The [[...slug]] catch-all covers both the index (/docs) and every sub-page.
export async function generateStaticParams() {
  const index = await buildIndex();
  return index.allPages.map((p) => ({
    slug: p.url.replace(/^\/docs\/?/, "").split("/").filter(Boolean),
  }));
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = await readDoc(slug);
  if (!doc) return {};
  const title = docTitle(doc.frontmatter) ?? slug?.join(" / ") ?? "Документация";
  const description = doc.frontmatter.description;
  return {
    title: `${title} — MD Studio`,
    description: typeof description === "string" ? description : `Раздел документации: ${title}`,
  };
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = await readDoc(slug);
  if (!doc) notFound();

  const [index, galleryImages] = await Promise.all([buildIndex(), listDocImages(doc)]);
  const content = await compileMarkdown(doc.content, {
    index,
    docDirRel: doc.dirRel,
    lineOffset: doc.lineOffset,
    components: mdxComponents,
  });

  const title = docTitle(doc.frontmatter);

  return (
    <div className="flex min-w-0 flex-1">
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-12 lg:py-10">
        <div className="mx-auto w-full max-w-[52rem]">
          {title && (
            <h1 className="mb-8 max-w-[42rem] text-balance text-3xl font-bold leading-tight tracking-tight text-card-foreground sm:text-4xl">
              {title}
            </h1>
          )}
          {galleryImages.length > 0 && <CarGallery images={galleryImages} title={title} />}
          <DocComments key={doc.slug} doc={doc.slug}>
            <div className="doc-content prose prose-docs">{content}</div>
          </DocComments>
        </div>
      </main>
      <TableOfContents headings={extractHeadings(doc.content)} />
    </div>
  );
}

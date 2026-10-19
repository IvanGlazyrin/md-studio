import React, { type ComponentProps } from "react";
import Link from "next/link";
import { Callout } from "./Callout";
import { MermaidDiagram } from "@/components/docs/MermaidDiagram";
import { DocImage } from "@/components/docs/DocImage";
import { ColorBadge } from "@/components/docs/ColorBadge";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { isColorValue } from "@/lib/color";

const LINK_CLASS =
  "font-medium text-primary underline decoration-primary/40 underline-offset-[3px] transition hover:decoration-primary";

type CalloutBlockquoteProps = ComponentProps<"blockquote"> & {
  "data-callout-type"?: string;
  "data-callout-title"?: string;
};

function Blockquote({ children, ...props }: CalloutBlockquoteProps) {
  const {
    "data-callout-type": calloutType,
    "data-callout-title": calloutTitle,
    className,
    ...rest
  } = props;
  if (calloutType) {
    return (
      <Callout type={calloutType} title={calloutTitle}>
        {children}
      </Callout>
    );
  }
  return (
    <blockquote
      className="my-6 border-l-2 border-primary/40 bg-muted/20 py-2 pl-5 pr-4 italic text-muted-foreground"
      {...rest}
    >
      {children}
    </blockquote>
  );
}

function Anchor({ href = "#", children, ...props }: ComponentProps<"a">) {
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={LINK_CLASS} {...props}>
      {children}
    </Link>
  );
}

function Pre({ children, ...props }: ComponentProps<"pre">) {
  // ```mermaid blocks arrive as <pre><code className="language-mermaid">.
  const code = React.Children.toArray(children)[0];
  if (React.isValidElement<{ className?: string; children?: React.ReactNode }>(code)) {
    if (code.props.className?.includes("language-mermaid")) {
      return <MermaidDiagram chart={String(code.props.children ?? "")} />;
    }
  }
  return <CodeBlock {...props}>{children}</CodeBlock>;
}

function Paragraph({ children, ...props }: ComponentProps<"p">) {
  const childArray = React.Children.toArray(children);
  const hasDocImage = childArray.some(
    (child) => React.isValidElement(child) && child.type === DocImage
  );

  if (hasDocImage) {
    if (childArray.length === 1) {
      return <>{children}</>;
    }
    return <div {...props}>{children}</div>;
  }

  return <p {...props}>{children}</p>;
}

function InlineCode({ children, className, ...props }: ComponentProps<"code">) {
  if (
    className?.includes("language-") ||
    (typeof children === "string" && children.includes("\n"))
  ) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  const text = React.Children.toArray(children).join("").trim();
  if (isColorValue(text)) {
    return (
      <ColorBadge color={text} className={className} {...props}>
        {children}
      </ColorBadge>
    );
  }

  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
}

function extractGradientColors(children: React.ReactNode): { from: string; to: string } | null {
  const colors: string[] = [];
  let hasArrow = false;

  function walk(node: React.ReactNode) {
    if (!node) return;
    if (typeof node === "string") {
      const hexMatches = node.match(/#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g);
      if (hexMatches) colors.push(...hexMatches);
      if (node.includes("→") || node.includes("->") || node.includes("\\to")) {
        hasArrow = true;
      }
    } else if (React.isValidElement<{ children?: React.ReactNode; className?: string }>(node)) {
      if (node.props.className?.includes("katex")) {
        hasArrow = true;
      }
      if (node.props.children) {
        React.Children.forEach(node.props.children, walk);
      }
    } else if (Array.isArray(node)) {
      node.forEach(walk);
    }
  }

  React.Children.forEach(children, walk);

  if (colors.length === 2 && hasArrow) {
    return { from: colors[0], to: colors[1] };
  }
  return null;
}

function TableCell({ children, ...props }: ComponentProps<"td">) {
  const gradient = extractGradientColors(children);
  if (!gradient) {
    return <td {...props}>{children}</td>;
  }
  return (
    <td {...props}>
      <div className="flex flex-col gap-1.5 py-0.5">
        <div className="inline-flex flex-wrap items-center gap-1.5">
          {children}
        </div>
        <div
          className="h-2 w-full min-w-[90px] max-w-[170px] rounded-full border border-white/20 shadow-xs"
          style={{
            background: `linear-gradient(to right, ${gradient.from}, ${gradient.to})`,
          }}
          title={`Градиент: от ${gradient.from} до ${gradient.to}`}
          aria-label={`Цветовой градиент от ${gradient.from} до ${gradient.to}`}
        />
      </div>
    </td>
  );
}

/** Element and component overrides for rendered vault notes. */
export const mdxComponents = {
  Callout,
  blockquote: Blockquote,
  a: Anchor,
  pre: Pre,
  p: Paragraph,
  code: InlineCode,
  td: TableCell,
  h2: (props: ComponentProps<"h2">) => (
    <h2
      className="mb-5 mt-14 scroll-mt-20 border-b border-border pb-2.5 text-2xl font-bold text-primary first:mt-0"
      {...props}
    />
  ),
  h3: (props: ComponentProps<"h3">) => (
    <h3 className="mb-3 mt-10 scroll-mt-20 text-xl font-semibold text-card-foreground first:mt-0" {...props} />
  ),
  h4: (props: ComponentProps<"h4">) => (
    <h4
      className="mb-2 mt-8 scroll-mt-20 text-base font-semibold uppercase tracking-wide text-muted-foreground first:mt-0"
      {...props}
    />
  ),
  // Markdown tables arrive as a bare <table>; wrap them so wide spec sheets
  // scroll instead of blowing out the reading column.
  table: (props: ComponentProps<"table">) => (
    <div className="doc-table" role="region" aria-label="Таблица" tabIndex={0}>
      <table {...props} />
    </div>
  ),
  // Vault images are served by /api/vault/image with arbitrary sizes;
  // rendered with pan-zoom controls and fullscreen viewer matching Mermaid diagrams.
  img: DocImage,
};

import type { NavGroup } from "@/lib/vault/navigation";

/**
 * True when an item of the group (or of its nested groups) is the current page.
 * Nav URLs and `currentPath` are both canonical (`docUrl`), so equality suffices.
 */
export function groupContainsActiveUrl(group: NavGroup, currentPath: string): boolean {
  return (
    (group.items ?? []).some((item) => item.url === currentPath) ||
    (group.groups ?? []).some((sub) => groupContainsActiveUrl(sub, currentPath))
  );
}

import { useLoaderData } from "react-router";
import type { Route } from "./+types/drug";
import type { EntityPageResponse } from "@aihot/contracts/site";
import { cachedPage, loadOr404 } from "../lib/api.server";
import { EntityDetail, entityMeta } from "../features/entities/EntityPage";
import { pageReuse } from "../lib/page-reuse";
import type { Screen } from "../components/shell/screens";

export const handle: Screen = { tab: "featured", name: "药物页" };
export { pageHeaders as headers } from "../lib/api.server";
export const { clientLoader, shouldRevalidate } = pageReuse<typeof loader>();

export async function loader({ request, params }: Route.LoaderArgs) {
  const slug = String((params as { slug?: string }).slug ?? "");
  const data = await loadOr404<EntityPageResponse>(`/api/site/entities/drugs/${encodeURIComponent(slug)}`, { signal: request.signal });
  return cachedPage(300, { data });
}

export function meta({ loaderData }: Route.MetaArgs) {
  return entityMeta("drugs", loaderData?.data);
}

export default function DrugPage() {
  const { data } = useLoaderData<typeof loader>();
  return <EntityDetail kind="drugs" data={data} />;
}

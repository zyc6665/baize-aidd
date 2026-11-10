import { useLoaderData } from "react-router";
import type { Route } from "./+types/drugs";
import type { EntityListResponse } from "@aihot/contracts/site";
import { cachedPage, loadOr404 } from "../lib/api.server";
import { EntityIndex, entityIndexMeta } from "../features/entities/EntityPage";
import { pageReuse } from "../lib/page-reuse";
import type { Screen } from "../components/shell/screens";

export const handle: Screen = { tab: "featured", name: "药物" };
export { pageHeaders as headers } from "../lib/api.server";
export const { clientLoader, shouldRevalidate } = pageReuse<typeof loader>();

export async function loader({ request }: Route.LoaderArgs) {
  const data = await loadOr404<EntityListResponse>("/api/site/entities/drugs", { signal: request.signal });
  return cachedPage(300, { data });
}

export function meta({ loaderData }: Route.MetaArgs) {
  return entityIndexMeta("drugs", loaderData?.data);
}

export default function DrugsIndex() {
  const { data } = useLoaderData<typeof loader>();
  return <EntityIndex kind="drugs" data={data} />;
}

import { useLoaderData } from "react-router";
import type { Route } from "./+types/deals";
import type { TableResponse } from "@aihot/contracts/site";
import { cachedPage, loadOr404 } from "../lib/api.server";
import { TableView, tableMeta, tablePath } from "../features/tables/TablePage";
import { pageReuse } from "../lib/page-reuse";
import type { Screen } from "../components/shell/screens";

export const handle: Screen = { tab: "featured", name: "交易台账" };
export { pageHeaders as headers } from "../lib/api.server";
export const { clientLoader, shouldRevalidate } = pageReuse<typeof loader>();

export async function loader({ request }: Route.LoaderArgs) {
  const path = tablePath("deals", new URL(request.url).search);
  const data = await loadOr404<TableResponse>(path, { signal: request.signal });
  return cachedPage(120, { data });
}

export function meta({ loaderData }: Route.MetaArgs) {
  return tableMeta("deals", loaderData?.data);
}

export default function DealsPage() {
  const { data } = useLoaderData<typeof loader>();
  return <TableView kind="deals" data={data} />;
}

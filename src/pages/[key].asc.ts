/**
 * /pgp-key.asc: the armored OpenPGP public key, generated only when the
 * private file names one (`contact.pgp.key_file`). The key itself never
 * enters the repository.
 */
import type { APIRoute, GetStaticPaths } from "astro";
import { pgpKeyArmored } from "../data/site";

export const getStaticPaths: GetStaticPaths = () => (pgpKeyArmored ? [{ params: { key: "pgp-key" } }] : []);

export const GET: APIRoute = () =>
  new Response(pgpKeyArmored ?? "", { headers: { "Content-Type": "application/pgp-keys" } });

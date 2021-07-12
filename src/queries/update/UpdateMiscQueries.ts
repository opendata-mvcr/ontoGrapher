import {
  AppSettings,
  Diagrams,
  WorkspaceElements,
} from "../../config/Variables";
import { qb } from "../QueryBuilder";
import { DELETE, INSERT } from "@tpluscode/sparql-builder";
import { getWorkspaceContextIRI } from "../../function/FunctionGetVars";

export function updateProjectSettings(
  contextIRI: string,
  diagram: number
): string {
  const projIRI =
    AppSettings.ontographerContext +
    AppSettings.contextIRI.substring(AppSettings.contextIRI.lastIndexOf("/"));
  const diagramIRI = qb.i(projIRI + "/diagram-" + (diagram + 1));

  const insert = INSERT.DATA`${qb.g(projIRI, [
    qb.s(qb.i(projIRI), "og:viewColor", qb.ll(AppSettings.viewColorPool)),
    qb.s(qb.i(projIRI), "og:contextVersion", qb.ll(2)),
    qb.s(
      qb.i(projIRI),
      "og:diagram",
      qb.a(Diagrams.map((diag, i) => qb.i(projIRI + "/diagram-" + (i + 1))))
    ),
    qb.s(diagramIRI, "og:index", qb.ll(diagram)),
    qb.s(diagramIRI, "og:name", qb.ll(Diagrams[diagram].name)),
    qb.s(diagramIRI, "og:active", qb.ll(Diagrams[diagram].active)),
    qb.s(
      diagramIRI,
      "og:representation",
      qb.ll(Diagrams[diagram].representation)
    ),
  ])}`.build();

  const del = DELETE`${qb.g(getWorkspaceContextIRI(), [
    qb.s(qb.i(projIRI), "?p", "?o"),
    qb.s(diagramIRI, "?p1", "?o1"),
  ])}`.WHERE`${qb.g(getWorkspaceContextIRI(), [
    qb.s(qb.i(projIRI), "?p", "?o"),
    qb.s(diagramIRI, "?p1", "?o1"),
  ])}`.build();

  return qb.combineQueries(del, insert);
}

export function updateDeleteTriples(
  iri: string,
  contexts: string[],
  subject: boolean,
  object: boolean,
  blanks: boolean
): string {
  const deletes = [];
  if (blanks)
    deletes.push(
      DELETE`${[
        "GRAPH ?graph {",
        qb.s(qb.i(iri), "rdfs:subClassOf", "?b"),
        qb.s("?b", "?p", "?o"),
        "}",
      ].join(" ")}`.WHERE`${[
        "GRAPH ?graph {",
        qb.s(qb.i(iri), "rdfs:subClassOf", "?b"),
        qb.s("?b", "?p", "?o"),
        "filter(isBlank(?b)).}",
        "values ?graph {" + contexts.map((c) => `<${c}>`).join(" ") + "}",
      ].join(" ")}`.build()
    );
  if (subject)
    deletes.push(
      DELETE`${["GRAPH ?graph {", qb.s(qb.i(iri), "?p", "?o"), "}"].join(" ")}`
        .WHERE`${[
        "GRAPH ?graph {",
        qb.s(qb.i(iri), "?p", "?o"),
        "} values ?graph {" + contexts.map((c) => `<${c}>`).join(" ") + "}",
      ].join(" ")}`.build()
    );
  if (object)
    deletes.push(
      DELETE`${["GRAPH ?graph {", qb.s("?s", "?p", qb.i(iri)), "}"].join(" ")}`
        .WHERE`${[
        "GRAPH ?graph {",
        qb.s("?s", "?p", qb.i(iri)),
        "} values ?graph {" + contexts.map((c) => `<${c}>`).join(" ") + "}",
      ].join(" ")}`.build()
    );
  return qb.combineQueries(...deletes);
}

export function updateAddTermsToWorkspace(ids: string[]) {
  const projIRI =
    AppSettings.ontographerContext +
    AppSettings.contextIRI.substring(AppSettings.contextIRI.lastIndexOf("/"));
  const insert = INSERT.DATA`${qb.g(projIRI, [
    qb.s(
      qb.i(projIRI),
      "og:element",
      qb.a(ids.map((id) => qb.i(WorkspaceElements[id].iri)))
    ),
    ...ids.map((id) =>
      qb.s(qb.i(WorkspaceElements[id].iri), "og:id", qb.ll(id))
    ),
  ])}`.build();
  return qb.combineQueries(insert);
}

export function updateRemoveTermsFromWorkspace(ids: string[]) {
  const del = DELETE.DATA`${qb.g(getWorkspaceContextIRI(), [
    qb.s(
      qb.i(getWorkspaceContextIRI()),
      "og:element",
      qb.a(ids.map((id) => qb.i(WorkspaceElements[id].iri)))
    ),
    ...ids.map((id) =>
      qb.s(qb.i(WorkspaceElements[id].iri), "og:id", qb.ll(id))
    ),
  ])}`.build();
  return qb.combineQueries(del);
}
